const { Pool } = require('pg');
const { createClient } = require('redis');

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'url_shortener_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

// Test Redis configuration
const testRedisConfig = {
  host: process.env.TEST_REDIS_HOST || 'localhost',
  port: process.env.TEST_REDIS_PORT || 6379,
  password: process.env.TEST_REDIS_PASSWORD || '',
  db: 1, // Use different database for tests
};

let testDb;
let testRedis;

// Setup test environment
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.BCRYPT_ROUNDS = '4'; // Faster for tests
  
  // Initialize test database connection
  testDb = new Pool(testDbConfig);
  
  // Initialize test Redis connection
  testRedis = createClient({
    socket: {
      host: testRedisConfig.host,
      port: testRedisConfig.port,
    },
    password: testRedisConfig.password || undefined,
    database: testRedisConfig.db,
  });
  await testRedis.connect();
  
  // Create test database schema
  await setupTestDatabase();
});

// Cleanup after all tests
afterAll(async () => {
  if (testDb) {
    await testDb.end();
  }
  if (testRedis) {
    await testRedis.disconnect();
  }
});

// Clean up before each test
beforeEach(async () => {
  // Clear all tables
  await testDb.query('TRUNCATE TABLE url_clicks, urls, user_sessions, users RESTART IDENTITY CASCADE');
  
  // Clear Redis
  await testRedis.flushDb();
});

// Setup test database schema
async function setupTestDatabase() {
  try {
    // Create tables if they don't exist
    await testDb.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    await testDb.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        original_url TEXT NOT NULL,
        short_code VARCHAR(50) UNIQUE NOT NULL,
        custom_alias VARCHAR(50) UNIQUE,
        title VARCHAR(500),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        is_public BOOLEAN DEFAULT true,
        click_count INTEGER DEFAULT 0,
        password_hash VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP
      );
    `);

    await testDb.query(`
      CREATE TABLE IF NOT EXISTS url_clicks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        referer TEXT,
        country VARCHAR(2),
        region VARCHAR(100),
        city VARCHAR(100),
        device_type VARCHAR(20),
        browser VARCHAR(50),
        os VARCHAR(50),
        is_bot BOOLEAN DEFAULT false,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await testDb.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(255) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Test database schema created successfully');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

// Export test utilities
module.exports = {
  testDb,
  testRedis,
  testDbConfig,
  testRedisConfig,
};
