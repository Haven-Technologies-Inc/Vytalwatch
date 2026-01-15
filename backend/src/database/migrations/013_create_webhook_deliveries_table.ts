/**
 * ReshADX - Webhook Deliveries Table Migration
 * Track webhook delivery attempts and responses
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('webhook_deliveries', (table) => {
    // Primary Key
    table.uuid('delivery_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('webhook_id').notNullable().references('webhook_id').inTable('webhooks').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');

    // Event Details
    table.string('event_type', 100).notNullable(); // TRANSACTIONS.SYNC, ITEM.UPDATED, etc.
    table.uuid('event_id').notNullable(); // Unique event identifier
    table.text('payload').notNullable(); // JSON payload sent
    table.string('payload_hash', 64); // SHA-256 hash for deduplication

    // Delivery Details
    table.string('destination_url', 500).notNullable();
    table.string('http_method', 10).defaultTo('POST');
    table.jsonb('request_headers'); // Headers sent with request
    table.text('signature'); // HMAC signature

    // Response
    table.integer('response_status_code');
    table.jsonb('response_headers');
    table.text('response_body');
    table.integer('response_time_ms'); // Response time in milliseconds

    // Delivery Status
    table.enum('status', [
      'PENDING',
      'IN_PROGRESS',
      'SUCCESS',
      'FAILED',
      'RETRYING',
      'EXHAUSTED', // All retries exhausted
    ]).defaultTo('PENDING');
    table.text('error_message');
    table.string('error_code', 50);

    // Retry Information
    table.integer('attempt_number').defaultTo(1);
    table.integer('max_attempts').defaultTo(5);
    table.timestamp('next_retry_at');
    table.integer('retry_delay_seconds'); // Current retry delay

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('sent_at');
    table.timestamp('completed_at');
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('webhook_id');
    table.index('user_id');
    table.index('event_type');
    table.index('event_id');
    table.index('status');
    table.index(['webhook_id', 'status']);
    table.index(['status', 'next_retry_at']);
    table.index('created_at');
    table.index('payload_hash');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_webhook_deliveries_updated_at BEFORE UPDATE ON webhook_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webhook_deliveries');
}
