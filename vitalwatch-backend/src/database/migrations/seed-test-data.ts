#!/usr/bin/env ts-node
import { DataSource } from 'typeorm';
import * as path from 'path';
import { randomBytes } from 'crypto';

/**
 * Test Data Seed Generator
 *
 * This script generates realistic test data for all VytalWatch modules.
 * Use this for development and testing purposes only.
 *
 * WARNING: This will insert test data into your database.
 * Do NOT run this in production!
 *
 * Usage:
 *   npm run migration:seed
 *   or
 *   ts-node src/database/migrations/seed-test-data.ts
 *
 * Options:
 *   --clean    Delete existing test data before seeding
 *   --count N  Number of records to create (default: 10)
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

// Helper functions for generating test data
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomFutureDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow));
  return date;
}

function randomPastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function seedTestData() {
  logHeader('VytalWatch Test Data Seed Generator');

  // Check environment
  if (process.env.NODE_ENV === 'production') {
    logError('SAFETY CHECK: Cannot run seed script in production environment!');
    process.exit(1);
  }

  // Parse arguments
  const args = process.argv.slice(2);
  const cleanFirst = args.includes('--clean');
  const countIndex = args.indexOf('--count');
  const recordCount = countIndex >= 0 ? parseInt(args[countIndex + 1]) || 10 : 10;

  logInfo(`Seed mode: ${cleanFirst ? 'Clean & Seed' : 'Seed only'}`);
  logInfo(`Records per table: ${recordCount}`);

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: false,
    logging: false,
  });

  try {
    logInfo('\nConnecting to database...');
    await dataSource.initialize();
    logSuccess('Database connection established\n');

    // Check if users table exists (prerequisite)
    const usersExist = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    if (!usersExist[0].exists) {
      logError('Users table does not exist. Please run user migrations first.');
      process.exit(1);
    }

    // Get test users (or create them)
    let testPatients = await dataSource.query(`
      SELECT id FROM users WHERE role = 'patient' LIMIT ${recordCount}
    `);

    let testProviders = await dataSource.query(`
      SELECT id FROM users WHERE role = 'provider' LIMIT ${Math.max(2, Math.ceil(recordCount / 5))}
    `);

    if (testPatients.length === 0 || testProviders.length === 0) {
      logWarning('No test users found. Please create test users first.');
      logInfo('You can create test users manually or use a user seeder.');
      process.exit(1);
    }

    const patientIds = testPatients.map((u: any) => u.id);
    const providerIds = testProviders.map((u: any) => u.id);

    logInfo(`Found ${patientIds.length} test patients and ${providerIds.length} test providers\n`);

    // Clean existing test data if requested
    if (cleanFirst) {
      logHeader('Cleaning Existing Test Data');

      const tablesToClean = [
        'ai_messages',
        'ai_conversations',
        'device_tokens',
        'call_recordings',
        'call_participants',
        'calls',
        'clinical_notes',
        'messages',
        'conversations',
        'appointments',
        'medication_adherence',
        'medication_schedules',
        'medications',
        'claims',
        'consents',
        'tasks',
      ];

      for (const table of tablesToClean) {
        try {
          const result = await dataSource.query(`DELETE FROM ${table}`);
          logSuccess(`Cleaned ${table}`);
        } catch (error) {
          logWarning(`Could not clean ${table}: ${error.message}`);
        }
      }

      log('');
    }

    // ========================================
    // SEED TASKS
    // ========================================
    logHeader('Seeding Tasks');

    const taskTypes = ['vitals_check', 'medication_reminder', 'appointment', 'follow_up_call', 'provider_review'];
    const taskStatuses = ['pending', 'in_progress', 'completed'];
    const taskPriorities = ['low', 'medium', 'high', 'urgent'];

    for (let i = 0; i < recordCount; i++) {
      const patientId = randomElement(patientIds);
      const assignedTo = randomElement(providerIds);

      await dataSource.query(`
        INSERT INTO tasks (
          type, title, description, status, priority, "patientId", "assignedTo",
          "createdBy", "dueDate", metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        randomElement(taskTypes),
        `Test Task ${i + 1}`,
        `This is a test task for patient monitoring #${i + 1}`,
        randomElement(taskStatuses),
        randomElement(taskPriorities),
        patientId,
        assignedTo,
        assignedTo,
        randomFutureDate(30),
        JSON.stringify({ source: 'seed_script', index: i }),
      ]);
    }

    logSuccess(`Created ${recordCount} test tasks`);

    // ========================================
    // SEED CONSENTS
    // ========================================
    logHeader('Seeding Consents');

    const consentTypes = ['treatment', 'data_collection', 'telehealth', 'device_monitoring'];
    const consentStatuses = ['granted', 'pending'];

    for (let i = 0; i < recordCount; i++) {
      const userId = randomElement(patientIds);

      await dataSource.query(`
        INSERT INTO consents (
          "userId", type, status, version, "consentText", "signatureMethod",
          "signedAt", "ipAddress"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId,
        randomElement(consentTypes),
        randomElement(consentStatuses),
        '1.0',
        'I consent to the terms and conditions of this service.',
        'electronic',
        randomPastDate(90),
        '192.168.1.' + Math.floor(Math.random() * 255),
      ]);
    }

    logSuccess(`Created ${recordCount} test consents`);

    // ========================================
    // SEED CLAIMS
    // ========================================
    logHeader('Seeding Claims');

    const claimTypes = ['rpm', 'telehealth', 'office_visit'];
    const claimStatuses = ['draft', 'submitted', 'paid'];

    for (let i = 0; i < recordCount; i++) {
      const patientId = randomElement(patientIds);
      const providerId = randomElement(providerIds);

      await dataSource.query(`
        INSERT INTO claims (
          "claimNumber", type, status, "patientId", "providerId",
          "serviceDate", "cptCodes", "diagnosisCodes", "totalCharge"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        `CLM-${Date.now()}-${i}`,
        randomElement(claimTypes),
        randomElement(claimStatuses),
        patientId,
        providerId,
        randomPastDate(60),
        JSON.stringify([{ code: '99453', description: 'RPM Setup', units: 1, charge: 19.19 }]),
        JSON.stringify([{ code: 'I10', description: 'Essential hypertension', isPrimary: true }]),
        Math.random() * 500 + 100,
      ]);
    }

    logSuccess(`Created ${recordCount} test claims`);

    // ========================================
    // SEED MEDICATIONS
    // ========================================
    logHeader('Seeding Medications');

    const medications = [
      { name: 'Lisinopril', dosage: '10mg', frequency: 'once_daily' },
      { name: 'Metformin', dosage: '500mg', frequency: 'twice_daily' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'bedtime' },
      { name: 'Aspirin', dosage: '81mg', frequency: 'morning' },
    ];

    for (let i = 0; i < recordCount; i++) {
      const med = randomElement(medications);
      const patientId = randomElement(patientIds);
      const prescribedBy = randomElement(providerIds);

      const result = await dataSource.query(`
        INSERT INTO medications (
          name, dosage, strength, route, frequency, "patientId",
          "prescribedBy", "startDate", status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        med.name,
        med.dosage,
        med.dosage,
        'oral',
        med.frequency,
        patientId,
        prescribedBy,
        randomPastDate(30),
        'active',
      ]);

      const medicationId = result[0].id;

      // Create schedule
      await dataSource.query(`
        INSERT INTO medication_schedules (
          "medicationId", "patientId", "scheduledTime"
        ) VALUES ($1, $2, $3)
      `, [medicationId, patientId, randomFutureDate(7)]);
    }

    logSuccess(`Created ${recordCount} test medications with schedules`);

    // ========================================
    // SEED APPOINTMENTS
    // ========================================
    logHeader('Seeding Appointments');

    const appointmentTypes = ['telehealth', 'in_person', 'phone'];
    const appointmentStatuses = ['scheduled', 'confirmed', 'completed'];

    for (let i = 0; i < recordCount; i++) {
      const patientId = randomElement(patientIds);
      const providerId = randomElement(providerIds);

      await dataSource.query(`
        INSERT INTO appointments (
          "patientId", "providerId", type, status, "scheduledAt",
          duration, "createdBy"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        patientId,
        providerId,
        randomElement(appointmentTypes),
        randomElement(appointmentStatuses),
        randomFutureDate(30),
        30,
        providerId,
      ]);
    }

    logSuccess(`Created ${recordCount} test appointments`);

    // ========================================
    // SEED CONVERSATIONS & MESSAGES
    // ========================================
    logHeader('Seeding Messaging');

    for (let i = 0; i < Math.ceil(recordCount / 2); i++) {
      const patientId = randomElement(patientIds);
      const providerId = randomElement(providerIds);

      const convResult = await dataSource.query(`
        INSERT INTO conversations (
          "patientId", "providerId", "lastMessagePreview", "lastMessageAt"
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
        patientId,
        providerId,
        'Test message preview',
        new Date(),
      ]);

      const conversationId = convResult[0].id;

      // Create messages
      for (let j = 0; j < 3; j++) {
        const senderId = j % 2 === 0 ? patientId : providerId;

        await dataSource.query(`
          INSERT INTO messages (
            "conversationId", "senderId", type, status,
            "encryptedContent", "plainContent"
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          conversationId,
          senderId,
          'text',
          'read',
          'encrypted_content_here',
          j % 2 === 0 ? 'Test patient message' : 'Test provider response',
        ]);
      }
    }

    logSuccess(`Created ${Math.ceil(recordCount / 2)} test conversations with messages`);

    // ========================================
    // SEED DEVICE TOKENS
    // ========================================
    logHeader('Seeding Device Tokens');

    const platforms = ['ios', 'android', 'web'];

    for (let i = 0; i < recordCount; i++) {
      const userId = randomElement([...patientIds, ...providerIds]);

      await dataSource.query(`
        INSERT INTO device_tokens (
          "userId", token, platform, status, enabled
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        userId,
        `test_token_${randomBytes(16).toString('hex')}`,
        randomElement(platforms),
        'active',
        true,
      ]);
    }

    logSuccess(`Created ${recordCount} test device tokens`);

    // ========================================
    // SEED AI CONVERSATIONS
    // ========================================
    logHeader('Seeding AI Conversations');

    const aiTypes = ['general_chat', 'vital_analysis', 'health_summary'];

    for (let i = 0; i < Math.ceil(recordCount / 2); i++) {
      const userId = randomElement([...patientIds, ...providerIds]);

      const aiConvResult = await dataSource.query(`
        INSERT INTO ai_conversations (
          "userId", title, type, "messageCount", "totalTokens"
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        userId,
        `Test AI Conversation ${i + 1}`,
        randomElement(aiTypes),
        3,
        500,
      ]);

      const conversationId = aiConvResult[0].id;

      // Create AI messages
      const roles = ['user', 'assistant'];
      for (let j = 0; j < 2; j++) {
        await dataSource.query(`
          INSERT INTO ai_messages (
            "conversationId", role, content, status, "totalTokens"
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          conversationId,
          roles[j % 2],
          j === 0 ? 'Test user question about health' : 'Test AI assistant response',
          'completed',
          250,
        ]);
      }
    }

    logSuccess(`Created ${Math.ceil(recordCount / 2)} test AI conversations with messages`);

    // ========================================
    // SUMMARY
    // ========================================
    logHeader('Seed Summary');

    const tables = [
      'tasks',
      'consents',
      'claims',
      'medications',
      'appointments',
      'conversations',
      'messages',
      'device_tokens',
      'ai_conversations',
      'ai_messages',
    ];

    for (const table of tables) {
      try {
        const count = await dataSource.query(`SELECT COUNT(*) FROM ${table}`);
        logSuccess(`${table}: ${count[0].count} records`);
      } catch (error) {
        logWarning(`Could not count ${table}: ${error.message}`);
      }
    }

    log('\n🎉 Test data seeding completed successfully!', colors.green + colors.bright);
    logInfo('\nYou can now use this data for development and testing.');

  } catch (error) {
    logError('\nSeeding failed!');
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
  seedTestData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedTestData };
