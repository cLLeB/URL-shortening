const { nanoid } = require('nanoid');
const { query } = require('../database/connection');
const { set, get, del } = require('../config/redis');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class UrlService {
  constructor() {
    this.shortCodeLength = parseInt(process.env.SHORT_URL_LENGTH) || 6;
    this.customAliasMinLength = parseInt(process.env.CUSTOM_ALIAS_MIN_LENGTH) || 3;
    this.customAliasMaxLength = parseInt(process.env.CUSTOM_ALIAS_MAX_LENGTH) || 50;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  // Generate a unique short code
  async generateShortCode(customAlias = null, retries = 5) {
    try {
      if (customAlias) {
        // Validate custom alias
        if (
          customAlias.length < this.customAliasMinLength ||
          customAlias.length > this.customAliasMaxLength
        ) {
          throw new AppError(
            `Custom alias must be between ${this.customAliasMinLength} and ${this.customAliasMaxLength} characters`,
            400
          );
        }

        // Check if custom alias contains only allowed characters
        if (!/^[a-zA-Z0-9_-]+$/.test(customAlias)) {
          throw new AppError(
            'Custom alias can only contain letters, numbers, hyphens, and underscores',
            400
          );
        }

        // Check if custom alias is available
        const existing = await query(
          'SELECT id FROM urls WHERE short_code = $1 OR custom_alias = $1',
          [customAlias]
        );

        if (existing.rows.length > 0) {
          throw new AppError('Custom alias is already taken', 409);
        }

        return customAlias;
      }

      // Generate random short code
      for (let i = 0; i < retries; i++) {
        const shortCode = nanoid(this.shortCodeLength);

        // Check if short code already exists
        const existing = await query('SELECT id FROM urls WHERE short_code = $1', [shortCode]);

        if (existing.rows.length === 0) {
          return shortCode;
        }
      }

      throw new AppError('Unable to generate unique short code, please try again', 500);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error generating short code:', error);
      throw new AppError('Failed to generate short code', 500);
    }
  }

  // Validate URL format
  validateUrl(url) {
    try {
      const urlObj = new URL(url);

      // Check if protocol is http or https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new AppError('URL must use HTTP or HTTPS protocol', 400);
      }

      // Check for localhost in production
      if (
        process.env.NODE_ENV === 'production' &&
        (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')
      ) {
        throw new AppError('Localhost URLs are not allowed in production', 400);
      }

      // Check URL length
      if (url.length > 2048) {
        throw new AppError('URL is too long (maximum 2048 characters)', 400);
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid URL format', 400);
    }
  }

  // Get URL metadata (title, description)
  async getUrlMetadata(url) {
    try {
      // In a production environment, you might want to use a service like
      // Puppeteer or a third-party API to fetch metadata
      // For now, we'll return basic metadata
      return {
        title: null,
        description: null,
      };
    } catch (error) {
      logger.warn('Failed to fetch URL metadata:', error);
      return {
        title: null,
        description: null,
      };
    }
  }

  // Create a new short URL
  async createUrl(data) {
    try {
      const {
        originalUrl,
        customAlias,
        userId,
        title,
        description,
        expiresAt,
        isPublic = true,
      } = data;

      // Validate original URL
      this.validateUrl(originalUrl);

      // Generate short code
      const shortCode = await this.generateShortCode(customAlias);

      // Get URL metadata if not provided
      let urlTitle = title;
      let urlDescription = description;

      if (!urlTitle || !urlDescription) {
        const metadata = await this.getUrlMetadata(originalUrl);
        urlTitle = urlTitle || metadata.title;
        urlDescription = urlDescription || metadata.description;
      }

      // Create URL record
      const result = await query(
        `
        INSERT INTO urls (
          user_id, original_url, short_code, custom_alias, title, description,
          is_active, is_public, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
        [
          userId || null,
          originalUrl,
          shortCode,
          customAlias,
          urlTitle,
          urlDescription,
          true,
          isPublic,
          expiresAt || null,
        ]
      );

      const url = result.rows[0];

      // Cache the URL for faster redirects
      await this.cacheUrl(url);

      // Log business event
      logger.logBusinessEvent('URL created', {
        urlId: url.id,
        shortCode: url.short_code,
        userId: userId || 'anonymous',
        hasCustomAlias: !!customAlias,
        hasExpiry: !!expiresAt,
      });

      return {
        id: url.id,
        originalUrl: url.original_url,
        shortCode: url.short_code,
        shortUrl: `${this.baseUrl}/${url.short_code}`,
        customAlias: url.custom_alias,
        title: url.title,
        description: url.description,
        isPublic: url.is_public,
        clickCount: url.click_count,
        createdAt: url.created_at,
        expiresAt: url.expires_at,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating URL:', error);
      throw new AppError('Failed to create short URL', 500);
    }
  }

  // Get URL by short code
  async getUrlByShortCode(shortCode) {
    try {
      // Try cache first
      const cached = await get(`url:${shortCode}`);
      if (cached) {
        logger.logCacheOperation('HIT', `url:${shortCode}`, true);
        return cached;
      }

      // Query database
      const result = await query(
        `
        SELECT u.*, us.email as user_email
        FROM urls u
        LEFT JOIN users us ON u.user_id = us.id
        WHERE u.short_code = $1 AND u.is_active = true
      `,
        [shortCode]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const url = result.rows[0];

      // Check if URL has expired
      if (url.expires_at && new Date(url.expires_at) < new Date()) {
        logger.logBusinessEvent('URL access denied - expired', {
          urlId: url.id,
          shortCode: url.short_code,
          expiresAt: url.expires_at,
        });
        return null;
      }

      const urlData = {
        id: url.id,
        userId: url.user_id,
        originalUrl: url.original_url,
        shortCode: url.short_code,
        customAlias: url.custom_alias,
        title: url.title,
        description: url.description,
        isActive: url.is_active,
        isPublic: url.is_public,
        clickCount: url.click_count,
        createdAt: url.created_at,
        updatedAt: url.updated_at,
        expiresAt: url.expires_at,
        lastAccessed: url.last_accessed,
        userEmail: url.user_email,
      };

      // Cache for future requests
      await this.cacheUrl(urlData);
      logger.logCacheOperation('MISS', `url:${shortCode}`, false);

      return urlData;
    } catch (error) {
      logger.error('Error getting URL by short code:', error);
      throw new AppError('Failed to retrieve URL', 500);
    }
  }

  // Cache URL data
  async cacheUrl(url, ttl = 3600) {
    try {
      await set(`url:${url.shortCode}`, url, ttl);
    } catch (error) {
      logger.error('Error caching URL:', error);
      // Don't throw error for caching failures
    }
  }

  // Invalidate URL cache
  async invalidateUrlCache(shortCode) {
    try {
      await del(`url:${shortCode}`);
    } catch (error) {
      logger.error('Error invalidating URL cache:', error);
    }
  }

  // Get user's URLs with pagination
  async getUserUrls(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        search = '',
        isActive = null,
      } = options;

      const offset = (page - 1) * limit;

      let whereClause = 'WHERE user_id = $1';
      const params = [userId];
      let paramCount = 1;

      if (search) {
        paramCount++;
        whereClause += ` AND (original_url ILIKE $${paramCount} OR title ILIKE $${paramCount} OR short_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (isActive !== null) {
        paramCount++;
        whereClause += ` AND is_active = $${paramCount}`;
        params.push(isActive);
      }

      // Get total count
      const countResult = await query(`SELECT COUNT(*) as total FROM urls ${whereClause}`, params);
      const total = parseInt(countResult.rows[0].total);

      // Get URLs
      const result = await query(
        `
        SELECT 
          id, original_url, short_code, custom_alias, title, description,
          is_active, is_public, click_count, created_at, updated_at, expires_at, last_accessed
        FROM urls 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `,
        [...params, limit, offset]
      );

      const urls = result.rows.map(url => ({
        id: url.id,
        originalUrl: url.original_url,
        shortCode: url.short_code,
        shortUrl: `${this.baseUrl}/${url.short_code}`,
        customAlias: url.custom_alias,
        title: url.title,
        description: url.description,
        isActive: url.is_active,
        isPublic: url.is_public,
        clickCount: url.click_count,
        createdAt: url.created_at,
        updatedAt: url.updated_at,
        expiresAt: url.expires_at,
        lastAccessed: url.last_accessed,
      }));

      return {
        urls,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error getting user URLs:', error);
      throw new AppError('Failed to retrieve URLs', 500);
    }
  }

  // Update URL
  async updateUrl(urlId, userId, updates) {
    try {
      const allowedUpdates = ['title', 'description', 'is_active', 'is_public', 'expires_at'];
      const updateFields = [];
      const params = [];
      let paramCount = 0;

      // Build update query
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          params.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new AppError('No valid fields to update', 400);
      }

      paramCount++;
      params.push(urlId);
      paramCount++;
      params.push(userId);

      const result = await query(
        `
        UPDATE urls 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
        RETURNING *
      `,
        params
      );

      if (result.rows.length === 0) {
        throw new AppError('URL not found or access denied', 404);
      }

      const url = result.rows[0];

      // Invalidate cache
      await this.invalidateUrlCache(url.short_code);

      logger.logBusinessEvent('URL updated', {
        urlId: url.id,
        shortCode: url.short_code,
        userId,
        updates: Object.keys(updates),
      });

      return {
        id: url.id,
        originalUrl: url.original_url,
        shortCode: url.short_code,
        shortUrl: `${this.baseUrl}/${url.short_code}`,
        customAlias: url.custom_alias,
        title: url.title,
        description: url.description,
        isActive: url.is_active,
        isPublic: url.is_public,
        clickCount: url.click_count,
        createdAt: url.created_at,
        updatedAt: url.updated_at,
        expiresAt: url.expires_at,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating URL:', error);
      throw new AppError('Failed to update URL', 500);
    }
  }

  // Delete URL
  async deleteUrl(urlId, userId) {
    try {
      const result = await query(
        `
        DELETE FROM urls 
        WHERE id = $1 AND user_id = $2
        RETURNING short_code
      `,
        [urlId, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('URL not found or access denied', 404);
      }

      const shortCode = result.rows[0].short_code;

      // Invalidate cache
      await this.invalidateUrlCache(shortCode);

      logger.logBusinessEvent('URL deleted', {
        urlId,
        shortCode,
        userId,
      });

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting URL:', error);
      throw new AppError('Failed to delete URL', 500);
    }
  }
}

module.exports = new UrlService();
