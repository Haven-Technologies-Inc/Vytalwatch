/**
 * ReshADX - Users Table Migration
 * Creates the core users table with comprehensive fields for African markets
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    // Primary Key
    table.uuid('user_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Basic Information
    table.string('email', 255).unique().notNullable();
    table.string('phone_number', 20).unique(); // E.164 format: +233XXXXXXXXX
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('middle_name', 100);
    table.date('date_of_birth');
    table.enum('gender', ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);

    // African Identity Documents
    table.string('ghana_card_number', 20).unique(); // GHA-XXXXXXXXX-X
    table.string('voters_id', 20);
    table.string('passport_number', 20);
    table.string('drivers_license', 20);
    table.string('ssnit_number', 20); // Social Security (Ghana)
    table.string('nin_number', 20); // National ID (Nigeria)
    table.string('national_id', 20); // Kenya, other countries

    // Contact Information
    table.string('address_line1', 255);
    table.string('address_line2', 255);
    table.string('city', 100);
    table.string('region_state', 100);
    table.string('postal_code', 20);
    table.string('country', 2).notNullable().defaultTo('GH'); // ISO 3166-1 alpha-2
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);

    // Account Settings
    table.string('language', 5).defaultTo('en'); // en, tw, ga, yo, ig, sw
    table.string('currency', 3).defaultTo('GHS'); // GHS, NGN, KES, USD
    table.string('timezone', 50).defaultTo('Africa/Accra');
    table.enum('account_tier', ['FREE', 'STARTUP', 'GROWTH', 'BUSINESS', 'ENTERPRISE']).defaultTo('FREE');
    table.enum('account_status', ['ACTIVE', 'SUSPENDED', 'CLOSED', 'PENDING_VERIFICATION']).defaultTo('PENDING_VERIFICATION');

    // KYC/AML Status
    table.enum('kyc_status', ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED']).defaultTo('NOT_STARTED');
    table.timestamp('kyc_completed_at');
    table.enum('kyc_level', ['TIER_1', 'TIER_2', 'TIER_3']); // Tier 1: Basic, Tier 2: Intermediate, Tier 3: Full
    table.string('kyc_provider', 50); // NIA, NIMC, etc.
    table.text('kyc_notes');

    // Risk & Compliance
    table.integer('risk_score').defaultTo(0); // 0-100
    table.enum('risk_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).defaultTo('LOW');
    table.boolean('is_pep').defaultTo(false); // Politically Exposed Person
    table.boolean('sanctions_match').defaultTo(false); // OFAC, UN, EU sanctions
    table.boolean('adverse_media').defaultTo(false);
    table.timestamp('last_risk_assessment_at');

    // Authentication & Security
    table.boolean('email_verified').defaultTo(false);
    table.boolean('phone_verified').defaultTo(false);
    table.timestamp('email_verified_at');
    table.timestamp('phone_verified_at');
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret', 255);
    table.string('mfa_method', 20); // SMS, TOTP, BIOMETRIC
    table.timestamp('last_login_at');
    table.string('last_login_ip', 45); // IPv6 support
    table.string('last_login_device', 255);
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until');

    // Consent & Privacy
    table.boolean('terms_accepted').defaultTo(false);
    table.timestamp('terms_accepted_at');
    table.boolean('privacy_policy_accepted').defaultTo(false);
    table.timestamp('privacy_policy_accepted_at');
    table.boolean('marketing_consent').defaultTo(false);
    table.boolean('data_sharing_consent').defaultTo(false);

    // Referral & Growth
    table.string('referral_code', 20).unique();
    table.uuid('referred_by'); // user_id of referrer
    table.integer('referral_count').defaultTo(0);

    // Metadata
    table.jsonb('metadata'); // Flexible storage for additional data
    table.jsonb('preferences'); // User preferences

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at'); // Soft delete

    // Indexes
    table.index('email');
    table.index('phone_number');
    table.index('ghana_card_number');
    table.index('country');
    table.index('account_status');
    table.index('kyc_status');
    table.index('risk_level');
    table.index(['created_at', 'country']);
    table.index('referral_code');
    table.index('referred_by');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
}
