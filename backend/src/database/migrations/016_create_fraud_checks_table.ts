/**
 * ReshADX - Fraud Checks Table Migration
 * Log all fraud detection checks and their results
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('fraud_checks', (table) => {
    // Primary Key
    table.uuid('check_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').references('user_id').inTable('users').onDelete('SET NULL');
    table.uuid('transaction_id').references('transaction_id').inTable('transactions').onDelete('SET NULL');
    table.uuid('session_id').references('session_id').inTable('sessions').onDelete('SET NULL');

    // Check Context
    table.enum('check_type', [
      'LOGIN',
      'TRANSACTION',
      'ACCOUNT_LINK',
      'PAYMENT',
      'WITHDRAWAL',
      'PROFILE_UPDATE',
      'API_REQUEST',
      'DEVICE_REGISTRATION',
    ]).notNullable();
    table.string('check_context', 100); // Additional context (e.g., "mtn_momo_payment")

    // Request Details
    table.string('ip_address', 45);
    table.string('device_id', 255);
    table.text('user_agent');
    table.string('country', 2);
    table.string('city', 100);

    // Risk Assessment Results
    table.integer('risk_score').notNullable(); // 0-100
    table.enum('risk_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).notNullable();
    table.enum('decision', ['ALLOW', 'REVIEW', 'CHALLENGE', 'BLOCK']).notNullable();

    // Individual Check Results (scored components)
    table.jsonb('check_results').notNullable();
    /* Example structure:
    {
      "velocity": { "score": 15, "details": "5 transactions in 10 minutes" },
      "geolocation": { "score": 0, "details": "Consistent with history" },
      "device": { "score": 10, "details": "New device" },
      "behavior": { "score": 5, "details": "Unusual time" },
      "amount": { "score": 20, "details": "Above average amount" }
    }
    */

    // Flags Triggered
    table.jsonb('flags_triggered'); // Array of flag codes
    table.integer('flags_count').defaultTo(0);

    // Rule Matches
    table.jsonb('rules_matched'); // Array of rule IDs that triggered
    table.jsonb('rules_bypassed'); // Rules skipped (whitelist, etc.)

    // Model Results (if ML model was used)
    table.string('ml_model_version', 50);
    table.decimal('ml_confidence', 5, 4); // Model confidence 0.0000 - 1.0000
    table.jsonb('ml_features'); // Features used by model
    table.jsonb('ml_explanation'); // SHAP values or similar

    // Decision Details
    table.text('decision_reason');
    table.boolean('requires_manual_review').defaultTo(false);
    table.boolean('challenged').defaultTo(false); // User was challenged (MFA, etc.)
    table.boolean('challenge_passed');

    // Override Information
    table.boolean('decision_overridden').defaultTo(false);
    table.uuid('overridden_by'); // Admin who overrode
    table.enum('override_decision', ['ALLOW', 'BLOCK']);
    table.text('override_reason');
    table.timestamp('overridden_at');

    // Outcome
    table.enum('actual_outcome', ['LEGITIMATE', 'FRAUD_CONFIRMED', 'FALSE_POSITIVE', 'UNKNOWN']);
    table.timestamp('outcome_determined_at');
    table.uuid('outcome_determined_by');
    table.text('outcome_notes');

    // Performance Metrics
    table.integer('processing_time_ms'); // Time taken for check
    table.integer('db_queries_count');
    table.integer('api_calls_count');

    // Metadata
    table.jsonb('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('transaction_id');
    table.index('session_id');
    table.index('check_type');
    table.index('risk_level');
    table.index('decision');
    table.index('ip_address');
    table.index(['user_id', 'check_type']);
    table.index(['risk_level', 'decision']);
    table.index('requires_manual_review');
    table.index('actual_outcome');
    table.index('created_at');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_fraud_checks_updated_at BEFORE UPDATE ON fraud_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('fraud_checks');
}
