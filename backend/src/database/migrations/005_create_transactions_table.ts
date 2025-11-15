/**
 * ReshADX - Transactions Table Migration
 * Financial transactions with African-specific enrichment
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transactions', (table) => {
    // Primary Key
    table.uuid('transaction_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('account_id').notNullable().references('account_id').inTable('accounts').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.uuid('item_id').notNullable().references('item_id').inTable('items').onDelete('CASCADE');

    // Transaction Identification
    table.string('institution_transaction_id', 255); // Institution's ID
    table.string('reference_number', 255); // Transaction reference
    table.string('check_number', 50);
    table.string('transaction_code', 50); // Bank transaction code

    // Basic Transaction Info
    table.bigInteger('amount').notNullable(); // Amount in minor units (pesewas, kobo, cents)
    table.string('currency', 3).notNullable().defaultTo('GHS');
    table.timestamp('date').notNullable(); // Transaction date
    table.timestamp('authorized_date'); // Authorization date
    table.timestamp('posted_date'); // When it posted to account

    // Transaction Type
    table.enum('transaction_type', [
      'DEBIT',
      'CREDIT',
      'TRANSFER',
      'PAYMENT',
      'WITHDRAWAL',
      'DEPOSIT',
      'FEE',
      'REFUND',
      'REVERSAL',
      'ADJUSTMENT',
    ]).notNullable();

    // Payment Method
    table.enum('payment_method', [
      'CASH',
      'CARD',
      'MOBILE_MONEY',
      'BANK_TRANSFER',
      'CHEQUE',
      'USSD',
      'QR_CODE',
      'AGENT',
      'DIRECT_DEBIT',
      'STANDING_ORDER',
      'ACH',
      'WIRE',
      'OTHER',
    ]);

    // Mobile Money Specific
    table.string('mm_sender_number', 20);
    table.string('mm_receiver_number', 20);
    table.string('mm_transaction_id', 255);
    table.string('mm_operator', 50); // MTN, Vodafone, Airtel, etc.
    table.enum('mm_transaction_type', [
      'CASH_IN',
      'CASH_OUT',
      'TRANSFER',
      'AIRTIME',
      'BILL_PAYMENT',
      'MERCHANT_PAYMENT',
      'WITHDRAWAL',
    ]);

    // Description & Names
    table.text('description'); // Raw description from institution
    table.text('description_clean'); // Cleaned/normalized description
    table.string('merchant_name', 255);
    table.string('merchant_name_normalized', 255);

    // Merchant Information (Enrichment)
    table.string('merchant_id', 255);
    table.string('merchant_logo_url', 500);
    table.string('merchant_website', 255);
    table.string('merchant_phone', 20);
    table.decimal('merchant_latitude', 10, 7);
    table.decimal('merchant_longitude', 10, 7);
    table.string('merchant_address', 500);
    table.string('merchant_city', 100);
    table.string('merchant_country', 2);

    // Categorization (Plaid Enrich)
    table.string('primary_category', 100); // FOOD_AND_DRINK, TRANSPORTATION, etc.
    table.string('detailed_category', 100); // RESTAURANTS, FAST_FOOD, etc.
    table.string('african_category', 100); // TROTRO, SUSU, MARKET_PURCHASE, etc.
    table.decimal('category_confidence', 5, 4); // 0.0000 to 1.0000
    table.jsonb('category_hierarchy'); // Full category path

    // Location Information
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);
    table.string('location_address', 500);
    table.string('location_city', 100);
    table.string('location_region', 100);
    table.string('location_country', 2);

    // Counterparty Information
    table.string('counterparty_name', 255);
    table.string('counterparty_account', 100); // Encrypted
    table.string('counterparty_bank', 100);
    table.string('counterparty_type', 50); // INDIVIDUAL, BUSINESS, GOVERNMENT

    // Status
    table.enum('status', [
      'PENDING',
      'POSTED',
      'CLEARED',
      'FAILED',
      'CANCELLED',
      'REVERSED',
    ]).defaultTo('POSTED');
    table.boolean('is_pending').defaultTo(false);
    table.timestamp('status_changed_at');

    // Recurring Transactions
    table.boolean('is_recurring').defaultTo(false);
    table.string('recurring_group_id', 255); // Group recurring transactions
    table.enum('recurring_frequency', [
      'DAILY',
      'WEEKLY',
      'BIWEEKLY',
      'MONTHLY',
      'QUARTERLY',
      'YEARLY',
    ]);
    table.date('next_expected_date');

    // Risk & Fraud Detection (Plaid Signal)
    table.integer('risk_score').defaultTo(0); // 0-100
    table.enum('risk_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).defaultTo('LOW');
    table.boolean('is_suspicious').defaultTo(false);
    table.jsonb('fraud_indicators'); // Specific fraud signals
    table.text('fraud_reason');
    table.boolean('aml_flagged').defaultTo(false);
    table.timestamp('risk_assessed_at');

    // Enrichment Status
    table.boolean('is_enriched').defaultTo(false);
    table.timestamp('enriched_at');
    table.string('enrichment_source', 50); // RESHADX, MANUAL, THIRD_PARTY
    table.decimal('enrichment_confidence', 5, 4);

    // Personal Finance Management
    table.string('user_category', 100); // User-assigned category
    table.text('user_notes');
    table.jsonb('user_tags'); // User-defined tags
    table.boolean('is_business_expense').defaultTo(false);
    table.boolean('is_tax_deductible').defaultTo(false);
    table.string('receipt_url', 500);

    // Balance Impact
    table.bigInteger('running_balance'); // Account balance after this transaction
    table.bigInteger('balance_before');
    table.bigInteger('balance_after');

    // Fees & Charges
    table.bigInteger('fee_amount').defaultTo(0);
    table.string('fee_type', 100);
    table.bigInteger('tax_amount').defaultTo(0);
    table.decimal('tax_rate', 5, 2);

    // Cross-Border & Currency Exchange
    table.boolean('is_international').defaultTo(false);
    table.string('original_currency', 3);
    table.bigInteger('original_amount');
    table.decimal('exchange_rate', 15, 8);
    table.bigInteger('exchange_fee').defaultTo(0);

    // Metadata
    table.jsonb('metadata');
    table.jsonb('institution_metadata');
    table.jsonb('enrichment_metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index('account_id');
    table.index('user_id');
    table.index('item_id');
    table.index('date');
    table.index('transaction_type');
    table.index('status');
    table.index(['account_id', 'date']);
    table.index(['user_id', 'date']);
    table.index('primary_category');
    table.index('merchant_name_normalized');
    table.index('is_suspicious');
    table.index('risk_level');
    table.index(['user_id', 'primary_category', 'date']);
    table.index('mm_transaction_id');
    table.index('reference_number');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

  // Create partitioning by date for better performance
  await knex.raw(`
    -- This is a comment for future partitioning strategy
    -- For production, consider partitioning by date range (monthly/quarterly)
    -- ALTER TABLE transactions PARTITION BY RANGE (date);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transactions');
}
