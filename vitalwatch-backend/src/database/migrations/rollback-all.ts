#!/usr/bin/env ts-node
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as readline from 'readline';

/**
 * Migration Rollback Script
 *
 * This script allows you to rollback migrations safely.
 * Options:
 *   - Rollback last migration
 *   - Rollback N migrations
 *   - Rollback all migrations (DANGEROUS - requires confirmation)
 *
 * Usage:
 *   npm run migration:rollback          # Rollback last migration
 *   npm run migration:rollback -- -n 3  # Rollback last 3 migrations
 *   npm run migration:rollback -- -all  # Rollback all migrations (with confirmation)
 *
 * Or directly:
 *   ts-node src/database/migrations/rollback-all.ts
 *   ts-node src/database/migrations/rollback-all.ts -n 3
 *   ts-node src/database/migrations/rollback-all.ts -all
 */

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

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function confirmDangerousOperation(operation: string): Promise<boolean> {
  logWarning(`\nWARNING: You are about to ${operation}`);
  logWarning('This operation is IRREVERSIBLE and will DELETE DATA!');
  log('\nTo confirm, type "YES I UNDERSTAND" (case-sensitive): ', colors.red);

  const answer = await askQuestion('');

  return answer === 'YES I UNDERSTAND';
}

async function rollbackMigrations() {
  logHeader('VytalWatch Migration Rollback');

  // Parse command line arguments
  const args = process.argv.slice(2);
  let rollbackCount = 1; // Default: rollback last migration
  let rollbackAll = false;

  if (args.includes('-all') || args.includes('--all')) {
    rollbackAll = true;
  } else if (args.includes('-n') || args.includes('--number')) {
    const index = args.findIndex(arg => arg === '-n' || arg === '--number');
    const countStr = args[index + 1];
    rollbackCount = parseInt(countStr);

    if (isNaN(rollbackCount) || rollbackCount < 1) {
      logError('Invalid rollback count. Please provide a positive number.');
      process.exit(1);
    }
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
    migrations: [path.join(__dirname, '*.ts')],
    migrationsTableName: 'migrations',
  });

  try {
    logInfo('Connecting to database...');
    await dataSource.initialize();
    logSuccess('Database connection established\n');

    // Get executed migrations
    const executedMigrations = await dataSource.query(
      'SELECT * FROM migrations ORDER BY timestamp DESC'
    );

    if (executedMigrations.length === 0) {
      logWarning('No migrations have been executed. Nothing to rollback.');
      await dataSource.destroy();
      return;
    }

    logInfo(`Total executed migrations: ${executedMigrations.length}`);

    // Determine which migrations to rollback
    let migrationsToRollback: any[];

    if (rollbackAll) {
      migrationsToRollback = executedMigrations;

      const confirmed = await confirmDangerousOperation('ROLLBACK ALL MIGRATIONS');

      if (!confirmed) {
        logWarning('\nRollback cancelled by user.');
        await dataSource.destroy();
        return;
      }
    } else {
      if (rollbackCount > executedMigrations.length) {
        logWarning(`Only ${executedMigrations.length} migration(s) have been executed.`);
        logWarning(`Adjusting rollback count to ${executedMigrations.length}.`);
        rollbackCount = executedMigrations.length;
      }

      migrationsToRollback = executedMigrations.slice(0, rollbackCount);

      if (rollbackCount > 1) {
        log(`\nYou are about to rollback the last ${rollbackCount} migrations:`, colors.yellow);
        migrationsToRollback.forEach((migration, index) => {
          logWarning(`  ${index + 1}. ${migration.name}`);
        });

        const answer = await askQuestion('\nDo you want to continue? (yes/no): ');

        if (answer.toLowerCase() !== 'yes') {
          logWarning('\nRollback cancelled by user.');
          await dataSource.destroy();
          return;
        }
      }
    }

    logHeader('Rolling Back Migrations');

    // Rollback migrations one by one
    for (let i = 0; i < migrationsToRollback.length; i++) {
      const migrationToRollback = migrationsToRollback[i];

      logInfo(`\nRolling back: ${migrationToRollback.name}...`);

      try {
        await dataSource.undoLastMigration({
          transaction: 'all',
        });

        logSuccess(`✓ Rolled back: ${migrationToRollback.name}`);
      } catch (error) {
        logError(`✗ Failed to rollback: ${migrationToRollback.name}`);
        logError(`Error: ${error.message}`);
        throw error;
      }
    }

    logHeader('Rollback Summary');
    logSuccess(`Successfully rolled back ${migrationsToRollback.length} migration(s)`);

    const remainingMigrations = await dataSource.query(
      'SELECT * FROM migrations ORDER BY timestamp ASC'
    );

    logInfo(`Remaining executed migrations: ${remainingMigrations.length}`);

    if (remainingMigrations.length > 0) {
      log('\nRemaining migrations:', colors.cyan);
      remainingMigrations.forEach((migration: any, index: number) => {
        logSuccess(`  ${index + 1}. ${migration.name}`);
      });
    } else {
      logWarning('\nAll migrations have been rolled back. Database is empty.');
    }

  } catch (error) {
    logError('\nRollback failed!');
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

if (require.main === module) {
  rollbackMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { rollbackMigrations };
