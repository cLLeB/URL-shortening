const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'url_shortener',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
};

async function connectDatabase() {
  try {
    pool = new Pool(dbConfig);
    
    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connection established successfully');
    
    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
    
    return pool;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Executed query', { 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount 
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Database query error:', { 
      error: error.message,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params ? params.slice(0, 5) : undefined
    });
    throw error;
  }
}

async function getClient() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDatabase() first.');
  }
  return await pool.connect();
}

async function transaction(callback) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info('Database connection pool closed');
  }
}

// Health check function
async function checkDatabaseHealth() {
  try {
    const result = await query('SELECT 1 as health_check');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  connectDatabase,
  query,
  getClient,
  transaction,
  closeDatabase,
  checkDatabaseHealth,
  get pool() {
    return pool;
  }
};
