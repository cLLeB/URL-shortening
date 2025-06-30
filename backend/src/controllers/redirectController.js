const urlService = require('../services/urlService');
const analyticsService = require('../services/analyticsService');
const { redirectLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

// Handle URL redirects
const handleRedirect = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Apply rate limiting
    await new Promise((resolve, reject) => {
      redirectLimiter(req, res, err => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get URL data
    const urlData = await urlService.getUrlByShortCode(shortCode);

    if (!urlData) {
      // Log 404 for analytics
      logger.logBusinessEvent('URL not found', {
        shortCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      return res.status(404).json({
        success: false,
        message: 'URL not found or has expired',
        shortCode,
      });
    }

    // Check if URL is active
    if (!urlData.isActive) {
      logger.logBusinessEvent('Inactive URL accessed', {
        urlId: urlData.id,
        shortCode,
        ip: req.ip,
      });

      return res.status(410).json({
        success: false,
        message: 'This URL has been deactivated',
        shortCode,
      });
    }

    // Record the click (async, don't wait for it)
    analyticsService.recordClick(urlData.id, req).catch(error => {
      logger.error('Failed to record click:', error);
    });

    // Log successful redirect
    logger.logBusinessEvent('URL redirect', {
      urlId: urlData.id,
      shortCode,
      originalUrl: urlData.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
    });

    // Handle different redirect scenarios
    const userAgent = req.get('User-Agent') || '';
    const isBot = analyticsService.detectBot(userAgent);

    // For bots, return JSON response instead of redirect
    if (isBot) {
      return res.json({
        success: true,
        originalUrl: urlData.originalUrl,
        title: urlData.title,
        description: urlData.description,
        shortCode,
        isBot: true,
      });
    }

    // Check if this is a preview request
    if (req.query.preview === 'true') {
      return res.json({
        success: true,
        url: {
          originalUrl: urlData.originalUrl,
          shortCode: urlData.shortCode,
          title: urlData.title,
          description: urlData.description,
          clickCount: urlData.clickCount,
          createdAt: urlData.createdAt,
          isPublic: urlData.isPublic,
        },
      });
    }

    // Handle password-protected URLs
    if (urlData.passwordHash) {
      const providedPassword = req.query.password || req.headers['x-url-password'];

      if (!providedPassword) {
        return res.status(401).json({
          success: false,
          message: 'Password required',
          shortCode,
          requiresPassword: true,
        });
      }

      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(providedPassword, urlData.passwordHash);

      if (!isValidPassword) {
        logger.logSecurityEvent('Invalid password attempt for protected URL', {
          urlId: urlData.id,
          shortCode,
          ip: req.ip,
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid password',
          shortCode,
        });
      }
    }

    // Perform the redirect
    res.redirect(301, urlData.originalUrl);
  } catch (error) {
    logger.error('Redirect error:', {
      error: error.message,
      shortCode: req.params.shortCode,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Handle rate limiting errors
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: error.message || 'Too many requests',
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
    });
  }
};

// Handle URL info requests (for link previews, etc.)
/*
const _getUrlInfo = async (req, res) => {
  try {
    const { shortCode } = req.params;

    const urlData = await urlService.getUrlByShortCode(shortCode);

    if (!urlData) {
      return res.status(404).json({
        success: false,
        message: 'URL not found',
      });
    }

    // Only return public information
    const publicInfo = {
      shortCode: urlData.shortCode,
      title: urlData.title,
      description: urlData.description,
      isActive: urlData.isActive,
      createdAt: urlData.createdAt,
    };

    // Include original URL only if it's public
    if (urlData.isPublic) {
      publicInfo.originalUrl = urlData.originalUrl;
      publicInfo.clickCount = urlData.clickCount;
    }

    res.json({
      success: true,
      url: publicInfo,
    });

  } catch (error) {
    logger.error('URL info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve URL information',
    });
  }
};
*/

// Handle QR code generation
/*
const _generateQRCode = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { size = 200, format = 'png' } = req.query;

    const urlData = await urlService.getUrlByShortCode(shortCode);

    if (!urlData) {
      return res.status(404).json({
        success: false,
        message: 'URL not found',
      });
    }

    if (!urlData.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'QR code not available for private URLs',
      });
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const shortUrl = `${baseUrl}/${shortCode}`;

    // In a production environment, you would use a QR code library like 'qrcode'
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      message: 'QR code generation not implemented yet',
      shortUrl,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(shortUrl)}&format=${format}`,
    });

  } catch (error) {
    logger.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
    });
  }
};
*/

module.exports = handleRedirect;
