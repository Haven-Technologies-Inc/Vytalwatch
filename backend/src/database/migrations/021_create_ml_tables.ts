/**
 * ReshADX - ML Training Tables Migration
 * Store ML model training history, deployed models, and feature stores
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ML Training History - records all training runs
  await knex.schema.createTable('ml_training_history', (table) => {
    // Primary Key
    table.uuid('training_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Model Identification
    table.string('model_id', 100).notNullable();
    table.string('model_type', 50).notNullable(); // credit-scoring, fraud-detection, categorization
    table.string('version', 50).notNullable();

    // Training Status
    table.enum('status', ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED']).defaultTo('PENDING');

    // Data Information
    table.date('data_start_date');
    table.date('data_end_date');
    table.integer('sample_count').defaultTo(0);
    table.integer('feature_count');
    table.jsonb('data_statistics'); // Distribution stats

    // Hyperparameters
    table.jsonb('hyperparameters');
    table.decimal('validation_split', 3, 2);
    table.decimal('test_split', 3, 2);

    // Training Metrics
    table.jsonb('metrics'); // accuracy, precision, recall, f1, etc.
    table.jsonb('validation_metrics');
    table.jsonb('test_metrics');

    // Performance
    table.integer('training_duration').defaultTo(0); // milliseconds
    table.integer('epochs_completed');
    table.decimal('final_loss', 10, 6);

    // Model Storage
    table.string('model_path', 500);
    table.integer('model_size_bytes');
    table.string('model_format', 50); // json, onnx, tflite

    // Environment
    table.string('environment', 20); // development, staging, production
    table.string('compute_type', 50); // cpu, gpu
    table.string('framework', 50); // tensorflow, pytorch, custom
    table.string('framework_version', 20);

    // Error Information
    table.text('error_message');
    table.text('error_stack');

    // Metadata
    table.jsonb('metadata');
    table.text('notes');
    table.uuid('triggered_by'); // User or system that triggered training

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('model_id');
    table.index('model_type');
    table.index('version');
    table.index('status');
    table.index(['model_type', 'status']);
    table.index('created_at');

    // Unique constraint
    table.unique(['model_type', 'version']);
  });

  // ML Models - currently deployed/active models
  await knex.schema.createTable('ml_models', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Model Identification
    table.string('model_id', 100).notNullable().unique();
    table.string('model_type', 50).notNullable();
    table.string('version', 50).notNullable();

    // Status
    table.enum('status', ['ACTIVE', 'INACTIVE', 'DEPRECATED', 'TESTING']).defaultTo('INACTIVE');
    table.boolean('is_production').defaultTo(false);

    // Model Storage
    table.string('model_path', 500).notNullable();
    table.jsonb('model_weights'); // For lightweight models stored in DB
    table.jsonb('model_config');

    // Performance Metrics
    table.jsonb('metrics');
    table.decimal('accuracy', 5, 4);
    table.decimal('precision_score', 5, 4);
    table.decimal('recall_score', 5, 4);
    table.decimal('f1_score', 5, 4);
    table.decimal('auc_roc', 5, 4);

    // Usage Statistics
    table.bigInteger('prediction_count').defaultTo(0);
    table.bigInteger('successful_predictions').defaultTo(0);
    table.bigInteger('failed_predictions').defaultTo(0);
    table.decimal('average_latency_ms', 10, 2);
    table.timestamp('last_prediction_at');

    // A/B Testing
    table.decimal('traffic_percentage', 5, 2).defaultTo(0); // Percentage of traffic
    table.uuid('ab_test_id');

    // Deployment
    table.timestamp('deployed_at');
    table.uuid('deployed_by');
    table.string('deployment_environment', 20);
    table.text('deployment_notes');

    // Rollback Information
    table.string('previous_version', 50);
    table.boolean('can_rollback').defaultTo(true);

    // Metadata
    table.jsonb('feature_importance'); // Which features matter most
    table.jsonb('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('model_type');
    table.index('status');
    table.index(['model_type', 'is_production']);
    table.index('deployed_at');

    // Only one active production model per type
    table.unique(['model_type', 'is_production'], {
      predicate: knex.where('is_production', true),
    });
  });

  // ML Feature Store - cached/computed features for fast inference
  await knex.schema.createTable('ml_feature_store', (table) => {
    // Primary Key
    table.uuid('feature_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Entity Information
    table.string('entity_type', 50).notNullable(); // user, transaction, account
    table.uuid('entity_id').notNullable();

    // Feature Set
    table.string('feature_set', 100).notNullable(); // credit_scoring, fraud_detection
    table.string('feature_version', 20).notNullable();

    // Feature Values
    table.jsonb('features').notNullable(); // All computed features
    table.jsonb('raw_data'); // Original data used for computation

    // Computation Info
    table.timestamp('computed_at').defaultTo(knex.fn.now());
    table.integer('computation_time_ms');
    table.boolean('is_stale').defaultTo(false);
    table.timestamp('expires_at');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('entity_type');
    table.index('entity_id');
    table.index('feature_set');
    table.index(['entity_type', 'entity_id', 'feature_set']);
    table.index('computed_at');
    table.index('expires_at');

    // Unique constraint
    table.unique(['entity_type', 'entity_id', 'feature_set', 'feature_version']);
  });

  // ML Predictions - log all predictions for monitoring and auditing
  await knex.schema.createTable('ml_predictions', (table) => {
    // Primary Key
    table.uuid('prediction_id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Model Information
    table.string('model_id', 100).notNullable();
    table.string('model_type', 50).notNullable();
    table.string('model_version', 50).notNullable();

    // Request Context
    table.uuid('user_id');
    table.uuid('transaction_id');
    table.string('request_id', 100);
    table.string('client_id', 100);

    // Input/Output
    table.jsonb('input_features');
    table.jsonb('prediction_result').notNullable();
    table.decimal('confidence', 5, 4);
    table.jsonb('probabilities'); // For classification

    // Performance
    table.integer('latency_ms');
    table.boolean('cache_hit').defaultTo(false);

    // Ground Truth (for model monitoring)
    table.jsonb('actual_outcome');
    table.boolean('prediction_correct');
    table.timestamp('outcome_recorded_at');

    // Metadata
    table.jsonb('metadata');

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('model_id');
    table.index('model_type');
    table.index('user_id');
    table.index('transaction_id');
    table.index('created_at');
    table.index(['model_type', 'created_at']);
    table.index('prediction_correct');
  });

  // Add triggers for updated_at
  await knex.raw(`
    CREATE TRIGGER update_ml_training_history_updated_at BEFORE UPDATE ON ml_training_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_ml_models_updated_at BEFORE UPDATE ON ml_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_ml_feature_store_updated_at BEFORE UPDATE ON ml_feature_store
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ml_predictions');
  await knex.schema.dropTableIfExists('ml_feature_store');
  await knex.schema.dropTableIfExists('ml_models');
  await knex.schema.dropTableIfExists('ml_training_history');
}
