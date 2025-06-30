const fs = require('fs');
const path = require('path');
const { query, connectDatabase } = require('./connection');
const logger = require('../utils/logger');

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Connect to database
    await connectDatabase();

    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    logger.info(`Executing ${statements.length} migration statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await query(statement);
        logger.debug(`Migration statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        // Some statements might fail if they already exist (like CREATE TABLE IF NOT EXISTS)
        // We'll log warnings for these but continue
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key') ||
          (error.message.includes('relation') && error.message.includes('already exists'))
        ) {
          logger.warn(`Migration statement ${i + 1} skipped (already exists): ${error.message}`);
        } else {
          logger.error(`Migration statement ${i + 1} failed:`, error);
          throw error;
        }
      }
    }

    // Verify tables were created
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const result = await query(tableCheckQuery);
    const tables = result.rows.map(row => row.table_name);

    logger.info('Database migration completed successfully');
    logger.info(`Created/verified tables: ${tables.join(', ')}`);

    return {
      success: true,
      tablesCreated: tables,
      statementsExecuted: statements.length,
    };
  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  }
}

// Function to check if migrations are needed
async function checkMigrationStatus() {
  try {
    const result = await query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'urls', 'url_clicks', 'api_keys', 'user_sessions')
    `);

    const tableCount = parseInt(result.rows[0].table_count);
    const expectedTables = 5;

    return {
      migrationNeeded: tableCount < expectedTables,
      existingTables: tableCount,
      expectedTables,
    };
  } catch (error) {
    logger.warn('Could not check migration status:', error.message);
    return {
      migrationNeeded: true,
      existingTables: 0,
      expectedTables: 5,
    };
  }
}

// Function to create admin user
async function createAdminUser() {
  try {
    const bcrypt = require('bcryptjs');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@urlshortener.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Check if admin user already exists
    const existingAdmin = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existingAdmin.rows.length > 0) {
      logger.info('Admin user already exists');
      return existingAdmin.rows[0];
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    const result = await query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, role
    `,
      [adminEmail, passwordHash, 'System', 'Administrator', 'admin', true, true]
    );

    logger.info(`Admin user created: ${adminEmail}`);
    logger.warn(`Default admin password: ${adminPassword} - CHANGE THIS IN PRODUCTION!`);

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create admin user:', error);
    throw error;
  }
}

// Function to seed sample data for development
async function seedSampleData() {
  try {
    if (process.env.NODE_ENV === 'production') {
      logger.info('Skipping sample data seeding in production');
      return;
    }

    logger.info('Seeding sample data for development...');

    // Create sample user
    const bcrypt = require('bcryptjs');
    const samplePassword = await bcrypt.hash('password123', 12);

    const sampleUser = await query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, is_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `,
      ['user@example.com', samplePassword, 'John', 'Doe', true, true]
    );

    if (sampleUser.rows.length > 0) {
      const userId = sampleUser.rows[0].id;

      // Create sample URLs
      const sampleUrls = [
        {
          original_url: 'https://www.google.com',
          short_code: 'google',
          title: 'Google Search',
        },
        {
          original_url: 'https://www.github.com',
          short_code: 'github',
          title: 'GitHub',
        },
        {
          original_url: 'https://www.stackoverflow.com',
          short_code: 'stack',
          title: 'Stack Overflow',
        },
      ];

      for (const url of sampleUrls) {
        await query(
          `
          INSERT INTO urls (user_id, original_url, short_code, title, is_active, is_public)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (short_code) DO NOTHING
        `,
          [userId, url.original_url, url.short_code, url.title, true, true]
        );
      }

      logger.info('Sample data seeded successfully');
    }
  } catch (error) {
    logger.error('Failed to seed sample data:', error);
    // Don't throw error for seeding failures
  }
}

// Main migration function
async function migrate() {
  try {
    // Check if migration is needed
    const status = await checkMigrationStatus();

    if (status.migrationNeeded) {
      logger.info('Running database migrations...');
      await runMigrations();
    } else {
      logger.info('Database is up to date');
    }

    // Create admin user
    await createAdminUser();

    // Seed sample data in development
    if (process.env.NODE_ENV === 'development') {
      await seedSampleData();
    }

    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
  checkMigrationStatus,
  createAdminUser,
  seedSampleData,
  migrate,
};
