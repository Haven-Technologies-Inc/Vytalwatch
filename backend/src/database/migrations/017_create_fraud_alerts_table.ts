/**
 * ReshADX - Fraud Alerts Table Migration
 * Critical fraud warnings and incident tracking
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('fraud_alerts', (table) => {
    // Primary Key
    table.uuid('alert_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Relationships
    table.uuid('user_id').references('user_id').inTable('users').onDelete('SET NULL');
    table.uuid('fraud_check_id').references('check_id').inTable('fraud_checks').onDelete('SET NULL');
    table.uuid('transaction_id').references('transaction_id').inTable('transactions').onDelete('SET NULL');

    // Alert Classification
    table.enum('alert_type', [
      'ACCOUNT_TAKEOVER',
      'TRANSACTION_FRAUD',
      'SYNTHETIC_IDENTITY',
      'SIM_SWAP',
      'VELOCITY_ABUSE',
      'UNUSUAL_BEHAVIOR',
      'SANCTIONS_MATCH',
      'PEP_MATCH',
      'DEVICE_FRAUD',
      'GEOLOCATION_ANOMALY',
      'PAYMENT_FRAUD',
      'MONEY_LAUNDERING',
      'MULTI_ACCOUNT',
      'OTHER',
    ]).notNullable();

    table.enum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).notNullable();
    table.enum('priority', ['P1', 'P2', 'P3', 'P4']).notNullable(); // P1 = highest

    // Alert Details
    table.string('alert_code', 50).notNullable(); // Internal code e.g., "FRD-001"
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.jsonb('evidence'); // Supporting evidence
    table.jsonb('affected_entities'); // List of affected accounts, transactions, etc.

    // Risk Context
    table.integer('risk_score'); // Score at time of alert
    table.decimal('financial_exposure', 18, 2); // Potential loss amount
    table.string('currency', 3).defaultTo('GHS');

    // Status & Workflow
    table.enum('status', [
      'NEW',
      'ACKNOWLEDGED',
      'INVESTIGATING',
      'ESCALATED',
      'ACTION_TAKEN',
      'RESOLVED',
      'FALSE_POSITIVE',
      'DUPLICATE',
    ]).defaultTo('NEW');
    table.timestamp('status_changed_at');
    table.uuid('assigned_to'); // Analyst assigned
    table.timestamp('assigned_at');

    // SLA Tracking
    table.timestamp('sla_deadline');
    table.boolean('sla_breached').defaultTo(false);
    table.timestamp('first_response_at');
    table.integer('first_response_minutes'); // Minutes to first response

    // Investigation
    table.text('investigation_notes');
    table.jsonb('investigation_timeline'); // Array of investigation events
    table.timestamp('investigation_started_at');
    table.timestamp('investigation_completed_at');

    // Resolution
    table.enum('resolution', [
      'FRAUD_CONFIRMED',
      'FALSE_POSITIVE',
      'INCONCLUSIVE',
      'USER_ERROR',
      'SYSTEM_ERROR',
      'ESCALATED_TO_LAW_ENFORCEMENT',
    ]);
    table.text('resolution_notes');
    table.uuid('resolved_by');
    table.timestamp('resolved_at');

    // Actions Taken
    table.jsonb('actions_taken'); // Array of actions
    /* Example:
    [
      { "action": "ACCOUNT_FROZEN", "timestamp": "...", "by": "..." },
      { "action": "USER_NOTIFIED", "timestamp": "...", "method": "SMS" }
    ]
    */
    table.boolean('account_frozen').defaultTo(false);
    table.boolean('user_notified').defaultTo(false);
    table.boolean('reported_to_authorities').defaultTo(false);
    table.boolean('funds_recovered').defaultTo(false);
    table.decimal('recovered_amount', 18, 2);

    // Related Alerts
    table.uuid('parent_alert_id').references('alert_id').inTable('fraud_alerts');
    table.jsonb('related_alert_ids');

    // Notifications
    table.jsonb('notifications_sent'); // Email, SMS, Slack notifications
    table.boolean('client_notified').defaultTo(false); // API client notified

    // Metadata
    table.jsonb('metadata');
    table.text('internal_notes'); // Notes not visible to clients

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('fraud_check_id');
    table.index('transaction_id');
    table.index('alert_type');
    table.index('severity');
    table.index('priority');
    table.index('status');
    table.index('assigned_to');
    table.index(['status', 'priority']);
    table.index(['severity', 'status']);
    table.index('sla_deadline');
    table.index('created_at');
    table.index('parent_alert_id');
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_fraud_alerts_updated_at BEFORE UPDATE ON fraud_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('fraud_alerts');
}
