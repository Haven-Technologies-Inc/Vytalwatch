/**
 * ReshADX - Merchants Table Migration
 * Store merchant metadata for transaction categorization
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('merchants', (table) => {
    // Primary Key
    table.uuid('merchant_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Merchant Identification
    table.string('merchant_name', 255).notNullable();
    table.string('merchant_name_normalized', 255).notNullable(); // Lowercase, trimmed
    table.string('merchant_code', 50); // MCC or internal code
    table.string('merchant_id_external', 100); // External ID from payment processor

    // Aliases & Matching
    table.jsonb('aliases'); // Array of known aliases
    table.jsonb('name_patterns'); // Regex patterns for matching
    table.integer('match_priority').defaultTo(0); // Higher = preferred match

    // Category Information
    table.string('category_primary', 100); // Main category (e.g., "Food & Dining")
    table.string('category_secondary', 100); // Subcategory (e.g., "Restaurants")
    table.string('category_code', 20); // Internal category code
    table.string('mcc_code', 4); // Merchant Category Code (Visa/MC)
    table.jsonb('tags'); // Additional tags for categorization

    // Business Details
    table.enum('business_type', [
      'RETAIL',
      'ONLINE',
      'SERVICES',
      'FOOD_BEVERAGE',
      'UTILITIES',
      'GOVERNMENT',
      'FINANCIAL',
      'TELECOM',
      'TRANSPORT',
      'ENTERTAINMENT',
      'HEALTHCARE',
      'EDUCATION',
      'OTHER',
    ]);
    table.string('website', 500);
    table.string('phone', 20);
    table.string('email', 255);

    // Location
    table.string('address', 500);
    table.string('city', 100);
    table.string('region', 100);
    table.string('country', 2).defaultTo('GH');
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);

    // African-Specific
    table.boolean('accepts_mobile_money').defaultTo(false);
    table.jsonb('mobile_money_providers'); // ['MTN', 'VODAFONE', 'AIRTELTIGO']
    table.boolean('accepts_cards').defaultTo(false);
    table.boolean('accepts_bank_transfer').defaultTo(false);

    // Trust & Verification
    table.enum('verification_status', ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']).defaultTo('UNVERIFIED');
    table.timestamp('verified_at');
    table.uuid('verified_by');
    table.boolean('is_known_fraudulent').defaultTo(false);
    table.integer('trust_score').defaultTo(50); // 0-100

    // Statistics
    table.bigInteger('transaction_count').defaultTo(0);
    table.decimal('total_volume', 18, 2).defaultTo(0);
    table.decimal('average_transaction', 18, 2);
    table.timestamp('first_seen_at');
    table.timestamp('last_seen_at');
    table.integer('unique_users').defaultTo(0);

    // Logo & Branding
    table.string('logo_url', 500);
    table.string('logo_color', 7); // Hex color
    table.string('icon', 50); // Icon identifier

    // Source
    table.enum('source', [
      'MANUAL',
      'AUTOMATIC',
      'USER_CORRECTION',
      'PARTNER_DATA',
      'SCRAPING',
    ]).defaultTo('AUTOMATIC');
    table.string('source_reference', 255);

    // Status
    table.enum('status', ['ACTIVE', 'INACTIVE', 'MERGED', 'DELETED']).defaultTo('ACTIVE');
    table.uuid('merged_into'); // If merged, points to target merchant

    // Metadata
    table.jsonb('metadata');
    table.text('notes');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');

    // Indexes
    table.index('merchant_name');
    table.index('merchant_name_normalized');
    table.index('merchant_code');
    table.index('category_primary');
    table.index('category_code');
    table.index('mcc_code');
    table.index('country');
    table.index('status');
    table.index('verification_status');
    table.index(['category_primary', 'category_secondary']);
    table.index('match_priority');
    table.index('last_seen_at');
  });

  // Full-text search index for merchant name
  await knex.raw(`
    CREATE INDEX merchants_name_search_idx ON merchants
    USING gin(to_tsvector('english', merchant_name));
  `);

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('merchants');
}
