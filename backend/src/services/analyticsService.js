const geoip = require('geoip-lite');
const useragent = require('useragent');
const { query } = require('../database/connection');
const { get, set } = require('../config/redis');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class AnalyticsService {
  constructor() {
    this.enableGeolocation = process.env.ENABLE_GEOLOCATION === 'true';
    this.enableUserAgentParsing = process.env.ENABLE_USER_AGENT_PARSING === 'true';
  }

  // Record a click event
  async recordClick(urlId, req) {
    try {
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent') || '';
      const referer = req.get('Referer') || req.get('Referrer') || '';

      // Parse geolocation data
      let geoData = {
        country: null,
        region: null,
        city: null
      };

      if (this.enableGeolocation && ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1') {
        const geo = geoip.lookup(ipAddress);
        if (geo) {
          geoData = {
            country: geo.country,
            region: geo.region,
            city: geo.city
          };
        }
      }

      // Parse user agent data
      let deviceData = {
        deviceType: 'unknown',
        browser: 'unknown',
        os: 'unknown',
        isBot: false
      };

      if (this.enableUserAgentParsing && userAgent) {
        const agent = useragent.parse(userAgent);
        
        // Detect device type
        deviceData.deviceType = this.detectDeviceType(userAgent);
        deviceData.browser = agent.family || 'unknown';
        deviceData.os = agent.os.family || 'unknown';
        deviceData.isBot = this.detectBot(userAgent);
      }

      // Insert click record
      const result = await query(`
        INSERT INTO url_clicks (
          url_id, ip_address, user_agent, referer, country, region, city,
          device_type, browser, os, is_bot
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, clicked_at
      `, [
        urlId,
        ipAddress,
        userAgent,
        referer,
        geoData.country,
        geoData.region,
        geoData.city,
        deviceData.deviceType,
        deviceData.browser,
        deviceData.os,
        deviceData.isBot
      ]);

      const clickId = result.rows[0].id;

      // Log analytics event
      logger.logBusinessEvent('Click recorded', {
        clickId,
        urlId,
        country: geoData.country,
        deviceType: deviceData.deviceType,
        browser: deviceData.browser,
        isBot: deviceData.isBot
      });

      return clickId;
    } catch (error) {
      logger.error('Error recording click:', error);
      // Don't throw error for analytics failures - the redirect should still work
      return null;
    }
  }

  // Detect device type from user agent
  detectDeviceType(userAgent) {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    if (ua.includes('smart-tv') || ua.includes('tv')) {
      return 'tv';
    }
    return 'desktop';
  }

  // Detect if user agent is a bot
  detectBot(userAgent) {
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python',
      'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
      'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot'
    ];
    
    const ua = userAgent.toLowerCase();
    return botPatterns.some(pattern => ua.includes(pattern));
  }

  // Get URL analytics summary
  async getUrlAnalytics(urlId, userId = null, timeRange = '30d') {
    try {
      // Verify URL ownership if userId provided
      if (userId) {
        const urlCheck = await query(
          'SELECT id FROM urls WHERE id = $1 AND (user_id = $2 OR is_public = true)',
          [urlId, userId]
        );
        
        if (urlCheck.rows.length === 0) {
          throw new AppError('URL not found or access denied', 404);
        }
      }

      // Calculate date range
      const dateRange = this.calculateDateRange(timeRange);
      
      // Try cache first
      const cacheKey = `analytics:${urlId}:${timeRange}`;
      const cached = await get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get basic URL info
      const urlInfo = await query(`
        SELECT 
          u.short_code, u.original_url, u.title, u.click_count,
          u.created_at, u.last_accessed
        FROM urls u
        WHERE u.id = $1
      `, [urlId]);

      if (urlInfo.rows.length === 0) {
        throw new AppError('URL not found', 404);
      }

      const url = urlInfo.rows[0];

      // Get click analytics
      const analytics = await Promise.all([
        this.getClicksByDate(urlId, dateRange),
        this.getClicksByCountry(urlId, dateRange),
        this.getClicksByDevice(urlId, dateRange),
        this.getClicksByBrowser(urlId, dateRange),
        this.getClicksByReferer(urlId, dateRange),
        this.getRecentClicks(urlId, 10)
      ]);

      const result = {
        url: {
          id: urlId,
          shortCode: url.short_code,
          originalUrl: url.original_url,
          title: url.title,
          totalClicks: url.click_count,
          createdAt: url.created_at,
          lastAccessed: url.last_accessed
        },
        timeRange,
        dateRange,
        clicksByDate: analytics[0],
        clicksByCountry: analytics[1],
        clicksByDevice: analytics[2],
        clicksByBrowser: analytics[3],
        clicksByReferer: analytics[4],
        recentClicks: analytics[5],
        summary: {
          totalClicksInRange: analytics[0].reduce((sum, day) => sum + day.clicks, 0),
          uniqueCountries: analytics[1].length,
          uniqueDevices: analytics[2].length,
          uniqueBrowsers: analytics[3].length,
          botClicks: analytics[5].filter(click => click.isBot).length
        }
      };

      // Cache for 5 minutes
      await set(cacheKey, result, 300);

      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting URL analytics:', error);
      throw new AppError('Failed to retrieve analytics', 500);
    }
  }

  // Get clicks grouped by date
  async getClicksByDate(urlId, dateRange) {
    try {
      const result = await query(`
        SELECT 
          DATE(clicked_at) as date,
          COUNT(*) as clicks,
          COUNT(DISTINCT ip_address) as unique_clicks
        FROM url_clicks
        WHERE url_id = $1 
          AND clicked_at >= $2 
          AND clicked_at <= $3
          AND is_bot = false
        GROUP BY DATE(clicked_at)
        ORDER BY date ASC
      `, [urlId, dateRange.start, dateRange.end]);

      return result.rows.map(row => ({
        date: row.date,
        clicks: parseInt(row.clicks),
        uniqueClicks: parseInt(row.unique_clicks)
      }));
    } catch (error) {
      logger.error('Error getting clicks by date:', error);
      return [];
    }
  }

  // Get clicks grouped by country
  async getClicksByCountry(urlId, dateRange) {
    try {
      const result = await query(`
        SELECT 
          country,
          COUNT(*) as clicks,
          COUNT(DISTINCT ip_address) as unique_clicks
        FROM url_clicks
        WHERE url_id = $1 
          AND clicked_at >= $2 
          AND clicked_at <= $3
          AND is_bot = false
          AND country IS NOT NULL
        GROUP BY country
        ORDER BY clicks DESC
        LIMIT 20
      `, [urlId, dateRange.start, dateRange.end]);

      return result.rows.map(row => ({
        country: row.country,
        clicks: parseInt(row.clicks),
        uniqueClicks: parseInt(row.unique_clicks)
      }));
    } catch (error) {
      logger.error('Error getting clicks by country:', error);
      return [];
    }
  }

  // Get clicks grouped by device type
  async getClicksByDevice(urlId, dateRange) {
    try {
      const result = await query(`
        SELECT 
          device_type,
          COUNT(*) as clicks,
          COUNT(DISTINCT ip_address) as unique_clicks
        FROM url_clicks
        WHERE url_id = $1 
          AND clicked_at >= $2 
          AND clicked_at <= $3
          AND is_bot = false
        GROUP BY device_type
        ORDER BY clicks DESC
      `, [urlId, dateRange.start, dateRange.end]);

      return result.rows.map(row => ({
        deviceType: row.device_type,
        clicks: parseInt(row.clicks),
        uniqueClicks: parseInt(row.unique_clicks)
      }));
    } catch (error) {
      logger.error('Error getting clicks by device:', error);
      return [];
    }
  }

  // Get clicks grouped by browser
  async getClicksByBrowser(urlId, dateRange) {
    try {
      const result = await query(`
        SELECT 
          browser,
          COUNT(*) as clicks,
          COUNT(DISTINCT ip_address) as unique_clicks
        FROM url_clicks
        WHERE url_id = $1 
          AND clicked_at >= $2 
          AND clicked_at <= $3
          AND is_bot = false
        GROUP BY browser
        ORDER BY clicks DESC
        LIMIT 10
      `, [urlId, dateRange.start, dateRange.end]);

      return result.rows.map(row => ({
        browser: row.browser,
        clicks: parseInt(row.clicks),
        uniqueClicks: parseInt(row.unique_clicks)
      }));
    } catch (error) {
      logger.error('Error getting clicks by browser:', error);
      return [];
    }
  }

  // Get clicks grouped by referer
  async getClicksByReferer(urlId, dateRange) {
    try {
      const result = await query(`
        SELECT 
          CASE 
            WHEN referer = '' OR referer IS NULL THEN 'Direct'
            ELSE referer
          END as referer,
          COUNT(*) as clicks
        FROM url_clicks
        WHERE url_id = $1 
          AND clicked_at >= $2 
          AND clicked_at <= $3
          AND is_bot = false
        GROUP BY referer
        ORDER BY clicks DESC
        LIMIT 10
      `, [urlId, dateRange.start, dateRange.end]);

      return result.rows.map(row => ({
        referer: row.referer,
        clicks: parseInt(row.clicks)
      }));
    } catch (error) {
      logger.error('Error getting clicks by referer:', error);
      return [];
    }
  }

  // Get recent clicks
  async getRecentClicks(urlId, limit = 10) {
    try {
      const result = await query(`
        SELECT 
          clicked_at, ip_address, country, city, device_type, 
          browser, os, referer, is_bot
        FROM url_clicks
        WHERE url_id = $1
        ORDER BY clicked_at DESC
        LIMIT $2
      `, [urlId, limit]);

      return result.rows.map(row => ({
        clickedAt: row.clicked_at,
        ipAddress: row.ip_address,
        country: row.country,
        city: row.city,
        deviceType: row.device_type,
        browser: row.browser,
        os: row.os,
        referer: row.referer,
        isBot: row.is_bot
      }));
    } catch (error) {
      logger.error('Error getting recent clicks:', error);
      return [];
    }
  }

  // Calculate date range based on time range string
  calculateDateRange(timeRange) {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  // Get user's overall analytics
  async getUserAnalytics(userId, timeRange = '30d') {
    try {
      const dateRange = this.calculateDateRange(timeRange);
      
      const result = await query(`
        SELECT 
          COUNT(DISTINCT u.id) as total_urls,
          SUM(u.click_count) as total_clicks,
          COUNT(DISTINCT uc.id) as clicks_in_range,
          COUNT(DISTINCT uc.country) as unique_countries,
          COUNT(DISTINCT uc.ip_address) as unique_visitors
        FROM urls u
        LEFT JOIN url_clicks uc ON u.id = uc.url_id 
          AND uc.clicked_at >= $2 
          AND uc.clicked_at <= $3
          AND uc.is_bot = false
        WHERE u.user_id = $1 AND u.is_active = true
      `, [userId, dateRange.start, dateRange.end]);

      const stats = result.rows[0];

      return {
        totalUrls: parseInt(stats.total_urls) || 0,
        totalClicks: parseInt(stats.total_clicks) || 0,
        clicksInRange: parseInt(stats.clicks_in_range) || 0,
        uniqueCountries: parseInt(stats.unique_countries) || 0,
        uniqueVisitors: parseInt(stats.unique_visitors) || 0,
        timeRange,
        dateRange
      };
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw new AppError('Failed to retrieve user analytics', 500);
    }
  }
}

module.exports = new AnalyticsService();
