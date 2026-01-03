const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: {
    service: 'url-shortener-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: fileFormat,
    }),

    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: fileFormat,
    }),
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug',
    })
  );
}

// Add console transport for test environment with minimal output
if (process.env.NODE_ENV === 'test') {
  logger.clear();
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
      level: 'error',
      silent: process.env.SILENT_TESTS === 'true',
    })
  );
}

// Helper functions for structured logging
const logWithContext = (level, message, context = {}) => {
  logger.log(level, message, {
    timestamp: new Date().toISOString(),
    ...context,
  });
};

// Enhanced logging methods
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

// Database operation logging
logger.logDbOperation = (operation, table, duration, rowCount) => {
  logWithContext('debug', `Database ${operation}`, {
    table,
    duration: `${duration}ms`,
    rowCount,
    category: 'database',
  });
};

// Cache operation logging
logger.logCacheOperation = (operation, key, hit = null) => {
  logWithContext('debug', `Cache ${operation}`, {
    key: key.substring(0, 50) + (key.length > 50 ? '...' : ''),
    hit,
    category: 'cache',
  });
};

// Security event logging
logger.logSecurityEvent = (event, details = {}) => {
  logWithContext('warn', `Security Event: ${event}`, {
    ...details,
    category: 'security',
    severity: 'high',
  });
};

// Business logic logging
logger.logBusinessEvent = (event, details = {}) => {
  logWithContext('info', `Business Event: ${event}`, {
    ...details,
    category: 'business',
  });
};

// Performance logging
logger.logPerformance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logWithContext(level, `Performance: ${operation}`, {
    duration: `${duration}ms`,
    ...details,
    category: 'performance',
  });
};

module.exports = logger;
