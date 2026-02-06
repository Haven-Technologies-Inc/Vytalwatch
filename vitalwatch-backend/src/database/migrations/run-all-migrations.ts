#!/usr/bin/env ts-node
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Master Migration Runner Script
 *
 * This script runs all pending migrations in the correct order.
 * It provides comprehensive logging, error handling, and transaction support.
 *
 * Usage:
 *   npm run migration:run
 *   or
 *   ts-node src/database/migrations/run-all-migrations.ts
 *
 * Environment variables required:
 *   - DB_HOST
 *   - DB_PORT
 *   - DB_USERNAME
 *   - DB_PASSWORD
 *   - DB_DATABASE
 */

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message: string) {
  log('\n' + '='.repeat(80), colors.cyan);
  log(message, colors.bright + colors.cyan);
  log('='.repeat(80) + '\n', colors.cyan);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

async function runMigrations() {
  const startTime = Date.now();

  logHeader('VytalWatch Database Migration Runner');

  // Check environment variables
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    logError(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
  }

  logInfo(`Database: ${process.env.DB_DATABASE}`);
  logInfo(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  logInfo(`User: ${process.env.DB_USERNAME}`);

  // Create data source
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false, // Never use synchronize with migrations
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
    migrations: [path.join(__dirname, '*.ts')],
    migrationsTableName: 'migrations',
  });

  try {
    logInfo('Connecting to database...');
    await dataSource.initialize();
    logSuccess('Database connection established');

    // Ensure UUID extension is enabled
    logInfo('Ensuring uuid-ossp extension is enabled...');
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    logSuccess('UUID extension verified');

    // Get pending migrations
    const pendingMigrations = await dataSource.showMigrations();

    if (!pendingMigrations) {
      logSuccess('No pending migrations. Database is up to date!');
      await dataSource.destroy();
      return;
    }

    // Get list of all migrations
    const allMigrations = dataSource.migrations;
    logInfo(`Found ${allMigrations.length} total migrations`);

    // Get executed migrations from database
    const executedMigrations = await dataSource.query(
      `SELECT * FROM migrations ORDER BY timestamp ASC`
    );

    const pendingCount = allMigrations.length - executedMigrations.length;

    if (pendingCount === 0) {
      logSuccess('All migrations have been executed. Database is up to date!');
    } else {
      logWarning(`Found ${pendingCount} pending migration(s)`);

      logInfo('\nRunning pending migrations...\n');

      // Run migrations
      const migrations = await dataSource.runMigrations({
        transaction: 'all', // Run all migrations in a single transaction
      });

      if (migrations.length > 0) {
        log('\n' + '-'.repeat(80), colors.cyan);
        logSuccess(`Successfully executed ${migrations.length} migration(s):`);
        migrations.forEach((migration, index) => {
          logSuccess(`  ${index + 1}. ${migration.name}`);
        });
        log('-'.repeat(80) + '\n', colors.cyan);
      }
    }

    // Display final summary
    const executedAfter = await dataSource.query(
      `SELECT * FROM migrations ORDER BY timestamp ASC`
    );

    logHeader('Migration Summary');
    logInfo(`Total migrations in codebase: ${allMigrations.length}`);
    logSuccess(`Total migrations executed: ${executedAfter.length}`);
    logInfo(`Pending migrations: ${allMigrations.length - executedAfter.length}`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logSuccess(`\nMigration process completed in ${duration}s`);

  } catch (error) {
    logError('\nMigration failed!');
    logError(`Error: ${error.message}`);

    if (error.stack) {
      log('\nStack trace:', colors.red);
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      logInfo('\nDatabase connection closed');
    }
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logError('\nUncaught Exception:');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('\nUnhandled Rejection at:');
  console.error(promise);
  logError('Reason:');
  console.error(reason);
  process.exit(1);
});

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { runMigrations };
