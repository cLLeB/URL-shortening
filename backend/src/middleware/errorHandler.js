const logger = require('../utils/logger');

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle different types of errors
const handleDatabaseError = (error) => {
  let message = 'Database operation failed';
  let statusCode = 500;

  // PostgreSQL specific errors
  if (error.code) {
    switch (error.code) {
    case '23505': // Unique violation
      message = 'Resource already exists';
      statusCode = 409;
      break;
    case '23503': // Foreign key violation
      message = 'Referenced resource not found';
      statusCode = 400;
      break;
    case '23502': // Not null violation
      message = 'Required field is missing';
      statusCode = 400;
      break;
    case '23514': // Check violation
      message = 'Invalid data provided';
      statusCode = 400;
      break;
    case '42P01': // Undefined table
      message = 'Database table not found';
      statusCode = 500;
      break;
    case '42703': // Undefined column
      message = 'Database column not found';
      statusCode = 500;
      break;
    default:
      message = 'Database error occurred';
      statusCode = 500;
    }
  }

  return new AppError(message, statusCode);
};

const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid token provided', 401);
  }
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token has expired', 401);
  }
  return new AppError('Authentication failed', 401);
};

const handleValidationError = (error) => {
  // Joi validation errors
  if (error.isJoi) {
    const message = error.details.map(detail => detail.message).join(', ');
    return new AppError(`Validation error: ${message}`, 400);
  }

  // Express validator errors
  if (error.array && typeof error.array === 'function') {
    const errors = error.array();
    const message = errors.map(err => `${err.param}: ${err.msg}`).join(', ');
    return new AppError(`Validation error: ${message}`, 400);
  }

  return new AppError('Validation failed', 400);
};

const handleRedisError = (error) => {
  logger.error('Redis error:', error);
  // Don't expose Redis errors to client
  return new AppError('Cache service temporarily unavailable', 503);
};

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unexpected error:', err);

    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      timestamp: new Date().toISOString(),
    });
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error details
  const errorContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query,
  };

  if (error.statusCode >= 500) {
    logger.error('Server Error:', {
      error: error.message,
      stack: error.stack,
      ...errorContext,
    });
  } else if (error.statusCode >= 400) {
    logger.warn('Client Error:', {
      error: error.message,
      ...errorContext,
    });
  }

  // Handle specific error types
  if (error.code && error.code.startsWith('23')) {
    error = handleDatabaseError(error);
  } else if (error.name && (error.name.includes('JWT') || error.name.includes('Token'))) {
    error = handleJWTError(error);
  } else if (error.isJoi || (error.array && typeof error.array === 'function')) {
    error = handleValidationError(error);
  } else if (error.message && error.message.includes('Redis')) {
    error = handleRedisError(error);
  }

  // Send appropriate response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    error: err.message,
    stack: err.stack,
    promise,
  });

  // Close server gracefully
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack,
  });

  // Close server gracefully
  process.exit(1);
});

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFound,
  handleDatabaseError,
  handleJWTError,
  handleValidationError,
};
