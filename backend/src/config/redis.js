const redis = require('redis');
const logger = require('../utils/logger');

let client;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

async function connectRedis() {
  try {
    client = redis.createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        connectTimeout: redisConfig.connectTimeout,
        commandTimeout: redisConfig.commandTimeout,
        keepAlive: redisConfig.keepAlive,
      },
      password: redisConfig.password,
      database: redisConfig.db,
      retryDelayOnFailover: redisConfig.retryDelayOnFailover,
    });

    // Error handling
    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger.info('Redis client connected');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    client.on('end', () => {
      logger.info('Redis client disconnected');
    });

    client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    await client.connect();

    // Test the connection
    await client.ping();
    logger.info('Redis connection established successfully');

    return client;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// Cache operations
async function get(key) {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis GET error:', { key, error: error.message });
    return null;
  }
}

async function set(key, value, ttl = 3600) {
  try {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await client.setEx(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
    return true;
  } catch (error) {
    logger.error('Redis SET error:', { key, error: error.message });
    return false;
  }
}

async function del(key) {
  try {
    const result = await client.del(key);
    return result > 0;
  } catch (error) {
    logger.error('Redis DEL error:', { key, error: error.message });
    return false;
  }
}

async function exists(key) {
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXISTS error:', { key, error: error.message });
    return false;
  }
}

async function incr(key, ttl = null) {
  try {
    const result = await client.incr(key);
    if (ttl && result === 1) {
      await client.expire(key, ttl);
    }
    return result;
  } catch (error) {
    logger.error('Redis INCR error:', { key, error: error.message });
    return null;
  }
}

async function expire(key, ttl) {
  try {
    const result = await client.expire(key, ttl);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXPIRE error:', { key, ttl, error: error.message });
    return false;
  }
}

// Hash operations
async function hget(key, field) {
  try {
    const value = await client.hGet(key, field);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis HGET error:', { key, field, error: error.message });
    return null;
  }
}

async function hset(key, field, value, ttl = null) {
  try {
    const serializedValue = JSON.stringify(value);
    await client.hSet(key, field, serializedValue);
    if (ttl) {
      await client.expire(key, ttl);
    }
    return true;
  } catch (error) {
    logger.error('Redis HSET error:', { key, field, error: error.message });
    return false;
  }
}

async function hgetall(key) {
  try {
    const hash = await client.hGetAll(key);
    const result = {};
    for (const [field, value] of Object.entries(hash)) {
      try {
        result[field] = JSON.parse(value);
      } catch {
        result[field] = value;
      }
    }
    return result;
  } catch (error) {
    logger.error('Redis HGETALL error:', { key, error: error.message });
    return {};
  }
}

// List operations
async function lpush(key, value, ttl = null) {
  try {
    const serializedValue = JSON.stringify(value);
    const result = await client.lPush(key, serializedValue);
    if (ttl) {
      await client.expire(key, ttl);
    }
    return result;
  } catch (error) {
    logger.error('Redis LPUSH error:', { key, error: error.message });
    return null;
  }
}

async function lrange(key, start = 0, stop = -1) {
  try {
    const values = await client.lRange(key, start, stop);
    return values.map(value => {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    });
  } catch (error) {
    logger.error('Redis LRANGE error:', { key, start, stop, error: error.message });
    return [];
  }
}

// Health check
async function checkRedisHealth() {
  try {
    const start = Date.now();
    await client.ping();
    const responseTime = Date.now() - start;

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function closeRedis() {
  if (client) {
    await client.quit();
    logger.info('Redis connection closed');
  }
}

module.exports = {
  connectRedis,
  closeRedis,
  checkRedisHealth,
  get,
  set,
  del,
  exists,
  incr,
  expire,
  hget,
  hset,
  hgetall,
  lpush,
  lrange,
  get client() {
    return client;
  },
};
