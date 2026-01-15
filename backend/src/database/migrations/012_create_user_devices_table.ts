/**
 * ReshADX - User Devices Table Migration
 * Track known devices for fraud detection and security
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_devices', (table) => {
    // Primary Key
    table.uuid('device_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');

    // Device Fingerprint
    table.string('fingerprint_hash', 255).notNullable(); // Unique device fingerprint
    table.string('fingerprint_version', 20); // Version of fingerprinting algorithm

    // Device Details
    table.string('device_type', 50); // mobile, desktop, tablet
    table.string('device_name', 255);
    table.string('device_model', 255);
    table.string('device_brand', 100);
    table.string('os_name', 50);
    table.string('os_version', 50);
    table.string('browser_name', 50);
    table.string('browser_version', 50);
    table.string('screen_resolution', 20);
    table.string('timezone', 50);
    table.string('language', 10);

    // Mobile Specific
    table.string('carrier', 100);
    table.string('sim_serial', 50);
    table.boolean('is_rooted').defaultTo(false);
    table.boolean('is_emulator').defaultTo(false);
    table.string('app_version', 20);

    // Security Status
    table.enum('trust_status', ['TRUSTED', 'UNKNOWN', 'SUSPICIOUS', 'BLOCKED']).defaultTo('UNKNOWN');
    table.timestamp('trust_status_changed_at');
    table.uuid('trust_status_changed_by'); // Admin user who changed status
    table.text('trust_notes');

    // Usage Statistics
    table.integer('login_count').defaultTo(0);
    table.timestamp('first_seen_at').defaultTo(knex.fn.now());
    table.timestamp('last_seen_at').defaultTo(knex.fn.now());
    table.string('last_ip_address', 45);
    table.string('last_location_city', 100);
    table.string('last_location_country', 2);

    // Push Notifications
    table.text('push_token');
    table.string('push_provider', 20); // FCM, APNS
    table.boolean('push_enabled').defaultTo(true);

    // Metadata
    table.jsonb('capabilities'); // Device capabilities
    table.jsonb('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at'); // Soft delete

    // Indexes
    table.index('user_id');
    table.index('fingerprint_hash');
    table.index('trust_status');
    table.index(['user_id', 'fingerprint_hash']);
    table.index('last_seen_at');
    table.unique(['user_id', 'fingerprint_hash']);
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON user_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_devices');
}
