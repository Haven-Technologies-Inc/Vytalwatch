/**
 * ReshADX - Merchant Category Mappings Table Migration
 * Store learned merchant-category relationships from user corrections
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('merchant_category_mappings', (table) => {
    // Primary Key
    table.uuid('mapping_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Merchant Information
    table.uuid('merchant_id').references('merchant_id').inTable('merchants').onDelete('SET NULL');
    table.string('merchant_name', 255).notNullable();
    table.string('merchant_name_normalized', 255).notNullable();
    table.string('merchant_pattern', 500); // Regex pattern for matching

    // Category Mapping
    table.string('category', 100).notNullable();
    table.string('category_code', 20);
    table.string('subcategory', 100);

    // Confidence & Statistics
    table.decimal('confidence', 5, 4).defaultTo(0.5); // 0-1 confidence score
    table.integer('vote_count').defaultTo(1); // Number of times this mapping was suggested
    table.integer('accept_count').defaultTo(0); // Number of times users accepted
    table.integer('reject_count').defaultTo(0); // Number of times users rejected
    table.decimal('acceptance_rate', 5, 4); // Computed: accept / (accept + reject)

    // User-Specific (optional)
    table.uuid('user_id').references('user_id').inTable('users').onDelete('SET NULL');
    table.boolean('is_user_specific').defaultTo(false); // Personal mapping

    // Scope
    table.enum('scope', ['GLOBAL', 'COUNTRY', 'USER']).defaultTo('GLOBAL');
    table.string('country', 2); // If country-specific

    // Source & Verification
    table.enum('source', [
      'USER_CORRECTION',
      'ADMIN_MAPPING',
      'AUTOMATIC',
      'ML_LEARNED',
      'EXTERNAL_DATA',
    ]).notNullable();
    table.uuid('source_user_id').references('user_id').inTable('users').onDelete('SET NULL');
    table.uuid('source_categorization_id').references('categorization_id').inTable('categorization_history').onDelete('SET NULL');

    // Verification
    table.enum('verification_status', ['UNVERIFIED', 'VERIFIED', 'REJECTED']).defaultTo('UNVERIFIED');
    table.uuid('verified_by');
    table.timestamp('verified_at');
    table.text('verification_notes');

    // Status
    table.enum('status', ['ACTIVE', 'INACTIVE', 'SUPERSEDED', 'DELETED']).defaultTo('ACTIVE');
    table.uuid('superseded_by'); // If replaced by another mapping

    // Priority & Conflict Resolution
    table.integer('priority').defaultTo(0); // Higher = preferred
    table.boolean('is_default').defaultTo(false); // Default mapping for this merchant

    // Metadata
    table.jsonb('metadata');
    table.text('notes');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at');

    // Indexes
    table.index('merchant_id');
    table.index('merchant_name_normalized');
    table.index('category');
    table.index('category_code');
    table.index('user_id');
    table.index('scope');
    table.index('status');
    table.index('verification_status');
    table.index('confidence');
    table.index(['merchant_name_normalized', 'scope']);
    table.index(['merchant_name_normalized', 'category']);
    table.index('priority');

    // Unique constraint for global mappings
    table.unique(['merchant_name_normalized', 'category', 'scope', 'country'], {
      predicate: knex.whereNull('user_id'),
    });
  });

  // Full-text search index
  await knex.raw(`
    CREATE INDEX merchant_category_mappings_search_idx ON merchant_category_mappings
    USING gin(to_tsvector('english', merchant_name));
  `);

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_merchant_category_mappings_updated_at BEFORE UPDATE ON merchant_category_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('merchant_category_mappings');
}
