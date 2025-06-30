const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { incr, get, set, del } = require('../config/redis');
const logger = require('../utils/logger');

// Create a custom store using Redis
const createRedisStore = (keyPrefix = 'rl') => {
  return {
    async incr(key) {
      try {
        const fullKey = `${keyPrefix}:${key}`;
        const current = await incr(fullKey, 900); // 15 minutes TTL
        return {
          totalHits: current,
          resetTime: new Date(Date.now() + 900000), // 15 minutes from now
        };
      } catch (error) {
        logger.error('Redis rate limiter error:', error);
        // Fallback to allowing the request if Redis fails
        return {
          totalHits: 1,
          resetTime: new Date(Date.now() + 900000),
        };
      }
    },

    async decrement(key) {
      // Not implemented for Redis store
    },

    async resetKey(key) {
      try {
        const fullKey = `${keyPrefix}:${key}`;
        await del(fullKey);
      } catch (error) {
        logger.error('Redis rate limiter reset error:', error);
      }
    },
  };
};

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: createRedisStore('general'),
  keyGenerator: req => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
  },
  skip: req => {
    // Skip rate limiting for admin users
    return req.user && req.user.role === 'admin';
  },
  onLimitReached: (req, res, options) => {
    logger.logSecurityEvent('Rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      limit: options.max,
      windowMs: options.windowMs,
    });
  },
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 900, // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  keyGenerator: req => `auth:${req.ip}`,
  onLimitReached: (req, res, options) => {
    logger.logSecurityEvent('Authentication rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      body: req.body?.email ? { email: req.body.email } : undefined,
    });
  },
});

// URL creation rate limiter
const urlCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: req => {
    // Different limits based on user role
    if (!req.user) return 10; // Anonymous users
    if (req.user.role === 'premium') return 1000;
    if (req.user.role === 'admin') return 0; // No limit
    return 50; // Regular users
  },
  message: {
    success: false,
    message: 'URL creation limit exceeded. Please upgrade your account or try again later.',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('url_creation'),
  keyGenerator: req => {
    return req.user ? `url_create:user:${req.user.id}` : `url_create:ip:${req.ip}`;
  },
  skip: req => {
    return req.user && req.user.role === 'admin';
  },
});

// Slow down middleware for repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500, // begin adding 500ms of delay per request above 50
  maxDelayMs: 20000, // maximum delay of 20 seconds
  store: createRedisStore('slow'),
  keyGenerator: req => {
    return req.user ? `slow:user:${req.user.id}` : `slow:ip:${req.ip}`;
  },
  skip: req => {
    return req.user && req.user.role === 'admin';
  },
});

// Custom rate limiter for URL redirects
const redirectLimiter = async (req, res, next) => {
  try {
    const shortCode = req.params.shortCode;
    const clientKey = req.user ? `redirect:user:${req.user.id}` : `redirect:ip:${req.ip}`;
    const urlKey = `redirect:url:${shortCode}:${req.ip}`;

    // Check general redirect rate (per IP/user)
    const clientCount = await incr(clientKey, 3600); // 1 hour window
    if (clientCount > 1000) {
      // 1000 redirects per hour per client
      return res.status(429).json({
        success: false,
        message: 'Too many redirects, please try again later.',
      });
    }

    // Check specific URL redirect rate (prevent spam clicking)
    const urlCount = await incr(urlKey, 60); // 1 minute window
    if (urlCount > 10) {
      // 10 redirects per minute per URL per IP
      return res.status(429).json({
        success: false,
        message: 'Too many redirects for this URL, please wait a moment.',
      });
    }

    next();
  } catch (error) {
    logger.error('Redirect rate limiter error:', error);
    // Allow request if Redis fails
    next();
  }
};

// API key rate limiter
const apiKeyLimiter = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return next();
    }

    // Get API key details from database
    const { query } = require('../database/connection');
    const result = await query(
      'SELECT id, user_id, rate_limit, is_active FROM api_keys WHERE key_hash = $1',
      [require('crypto').createHash('sha256').update(apiKey).digest('hex')]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
      });
    }

    const keyData = result.rows[0];
    const keyRateLimit = keyData.rate_limit || 1000;

    // Check rate limit
    const keyLimitKey = `api_key:${keyData.id}`;
    const currentCount = await incr(keyLimitKey, 3600); // 1 hour window

    if (currentCount > keyRateLimit) {
      return res.status(429).json({
        success: false,
        message: 'API key rate limit exceeded',
        limit: keyRateLimit,
        resetTime: new Date(Date.now() + 3600000).toISOString(),
      });
    }

    // Update last used timestamp
    await query('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = $1', [keyData.id]);

    // Attach API key info to request
    req.apiKey = {
      id: keyData.id,
      userId: keyData.user_id,
      rateLimit: keyRateLimit,
      currentUsage: currentCount,
    };

    next();
  } catch (error) {
    logger.error('API key rate limiter error:', error);
    return res.status(500).json({
      success: false,
      message: 'Rate limiting check failed',
    });
  }
};

// Middleware to check if user has exceeded their URL creation quota
const urlQuotaCheck = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(); // Anonymous users handled by rate limiter
    }

    const { query } = require('../database/connection');

    // Get user's current URL count
    const result = await query(
      'SELECT COUNT(*) as url_count FROM urls WHERE user_id = $1 AND is_active = true',
      [req.user.id]
    );

    const currentCount = parseInt(result.rows[0].url_count);

    // Define quotas based on user role
    const quotas = {
      user: 100,
      premium: 10000,
      admin: Infinity,
    };

    const userQuota = quotas[req.user.role] || quotas.user;

    if (currentCount >= userQuota) {
      return res.status(403).json({
        success: false,
        message: 'URL creation quota exceeded. Please upgrade your account or delete some URLs.',
        quota: userQuota,
        current: currentCount,
      });
    }

    // Add quota info to request
    req.quota = {
      current: currentCount,
      limit: userQuota,
      remaining: userQuota - currentCount,
    };

    next();
  } catch (error) {
    logger.error('URL quota check error:', error);
    // Allow request if check fails
    next();
  }
};

module.exports = {
  generalLimiter,
  authLimiter,
  urlCreationLimiter,
  speedLimiter,
  redirectLimiter,
  apiKeyLimiter,
  urlQuotaCheck,
};
