/**
 * ReshADX - Sessions Table Migration
 * User session management for authentication and security tracking
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sessions', (table) => {
    // Primary Key
    table.uuid('session_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');

    // Session Details
    table.text('refresh_token_hash').notNullable();
    table.text('access_token_hash'); // For tracking active tokens

    // Device Information
    table.string('device_id', 255);
    table.string('device_type', 50); // mobile, desktop, tablet
    table.string('device_name', 255);
    table.string('device_model', 255);
    table.string('os_name', 50);
    table.string('os_version', 50);
    table.string('browser_name', 50);
    table.string('browser_version', 50);
    table.text('user_agent');

    // Location Information
    table.string('ip_address', 45).notNullable(); // IPv6 support
    table.string('city', 100);
    table.string('region', 100);
    table.string('country', 2);
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);
    table.string('isp', 255);
    table.string('org', 255);

    // Security Flags
    table.boolean('is_trusted').defaultTo(false);
    table.boolean('is_suspicious').defaultTo(false);
    table.boolean('mfa_verified').defaultTo(false);
    table.text('risk_notes');

    // SIM Information (for mobile)
    table.string('sim_serial', 50);
    table.string('phone_number', 20);
    table.string('carrier', 100);

    // Status
    table.enum('status', ['ACTIVE', 'EXPIRED', 'REVOKED', 'LOGGED_OUT']).defaultTo('ACTIVE');
    table.timestamp('status_changed_at');
    table.text('revocation_reason');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.timestamp('invalidated_at'); // When session was invalidated
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('refresh_token_hash');
    table.index('status');
    table.index('ip_address');
    table.index('device_id');
    table.index(['user_id', 'status']);
    table.index('expires_at');
    table.index('created_at');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
}
