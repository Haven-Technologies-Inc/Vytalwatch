/**
 * ReshADX - Knex Configuration
 * Database migration and seeding configuration
 */

import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Helper to get required env var
const getRequiredEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Base configuration shared across all environments
const baseConfig: Knex.Config = {
  client: 'postgresql',
  migrations: {
    directory: path.join(__dirname, 'src/database/migrations'),
    extension: 'ts',
    tableName: 'knex_migrations',
    loadExtensions: ['.ts'],
  },
  seeds: {
    directory: path.join(__dirname, 'src/database/seeds'),
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
};

// Configuration for different environments
const configs: { [key: string]: Knex.Config } = {
  // Development configuration
  development: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'reshadx_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    pool: {
      min: 2,
      max: 10,
    },
    debug: process.env.DB_DEBUG === 'true',
  },

  // Testing configuration
  test: {
    ...baseConfig,
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'reshadx_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    pool: {
      min: 1,
      max: 5,
    },
    seeds: {
      directory: path.join(__dirname, 'src/database/seeds/test'),
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  },

  // Staging configuration
  staging: {
    ...baseConfig,
    connection: {
      host: getRequiredEnv('DB_HOST'),
      port: parseInt(getRequiredEnv('DB_PORT', '5432'), 10),
      database: getRequiredEnv('DB_NAME'),
      user: getRequiredEnv('DB_USER'),
      password: getRequiredEnv('DB_PASSWORD'),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 5,
      max: 30,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 600000,
    },
    acquireConnectionTimeout: 60000,
  },

  // Production configuration
  production: {
    ...baseConfig,
    connection: {
      host: getRequiredEnv('DB_HOST'),
      port: parseInt(getRequiredEnv('DB_PORT', '5432'), 10),
      database: getRequiredEnv('DB_NAME'),
      user: getRequiredEnv('DB_USER'),
      password: getRequiredEnv('DB_PASSWORD'),
      ssl: {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY,
      },
    },
    pool: {
      min: 10,
      max: 100,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 600000,
      propagateCreateError: false,
    },
    acquireConnectionTimeout: 60000,
    // Enable read replicas in production
    replication: process.env.DB_READ_REPLICA_HOST
      ? {
          read: {
            host: process.env.DB_READ_REPLICA_HOST,
            port: parseInt(process.env.DB_READ_REPLICA_PORT || '5432', 10),
            database: process.env.DB_NAME || '',
            user: process.env.DB_USER || '',
            password: process.env.DB_PASSWORD || '',
          },
        }
      : undefined,
  },
};

// Export the appropriate configuration based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';
const config = configs[environment];

if (!config) {
  throw new Error(`No Knex configuration found for environment: ${environment}`);
}

// Export both the specific config and all configs
export default config;
export { configs };
