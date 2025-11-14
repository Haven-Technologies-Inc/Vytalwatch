// Database Connection Management
// PostgreSQL using Knex.js

import knex, { Knex } from 'knex';
import { config } from '../config';
import { logger } from '../utils/logger';

let db: Knex | null = null;

/**
 * Get database configuration
 */
const getDatabaseConfig = (): Knex.Config => {
  return {
    client: 'pg',
    connection: {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
    debug: config.isDevelopment,
  };
};

/**
 * Initialize database connection
 */
export const initializeDatabase = async (): Promise<Knex> => {
  if (db) {
    return db;
  }

  try {
    db = knex(getDatabaseConfig());

    // Test connection
    await db.raw('SELECT 1+1 AS result');

    logger.info('Database connected successfully');

    // Run migrations in production
    if (config.isProduction) {
      await db.migrate.latest();
      logger.info('Database migrations completed');
    }

    return db;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

/**
 * Get database instance
 */
export const getDatabase = (): Knex => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.destroy();
    db = null;
    logger.info('Database connection closed');
  }
};

export default getDatabase;
