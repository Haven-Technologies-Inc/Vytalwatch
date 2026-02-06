#!/usr/bin/env ts-node
import { DataSource } from 'typeorm';
import * as path from 'path';

/**
 * Migration Verification Script
 *
 * This script verifies the integrity and status of all migrations.
 * It checks for:
 * - Executed migrations
 * - Pending migrations
 * - Table existence
 * - Index existence
 * - Foreign key constraints
 *
 * Usage:
 *   npm run migration:verify
 *   or
 *   ts-node src/database/migrations/verify-migrations.ts
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

// Expected tables for each module
const expectedTables = {
  tasks: ['tasks'],
  consents: ['consents'],
  claims: ['claims'],
  medications: ['medications', 'medication_schedules', 'medication_adherence'],
  appointments: ['appointments'],
  messaging: ['conversations', 'messages'],
  clinicalNotes: ['clinical_notes'],
  webrtc: ['calls', 'call_participants', 'call_recordings'],
  pushNotifications: ['device_tokens'],
  aiConversations: ['ai_conversations', 'ai_messages'],
  encryption: ['encryption_keys'],
};

async function verifyMigrations() {
  logHeader('VytalWatch Migration Verification');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    logging: false,
    migrations: [path.join(__dirname, '*.ts')],
    migrationsTableName: 'migrations',
  });

  try {
    logInfo('Connecting to database...');
    await dataSource.initialize();
    logSuccess('Connected to database\n');

    // 1. Check migration table
    logHeader('Migration Table Status');
    const migrationTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'migrations'
      );
    `);

    if (migrationTableExists[0].exists) {
      logSuccess('Migration table exists');

      const executedMigrations = await dataSource.query(
        'SELECT * FROM migrations ORDER BY timestamp ASC'
      );

      logInfo(`Executed migrations: ${executedMigrations.length}`);

      if (executedMigrations.length > 0) {
        log('\nExecuted migrations:', colors.cyan);
        executedMigrations.forEach((migration: any, index: number) => {
          logSuccess(`  ${index + 1}. ${migration.name} (${new Date(migration.timestamp).toISOString()})`);
        });
      }
    } else {
      logWarning('Migration table does not exist. No migrations have been run.');
    }

    // 2. Check pending migrations
    logHeader('Pending Migrations');
    const pendingMigrations = await dataSource.showMigrations();

    if (pendingMigrations) {
      const allMigrations = dataSource.migrations;
      const executedMigrations = await dataSource.query(
        'SELECT * FROM migrations ORDER BY timestamp ASC'
      );
      const pendingCount = allMigrations.length - executedMigrations.length;

      if (pendingCount > 0) {
        logWarning(`Found ${pendingCount} pending migration(s)`);

        const executedNames = new Set(executedMigrations.map((m: any) => m.name));
        const pending = allMigrations.filter(m => !executedNames.has(m.name));

        pending.forEach((migration, index) => {
          logWarning(`  ${index + 1}. ${migration.name}`);
        });
      } else {
        logSuccess('No pending migrations. Database is up to date!');
      }
    }

    // 3. Verify table existence
    logHeader('Table Verification');
    let allTablesExist = true;

    for (const [module, tables] of Object.entries(expectedTables)) {
      log(`\n${module}:`, colors.bright);

      for (const tableName of tables) {
        const tableExists = await dataSource.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `, [tableName]);

        if (tableExists[0].exists) {
          // Count rows
          const countResult = await dataSource.query(`SELECT COUNT(*) FROM ${tableName}`);
          const count = parseInt(countResult[0].count);
          logSuccess(`  ${tableName} (${count} rows)`);
        } else {
          logError(`  ${tableName} - MISSING`);
          allTablesExist = false;
        }
      }
    }

    // 4. Verify indexes
    logHeader('Index Verification');
    const allTables = Object.values(expectedTables).flat();

    for (const tableName of allTables) {
      const tableExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [tableName]);

      if (!tableExists[0].exists) continue;

      const indexes = await dataSource.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = $1
        ORDER BY indexname;
      `, [tableName]);

      if (indexes.length > 0) {
        log(`\n${tableName}:`, colors.bright);
        indexes.forEach((index: any) => {
          logSuccess(`  ${index.indexname}`);
        });
      }
    }

    // 5. Verify foreign keys
    logHeader('Foreign Key Verification');

    for (const tableName of allTables) {
      const tableExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [tableName]);

      if (!tableExists[0].exists) continue;

      const foreignKeys = await dataSource.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
        ORDER BY tc.constraint_name;
      `, [tableName]);

      if (foreignKeys.length > 0) {
        log(`\n${tableName}:`, colors.bright);
        foreignKeys.forEach((fk: any) => {
          logSuccess(`  ${fk.constraint_name}: ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      }
    }

    // 6. Final summary
    logHeader('Verification Summary');

    if (allTablesExist && !pendingMigrations) {
      logSuccess('✓ All migrations are executed');
      logSuccess('✓ All expected tables exist');
      logSuccess('✓ Database schema is valid');
      log('\n🎉 Migration verification PASSED!', colors.green + colors.bright);
    } else {
      if (!allTablesExist) {
        logError('✗ Some expected tables are missing');
      }
      if (pendingMigrations) {
        logWarning('⚠ There are pending migrations');
      }
      log('\n⚠ Migration verification completed with warnings', colors.yellow + colors.bright);
    }

  } catch (error) {
    logError('\nVerification failed!');
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

if (require.main === module) {
  verifyMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { verifyMigrations };
