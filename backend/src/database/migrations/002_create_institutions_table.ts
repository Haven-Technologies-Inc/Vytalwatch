/**
 * ReshADX - Financial Institutions Table Migration
 * Creates table for banks, mobile money providers, and other financial institutions
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('institutions', (table) => {
    // Primary Key
    table.uuid('institution_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Basic Information
    table.string('name', 255).notNullable();
    table.string('display_name', 255).notNullable();
    table.string('short_name', 50);
    table.string('institution_code', 50).unique().notNullable(); // Bank code, MNO code
    table.string('swift_code', 11);
    table.string('routing_number', 50);

    // Institution Type
    table.enum('institution_type', [
      'BANK',
      'MOBILE_MONEY',
      'MICROFINANCE',
      'CREDIT_UNION',
      'SAVINGS_AND_LOAN',
      'RURAL_BANK',
      'FINTECH',
      'TELCO',
      'INVESTMENT',
      'INSURANCE',
    ]).notNullable();

    // Geographic Information
    table.string('country', 2).notNullable(); // ISO 3166-1 alpha-2
    table.string('region', 100); // West Africa, East Africa, etc.
    table.jsonb('operating_countries'); // Array of country codes
    table.string('headquarters_city', 100);

    // Regulatory Information
    table.string('license_number', 100);
    table.string('regulator', 100); // Bank of Ghana, CBN, CBK, etc.
    table.date('license_issue_date');
    table.date('license_expiry_date');
    table.enum('regulatory_status', ['ACTIVE', 'SUSPENDED', 'REVOKED', 'PENDING']).defaultTo('ACTIVE');

    // Integration Details
    table.enum('integration_type', [
      'API',
      'SCREEN_SCRAPING',
      'OAUTH',
      'USSD',
      'HYBRID',
    ]).notNullable();
    table.string('api_base_url', 255);
    table.string('oauth_authorization_url', 255);
    table.string('oauth_token_url', 255);
    table.string('ussd_code', 20); // e.g., *920#
    table.boolean('supports_oauth').defaultTo(false);
    table.boolean('supports_api').defaultTo(false);
    table.boolean('supports_ussd').defaultTo(false);
    table.boolean('supports_webhooks').defaultTo(false);

    // Supported Products & Features
    table.jsonb('supported_products'); // ['auth', 'transactions', 'balance', 'identity', 'payments']
    table.boolean('supports_accounts').defaultTo(true);
    table.boolean('supports_transactions').defaultTo(true);
    table.boolean('supports_balance').defaultTo(true);
    table.boolean('supports_identity').defaultTo(false);
    table.boolean('supports_payments').defaultTo(false);
    table.boolean('supports_investments').defaultTo(false);
    table.boolean('supports_liabilities').defaultTo(false);

    // Mobile Money Specific
    table.boolean('is_mobile_money').defaultTo(false);
    table.string('mobile_operator', 50); // MTN, Vodafone, Airtel, etc.
    table.string('mm_agent_code_prefix', 10);
    table.decimal('mm_transaction_limit_daily', 15, 2);
    table.decimal('mm_transaction_limit_monthly', 15, 2);
    table.decimal('mm_wallet_limit', 15, 2);

    // Status & Availability
    table.enum('status', ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DEPRECATED']).defaultTo('ACTIVE');
    table.boolean('is_test_institution').defaultTo(false);
    table.integer('uptime_percentage').defaultTo(100); // 0-100
    table.timestamp('last_uptime_check');
    table.integer('avg_response_time_ms'); // Average API response time

    // Branding & UI
    table.string('logo_url', 500);
    table.string('icon_url', 500);
    table.string('primary_color', 7); // Hex color #RRGGBB
    table.string('website_url', 255);
    table.text('description');

    // Rate Limiting
    table.integer('rate_limit_per_minute').defaultTo(60);
    table.integer('rate_limit_per_hour').defaultTo(1000);
    table.integer('rate_limit_per_day').defaultTo(10000);

    // Statistics
    table.integer('total_connections').defaultTo(0);
    table.integer('active_connections').defaultTo(0);
    table.decimal('success_rate', 5, 2).defaultTo(100.00); // 0-100%
    table.timestamp('last_successful_connection');

    // Credentials & Configuration
    table.jsonb('credentials_schema'); // JSON schema for required credentials
    table.jsonb('configuration'); // Institution-specific config
    table.jsonb('metadata'); // Additional flexible data

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deprecated_at');

    // Indexes
    table.index('institution_code');
    table.index('country');
    table.index('institution_type');
    table.index('status');
    table.index(['country', 'institution_type']);
    table.index(['is_mobile_money', 'country']);
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('institutions');
}
