/**
 * ReshADX - Accounts Table Migration
 * Individual financial accounts (bank accounts, mobile money wallets, etc.)
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('accounts', (table) => {
    // Primary Key
    table.uuid('account_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('item_id').notNullable().references('item_id').inTable('items').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.uuid('institution_id').notNullable().references('institution_id').inTable('institutions').onDelete('RESTRICT');

    // Account Identification
    table.string('account_number', 100); // Encrypted
    table.string('account_number_masked', 50); // e.g., ***1234
    table.string('iban', 34); // International Bank Account Number
    table.string('sort_code', 20);
    table.string('bban', 30); // Basic Bank Account Number
    table.string('institution_account_id', 255); // Institution's internal ID

    // Mobile Money Specific
    table.string('mobile_number', 20); // Mobile money wallet number
    table.string('mobile_number_masked', 20); // +233***1234
    table.string('mobile_operator', 50); // MTN, Vodafone, Airtel, etc.
    table.string('wallet_type', 50); // PREPAID, POSTPAID, AGENT

    // Account Details
    table.string('account_name', 255).notNullable();
    table.string('official_name', 255); // Official account name from institution
    table.enum('account_type', [
      'CHECKING',
      'SAVINGS',
      'MOBILE_MONEY',
      'CREDIT_CARD',
      'LOAN',
      'INVESTMENT',
      'RETIREMENT',
      'SUSU',
      'MICROFINANCE',
      'CREDIT_UNION',
      'WALLET',
      'OTHER',
    ]).notNullable();
    table.enum('account_subtype', [
      'PERSONAL',
      'BUSINESS',
      'JOINT',
      'STUDENT',
      'YOUTH',
      'SENIOR',
      'PREMIUM',
      'BASIC',
    ]);

    // Balances (all in minor currency units, e.g., pesewas, kobo)
    table.bigInteger('current_balance').defaultTo(0); // Current balance in minor units
    table.bigInteger('available_balance').defaultTo(0); // Available for withdrawal
    table.bigInteger('pending_balance').defaultTo(0); // Pending transactions
    table.bigInteger('credit_limit'); // For credit cards
    table.string('currency', 3).notNullable().defaultTo('GHS'); // ISO 4217
    table.timestamp('balance_as_of'); // When balance was last updated

    // Interest & Fees
    table.decimal('interest_rate', 8, 4); // Annual interest rate
    table.decimal('minimum_balance', 15, 2);
    table.decimal('monthly_maintenance_fee', 10, 2);
    table.decimal('overdraft_limit', 15, 2);
    table.decimal('overdraft_fee', 10, 2);

    // Status
    table.enum('status', [
      'ACTIVE',
      'INACTIVE',
      'CLOSED',
      'FROZEN',
      'DORMANT',
      'RESTRICTED',
    ]).defaultTo('ACTIVE');
    table.timestamp('status_changed_at');
    table.text('status_reason');

    // Account Holder Information
    table.string('holder_name', 255);
    table.jsonb('holder_names'); // Array for joint accounts
    table.string('holder_category', 50); // INDIVIDUAL, BUSINESS, JOINT, TRUST

    // Dates
    table.date('date_opened');
    table.date('date_closed');
    table.date('last_statement_date');
    table.date('next_payment_due_date'); // For loans, credit cards

    // Verification
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('verified_at');
    table.string('verification_method', 50); // MANUAL, AUTOMATIC, MICRODEPOSIT
    table.boolean('ownership_verified').defaultTo(false);

    // Transaction Limits (Daily)
    table.decimal('daily_withdrawal_limit', 15, 2);
    table.decimal('daily_transfer_limit', 15, 2);
    table.decimal('daily_payment_limit', 15, 2);
    table.decimal('daily_limit_used', 15, 2).defaultTo(0);
    table.date('daily_limit_reset_date');

    // Risk & Compliance
    table.integer('risk_score').defaultTo(0); // 0-100
    table.enum('risk_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).defaultTo('LOW');
    table.boolean('suspicious_activity').defaultTo(false);
    table.boolean('pep_linked').defaultTo(false); // Linked to Politically Exposed Person
    table.timestamp('last_risk_assessment');

    // Sync Status
    table.timestamp('last_synced_at');
    table.timestamp('transactions_last_synced_at');
    table.integer('total_transactions').defaultTo(0);
    table.timestamp('oldest_transaction_date');
    table.timestamp('newest_transaction_date');

    // Historical Tracking
    table.jsonb('balance_history'); // Array of {date, balance} for charts
    table.jsonb('transaction_categories'); // Summary of spending by category

    // Metadata
    table.jsonb('metadata');
    table.jsonb('institution_metadata'); // Institution-specific data
    table.jsonb('features'); // Account features/capabilities

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at'); // Soft delete

    // Indexes
    table.index('item_id');
    table.index('user_id');
    table.index('institution_id');
    table.index('account_type');
    table.index('status');
    table.index(['user_id', 'account_type']);
    table.index(['item_id', 'status']);
    table.index('mobile_number');
    table.index('last_synced_at');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('accounts');
}
