/**
 * ReshADX - Credit Scores Table Migration
 * Alternative credit scoring using African data sources
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('credit_scores', (table) => {
    // Primary Key
    table.uuid('credit_score_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');

    // Overall Credit Score (300-850 FICO-like scale)
    table.integer('credit_score').notNullable(); // 300-850
    table.enum('score_band', [
      'POOR',       // 300-579
      'FAIR',       // 580-669
      'GOOD',       // 670-739
      'VERY_GOOD',  // 740-799
      'EXCELLENT',  // 800-850
    ]).notNullable();
    table.enum('risk_grade', ['A', 'B', 'C', 'D', 'E', 'F']).notNullable();
    table.decimal('default_probability', 5, 4).notNullable(); // 0.0000 to 1.0000

    // Traditional Credit Score Components (40% weight)
    table.integer('traditional_score'); // Based on bank accounts, loans, credit cards
    table.decimal('payment_history_score', 5, 2); // 0-100
    table.decimal('credit_utilization_score', 5, 2); // 0-100
    table.decimal('credit_age_score', 5, 2); // 0-100
    table.decimal('credit_mix_score', 5, 2); // 0-100
    table.decimal('recent_inquiries_score', 5, 2); // 0-100

    // Alternative Data Score (60% weight - Africa-specific)
    table.integer('alternative_data_score'); // 0-100

    // Mobile Money Score (15% of alternative data)
    table.decimal('mobile_money_score', 5, 2); // 0-100
    table.integer('mm_transaction_count');
    table.decimal('mm_avg_balance', 15, 2);
    table.decimal('mm_transaction_velocity', 10, 2); // Transactions per month
    table.decimal('mm_consistency_score', 5, 2); // Regular usage pattern
    table.boolean('mm_wallet_verified');

    // Telecom Score (10% of alternative data)
    table.decimal('telecom_score', 5, 2); // 0-100
    table.integer('telecom_tenure_months'); // How long with current provider
    table.decimal('airtime_spend_monthly', 10, 2);
    table.decimal('data_usage_monthly_gb', 10, 2);
    table.boolean('postpaid_account');
    table.integer('late_bill_payments');
    table.boolean('sim_swap_detected');

    // Utility Bills Score (10% of alternative data)
    table.decimal('utility_score', 5, 2); // 0-100
    table.boolean('electricity_on_time'); // ECG, etc.
    table.boolean('water_on_time'); // Ghana Water, etc.
    table.boolean('internet_on_time');
    table.integer('utility_late_payments');
    table.decimal('avg_utility_spend', 10, 2);

    // Employment Score (15% of alternative data)
    table.decimal('employment_score', 5, 2); // 0-100
    table.enum('employment_status', [
      'EMPLOYED_FORMAL',
      'EMPLOYED_INFORMAL',
      'SELF_EMPLOYED',
      'UNEMPLOYED',
      'STUDENT',
      'RETIRED',
    ]);
    table.integer('employment_tenure_months');
    table.string('employer_name', 255);
    table.enum('employer_type', ['GOVERNMENT', 'PRIVATE', 'NGO', 'SELF']);
    table.decimal('monthly_income', 15, 2);
    table.boolean('income_verified');
    table.string('income_verification_method', 50); // PAYSLIP, BANK_STATEMENT, TAX_RETURN

    // Education Score (5% of alternative data)
    table.decimal('education_score', 5, 2); // 0-100
    table.enum('education_level', [
      'PRIMARY',
      'JHS_MIDDLE',
      'SHS_SECONDARY',
      'VOCATIONAL',
      'DIPLOMA',
      'BACHELOR',
      'MASTER',
      'DOCTORATE',
    ]);
    table.boolean('student_loan_active');
    table.boolean('student_loan_in_good_standing');

    // Social Score (5% of alternative data)
    table.decimal('social_score', 5, 2); // 0-100
    table.integer('reference_count'); // Character references provided
    table.boolean('references_verified');
    table.boolean('community_member'); // Church, mosque, associations
    table.string('community_type', 100); // CHURCH, MOSQUE, ASSOCIATION, UNION
    table.integer('community_tenure_months');

    // Location/Residence Score (5% of alternative data)
    table.decimal('location_score', 5, 2); // 0-100
    table.integer('residence_tenure_months'); // Stability indicator
    table.enum('residence_type', [
      'OWNED',
      'RENTED',
      'FAMILY_HOME',
      'COMPOUND',
      'OTHER',
    ]);
    table.string('location_risk_level', 20); // Based on area
    table.boolean('address_verified');

    // Digital Footprint Score (5% of alternative data)
    table.decimal('digital_footprint_score', 5, 2); // 0-100
    table.boolean('has_email');
    table.boolean('email_verified');
    table.boolean('has_smartphone');
    table.integer('digital_service_count'); // Number of digital services used
    table.integer('account_age_months'); // Age of ReshADX account

    // Credit Recommendations
    table.decimal('recommended_credit_limit', 15, 2);
    table.decimal('recommended_loan_amount', 15, 2);
    table.decimal('recommended_interest_rate', 5, 2); // Annual percentage rate
    table.integer('recommended_loan_term_months');

    // Score Factors & Insights
    table.jsonb('positive_factors'); // Array of positive factors
    table.jsonb('negative_factors'); // Array of negative factors
    table.jsonb('improvement_tips'); // Array of tips to improve score
    table.text('score_summary'); // Human-readable summary

    // Historical Tracking
    table.integer('previous_score');
    table.integer('score_change'); // Change from previous score
    table.enum('score_trend', ['IMPROVING', 'STABLE', 'DECLINING']);
    table.timestamp('previous_score_date');

    // Model Information
    table.string('model_version', 20); // v1.0, v2.0, etc.
    table.string('calculation_method', 50); // ML_MODEL, RULE_BASED, HYBRID
    table.decimal('model_confidence', 5, 4); // 0.0000 to 1.0000

    // Regulatory & Consent
    table.boolean('user_consent_given').defaultTo(false);
    table.timestamp('consent_given_at');
    table.boolean('score_disclosed_to_user').defaultTo(false);
    table.timestamp('disclosed_at');

    // Metadata
    table.jsonb('metadata');
    table.jsonb('model_features'); // Features used in ML model
    table.jsonb('explainability'); // SHAP values, feature importance

    // Timestamps
    table.timestamp('calculated_at').notNullable();
    table.timestamp('expires_at'); // Scores valid for 90 days typically
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('credit_score');
    table.index('score_band');
    table.index('risk_grade');
    table.index(['user_id', 'calculated_at']);
    table.index('calculated_at');
    table.index('expires_at');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_credit_scores_updated_at BEFORE UPDATE ON credit_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('credit_scores');
}
