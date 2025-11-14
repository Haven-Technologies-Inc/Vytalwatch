/**
 * ReshADX - Risk Assessments Table Migration
 * Fraud detection and risk analysis (Plaid Signal equivalent)
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('risk_assessments', (table) => {
    // Primary Key
    table.uuid('risk_assessment_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.uuid('account_id').references('account_id').inTable('accounts').onDelete('SET NULL');
    table.uuid('transaction_id').references('transaction_id').inTable('transactions').onDelete('SET NULL');

    // Overall Risk Assessment
    table.integer('risk_score').notNullable(); // 0-100 (higher = more risky)
    table.enum('risk_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).notNullable();
    table.enum('recommended_action', [
      'APPROVE',
      'REVIEW',
      'CHALLENGE',
      'BLOCK',
    ]).notNullable();
    table.text('risk_summary'); // Human-readable summary

    // Assessment Type
    table.enum('assessment_type', [
      'ACCOUNT_OPENING',
      'TRANSACTION',
      'LOGIN',
      'PAYMENT',
      'WITHDRAWAL',
      'TRANSFER',
      'PERIODIC_REVIEW',
    ]).notNullable();

    // Fraud Indicators
    table.jsonb('fraud_indicators');

    // Account Fraud
    table.boolean('synthetic_identity').defaultTo(false); // Fake identity
    table.boolean('identity_theft').defaultTo(false);
    table.boolean('account_takeover').defaultTo(false);
    table.boolean('friendly_fraud').defaultTo(false);
    table.decimal('account_fraud_score', 5, 2); // 0-100

    // Transaction Fraud
    table.boolean('unusual_transaction_pattern').defaultTo(false);
    table.boolean('velocity_check_failed').defaultTo(false); // Too many transactions
    table.boolean('amount_anomaly').defaultTo(false); // Unusual amount
    table.boolean('merchant_fraud').defaultTo(false);
    table.boolean('card_not_present_fraud').defaultTo(false);
    table.decimal('transaction_fraud_score', 5, 2); // 0-100

    // African-Specific Fraud Patterns
    table.boolean('sim_swap_detected').defaultTo(false); // Critical for mobile money
    table.decimal('sim_swap_confidence', 5, 2); // 0-100
    table.timestamp('sim_swap_detected_at');
    table.string('previous_phone_number', 20);

    table.boolean('agent_fraud_detected').defaultTo(false); // Fraudulent agent
    table.string('agent_code', 50);
    table.decimal('agent_fraud_score', 5, 2); // 0-100

    table.boolean('cross_border_fraud').defaultTo(false); // Suspicious international
    table.string('suspicious_country', 2);

    table.boolean('mule_account_detected').defaultTo(false); // Money mule
    table.decimal('mule_account_score', 5, 2); // 0-100
    table.integer('rapid_transfer_count'); // Money in, then out quickly

    // AML (Anti-Money Laundering) Indicators
    table.jsonb('aml_indicators');
    table.boolean('structuring_detected').defaultTo(false); // Multiple small transactions
    table.boolean('layering_detected').defaultTo(false); // Complex transfers
    table.boolean('high_risk_jurisdiction').defaultTo(false);
    table.boolean('pep_match').defaultTo(false); // Politically Exposed Person
    table.boolean('sanctions_match').defaultTo(false); // OFAC, UN, EU
    table.string('sanctions_list', 100); // Which list matched
    table.decimal('aml_score', 5, 2); // 0-100

    // Device Risk
    table.jsonb('device_risk');
    table.string('device_id', 255);
    table.string('device_fingerprint', 255);
    table.boolean('new_device').defaultTo(false);
    table.boolean('device_compromise_suspected').defaultTo(false);
    table.boolean('emulator_detected').defaultTo(false);
    table.boolean('rooted_jailbroken').defaultTo(false);
    table.decimal('device_risk_score', 5, 2); // 0-100

    // Behavioral Risk
    table.jsonb('behavioral_risk');
    table.boolean('unusual_login_time').defaultTo(false);
    table.boolean('unusual_location').defaultTo(false);
    table.boolean('rapid_account_changes').defaultTo(false);
    table.boolean('bot_behavior').defaultTo(false);
    table.decimal('behavioral_score', 5, 2); // 0-100

    // Network Intelligence
    table.jsonb('network_intelligence');
    table.string('ip_address', 45); // IPv6 support
    table.boolean('ip_reputation_bad').defaultTo(false);
    table.boolean('vpn_proxy_detected').defaultTo(false);
    table.boolean('tor_detected').defaultTo(false);
    table.string('ip_country', 2);
    table.string('ip_city', 100);
    table.decimal('ip_risk_score', 5, 2); // 0-100

    // Location Analysis
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);
    table.decimal('location_distance_km', 10, 2); // Distance from usual location
    table.boolean('impossible_travel').defaultTo(false); // Physically impossible
    table.string('location_country', 2);
    table.string('location_city', 100);

    // Velocity Checks (Frequency)
    table.integer('transactions_last_hour').defaultTo(0);
    table.integer('transactions_last_day').defaultTo(0);
    table.integer('transactions_last_week').defaultTo(0);
    table.decimal('amount_last_hour', 15, 2).defaultTo(0);
    table.decimal('amount_last_day', 15, 2).defaultTo(0);
    table.decimal('amount_last_week', 15, 2).defaultTo(0);
    table.boolean('velocity_threshold_exceeded').defaultTo(false);

    // Pattern Analysis
    table.jsonb('spending_patterns');
    table.boolean('pattern_break_detected').defaultTo(false); // Sudden change
    table.decimal('pattern_similarity', 5, 4); // 0-1 (1 = normal pattern)

    // Model & Confidence
    table.string('model_version', 20); // ML model version
    table.decimal('model_confidence', 5, 4); // 0.0000 to 1.0000
    table.jsonb('model_features'); // Features used
    table.jsonb('shap_values'); // Explainable AI

    // Review & Resolution
    table.enum('review_status', [
      'PENDING',
      'IN_REVIEW',
      'APPROVED',
      'REJECTED',
      'ESCALATED',
    ]).defaultTo('PENDING');
    table.uuid('reviewed_by'); // Admin user ID
    table.timestamp('reviewed_at');
    table.text('review_notes');
    table.text('resolution');

    // Actions Taken
    table.boolean('user_notified').defaultTo(false);
    table.timestamp('user_notified_at');
    table.boolean('account_locked').defaultTo(false);
    table.timestamp('account_locked_at');
    table.boolean('transaction_blocked').defaultTo(false);
    table.boolean('additional_verification_required').defaultTo(false);

    // Metadata
    table.jsonb('metadata');
    table.jsonb('raw_signals'); // All raw fraud signals

    // Timestamps
    table.timestamp('assessed_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('account_id');
    table.index('transaction_id');
    table.index('risk_level');
    table.index('assessment_type');
    table.index(['user_id', 'assessed_at']);
    table.index('sim_swap_detected');
    table.index('mule_account_detected');
    table.index('sanctions_match');
    table.index('review_status');
    table.index('assessed_at');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_risk_assessments_updated_at BEFORE UPDATE ON risk_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('risk_assessments');
}
