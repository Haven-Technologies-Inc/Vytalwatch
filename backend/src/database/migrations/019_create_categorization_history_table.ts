/**
 * ReshADX - Categorization History Table Migration
 * Store transaction categorization records for ML training
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('categorization_history', (table) => {
    // Primary Key
    table.uuid('categorization_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('transaction_id').notNullable().references('transaction_id').inTable('transactions').onDelete('CASCADE');
    table.uuid('user_id').references('user_id').inTable('users').onDelete('SET NULL');
    table.uuid('merchant_id').references('merchant_id').inTable('merchants').onDelete('SET NULL');

    // Original Transaction Data
    table.text('transaction_description').notNullable();
    table.text('transaction_description_normalized');
    table.decimal('transaction_amount', 18, 2);
    table.string('transaction_currency', 3);
    table.string('transaction_type', 50); // debit, credit, transfer

    // Categorization Attempt
    table.enum('categorization_method', [
      'RULE_BASED',
      'ML_MODEL',
      'MERCHANT_LOOKUP',
      'USER_CORRECTION',
      'MANUAL_ADMIN',
      'FALLBACK',
    ]).notNullable();
    table.string('model_version', 50); // If ML model was used

    // Category Assignment
    table.string('category_assigned', 100).notNullable();
    table.string('category_code', 20);
    table.string('subcategory_assigned', 100);
    table.decimal('confidence_score', 5, 4); // 0.0000 - 1.0000

    // Alternative Suggestions
    table.jsonb('alternative_categories'); // Other possible categories
    /* Example:
    [
      { "category": "Transport", "confidence": 0.25 },
      { "category": "Shopping", "confidence": 0.15 }
    ]
    */

    // Features Used (for ML training)
    table.jsonb('features_extracted');
    /* Example:
    {
      "merchant_name": "UBER GHANA",
      "amount_bucket": "10-50",
      "time_of_day": "evening",
      "day_of_week": "friday",
      "is_recurring": false
    }
    */

    // User Feedback
    table.boolean('user_accepted').defaultTo(true);
    table.boolean('user_corrected').defaultTo(false);
    table.string('user_correction_category', 100);
    table.string('user_correction_subcategory', 100);
    table.timestamp('user_correction_at');
    table.text('user_feedback');

    // Quality Flags
    table.boolean('is_training_data').defaultTo(false); // Used for ML training
    table.boolean('needs_review').defaultTo(false);
    table.boolean('is_anomaly').defaultTo(false); // Unusual categorization
    table.enum('data_quality', ['HIGH', 'MEDIUM', 'LOW']).defaultTo('MEDIUM');

    // Merchant Extraction
    table.string('merchant_extracted', 255); // Merchant name extracted
    table.decimal('merchant_confidence', 5, 4);
    table.boolean('merchant_verified').defaultTo(false);

    // Processing Info
    table.integer('processing_time_ms');
    table.integer('rules_evaluated');
    table.jsonb('rules_matched'); // Which rules matched

    // Metadata
    table.jsonb('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('transaction_id');
    table.index('user_id');
    table.index('merchant_id');
    table.index('category_assigned');
    table.index('categorization_method');
    table.index('confidence_score');
    table.index('user_corrected');
    table.index('is_training_data');
    table.index(['category_assigned', 'user_corrected']);
    table.index(['user_id', 'category_assigned']);
    table.index('created_at');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_categorization_history_updated_at BEFORE UPDATE ON categorization_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('categorization_history');
}
