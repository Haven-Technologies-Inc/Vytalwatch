/**
 * ReshADX - Webhooks Table Migration
 * Webhook configuration and delivery tracking
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('webhooks', (table) => {
    // Primary Key
    table.uuid('webhook_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.uuid('item_id').references('item_id').inTable('items').onDelete('CASCADE');

    // Webhook Configuration
    table.string('url', 500).notNullable();
    table.enum('status', ['ACTIVE', 'INACTIVE', 'FAILED', 'PAUSED']).defaultTo('ACTIVE');
    table.text('description');

    // Event Subscriptions
    table.jsonb('event_types').notNullable(); // ['ITEM_LOGIN_REQUIRED', 'TRANSACTIONS_UPDATED', etc.]

    // Specific Event Flags
    table.boolean('subscribe_item_events').defaultTo(true);
    table.boolean('subscribe_transaction_events').defaultTo(true);
    table.boolean('subscribe_account_events').defaultTo(true);
    table.boolean('subscribe_auth_events').defaultTo(true);
    table.boolean('subscribe_error_events').defaultTo(true);
    table.boolean('subscribe_payment_events').defaultTo(false);

    // Security
    table.string('secret', 255).notNullable(); // For HMAC signature
    table.enum('signature_algorithm', ['SHA256', 'SHA512']).defaultTo('SHA256');
    table.boolean('verify_ssl').defaultTo(true);

    // Retry Configuration
    table.integer('max_retry_attempts').defaultTo(3);
    table.integer('retry_delay_seconds').defaultTo(60); // Exponential backoff
    table.boolean('enable_retry').defaultTo(true);

    // Delivery Statistics
    table.bigInteger('total_deliveries').defaultTo(0);
    table.bigInteger('successful_deliveries').defaultTo(0);
    table.bigInteger('failed_deliveries').defaultTo(0);
    table.timestamp('last_delivery_at');
    table.timestamp('last_successful_delivery');
    table.timestamp('last_failed_delivery');
    table.text('last_error_message');
    table.integer('consecutive_failures').defaultTo(0);

    // Rate Limiting
    table.integer('rate_limit_per_minute').defaultTo(100);
    table.boolean('rate_limit_enabled').defaultTo(true);

    // Automatic Pausing
    table.boolean('auto_pause_on_failure').defaultTo(true);
    table.integer('auto_pause_threshold').defaultTo(10); // Pause after N failures
    table.timestamp('paused_at');
    table.text('pause_reason');

    // Filters
    table.jsonb('filters'); // Filter events by criteria
    table.decimal('min_transaction_amount', 15, 2); // Only send if amount > this
    table.jsonb('account_ids'); // Only send for specific accounts

    // Metadata
    table.jsonb('metadata');
    table.jsonb('headers'); // Custom HTTP headers to send

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at'); // Soft delete

    // Indexes
    table.index('user_id');
    table.index('item_id');
    table.index('status');
    table.index(['user_id', 'status']);
    table.index('last_delivery_at');
  });

  // Webhook Delivery Log Table
  await knex.schema.createTable('webhook_deliveries', (table) => {
    // Primary Key
    table.uuid('delivery_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('webhook_id').notNullable().references('webhook_id').inTable('webhooks').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');

    // Event Information
    table.string('event_type', 100).notNullable();
    table.uuid('event_id').notNullable(); // ID of the event being delivered
    table.jsonb('payload').notNullable(); // The webhook payload

    // Delivery Attempt
    table.integer('attempt_number').defaultTo(1); // 1st attempt, 2nd retry, etc.
    table.timestamp('attempted_at').notNullable();

    // HTTP Request Details
    table.text('request_url');
    table.jsonb('request_headers');
    table.text('request_body');
    table.string('request_signature', 255); // HMAC signature sent

    // HTTP Response Details
    table.integer('response_status_code');
    table.jsonb('response_headers');
    table.text('response_body');
    table.integer('response_time_ms'); // Response time in milliseconds

    // Status
    table.enum('status', ['SUCCESS', 'FAILED', 'PENDING', 'RETRYING']).notNullable();
    table.text('error_message');
    table.text('error_type'); // TIMEOUT, CONNECTION_ERROR, HTTP_ERROR, etc.

    // Retry Information
    table.boolean('will_retry').defaultTo(false);
    table.timestamp('retry_at');
    table.integer('remaining_retries');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('webhook_id');
    table.index('user_id');
    table.index('event_type');
    table.index('status');
    table.index('attempted_at');
    table.index(['webhook_id', 'attempted_at']);
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webhook_deliveries');
  await knex.schema.dropTableIfExists('webhooks');
}
