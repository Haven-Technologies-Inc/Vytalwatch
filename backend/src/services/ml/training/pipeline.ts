/**
 * ReshADX - ML Model Training Pipeline
 * Automated training pipeline for credit scoring, fraud detection, and categorization models
 */

import { promises as fs } from 'fs';
import path from 'path';
import { db } from '../../../config/database';
import { logger } from '../../../utils/logger';
import { CreditScoringTrainer } from './credit-scoring.trainer';
import { FraudDetectionTrainer } from './fraud-detection.trainer';
import { CategorizationTrainer } from './categorization.trainer';

export interface TrainingConfig {
  modelType: 'credit-scoring' | 'fraud-detection' | 'categorization';
  version: string;
  dataRange: {
    startDate: string;
    endDate: string;
  };
  hyperparameters?: Record<string, any>;
  validationSplit?: number;
  testSplit?: number;
}

export interface TrainingMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  mse?: number;
  mae?: number;
  r2?: number;
}

export interface TrainingResult {
  modelId: string;
  modelType: string;
  version: string;
  status: 'SUCCESS' | 'FAILED';
  metrics: TrainingMetrics;
  trainingDuration: number;
  sampleCount: number;
  modelPath: string;
  createdAt: Date;
  error?: string;
}

export class MLTrainingPipeline {
  private modelStoragePath: string;

  constructor() {
    this.modelStoragePath = path.join(__dirname, '../../../../models');
  }

  /**
   * Run complete training pipeline for a specific model
   */
  async trainModel(config: TrainingConfig): Promise<TrainingResult> {
    const startTime = Date.now();

    logger.info('Starting ML training pipeline', {
      modelType: config.modelType,
      version: config.version,
    });

    try {
      // Ensure model storage directory exists
      await fs.mkdir(this.modelStoragePath, { recursive: true });

      // Select trainer based on model type
      let trainer: any;
      switch (config.modelType) {
        case 'credit-scoring':
          trainer = new CreditScoringTrainer(config);
          break;
        case 'fraud-detection':
          trainer = new FraudDetectionTrainer(config);
          break;
        case 'categorization':
          trainer = new CategorizationTrainer(config);
          break;
        default:
          throw new Error(`Unknown model type: ${config.modelType}`);
      }

      // Step 1: Prepare training data
      logger.info('Preparing training data', { modelType: config.modelType });
      const { trainingData, validationData, testData } = await trainer.prepareData();

      logger.info('Data preparation complete', {
        trainingSamples: trainingData.length,
        validationSamples: validationData.length,
        testSamples: testData.length,
      });

      // Step 2: Train model
      logger.info('Training model', { modelType: config.modelType });
      const model = await trainer.train(trainingData);

      // Step 3: Validate model
      logger.info('Validating model', { modelType: config.modelType });
      const validationMetrics = await trainer.validate(model, validationData);

      logger.info('Validation metrics', validationMetrics);

      // Step 4: Test model
      logger.info('Testing model', { modelType: config.modelType });
      const testMetrics = await trainer.test(model, testData);

      logger.info('Test metrics', testMetrics);

      // Step 5: Save model
      const modelPath = path.join(
        this.modelStoragePath,
        `${config.modelType}-v${config.version}.json`
      );

      await trainer.saveModel(model, modelPath);

      logger.info('Model saved', { modelPath });

      // Step 6: Record training result
      const trainingDuration = Date.now() - startTime;
      const result: TrainingResult = {
        modelId: `${config.modelType}-v${config.version}`,
        modelType: config.modelType,
        version: config.version,
        status: 'SUCCESS',
        metrics: testMetrics,
        trainingDuration,
        sampleCount: trainingData.length,
        modelPath,
        createdAt: new Date(),
      };

      await this.recordTrainingResult(result);

      logger.info('Training pipeline completed successfully', {
        modelId: result.modelId,
        duration: trainingDuration,
        metrics: result.metrics,
      });

      return result;

    } catch (error: any) {
      const trainingDuration = Date.now() - startTime;

      logger.error('Training pipeline failed', {
        modelType: config.modelType,
        error: error.message,
        stack: error.stack,
      });

      const result: TrainingResult = {
        modelId: `${config.modelType}-v${config.version}`,
        modelType: config.modelType,
        version: config.version,
        status: 'FAILED',
        metrics: {},
        trainingDuration,
        sampleCount: 0,
        modelPath: '',
        createdAt: new Date(),
        error: error.message,
      };

      await this.recordTrainingResult(result);

      throw error;
    }
  }

  /**
   * Train all models
   */
  async trainAllModels(version: string, dataRange: { startDate: string; endDate: string }): Promise<TrainingResult[]> {
    logger.info('Training all models', { version, dataRange });

    const results: TrainingResult[] = [];

    // Train credit scoring model
    try {
      const creditResult = await this.trainModel({
        modelType: 'credit-scoring',
        version,
        dataRange,
        validationSplit: 0.2,
        testSplit: 0.1,
      });
      results.push(creditResult);
    } catch (error) {
      logger.error('Credit scoring model training failed', { error });
    }

    // Train fraud detection model
    try {
      const fraudResult = await this.trainModel({
        modelType: 'fraud-detection',
        version,
        dataRange,
        validationSplit: 0.2,
        testSplit: 0.1,
      });
      results.push(fraudResult);
    } catch (error) {
      logger.error('Fraud detection model training failed', { error });
    }

    // Train categorization model
    try {
      const categorizationResult = await this.trainModel({
        modelType: 'categorization',
        version,
        dataRange,
        validationSplit: 0.2,
        testSplit: 0.1,
      });
      results.push(categorizationResult);
    } catch (error) {
      logger.error('Categorization model training failed', { error });
    }

    logger.info('All models training completed', {
      successCount: results.filter(r => r.status === 'SUCCESS').length,
      failedCount: results.filter(r => r.status === 'FAILED').length,
    });

    return results;
  }

  /**
   * Schedule automated model retraining
   */
  async scheduleRetraining(
    cronExpression: string = '0 2 * * 0' // Default: 2 AM every Sunday
  ): Promise<void> {
    logger.info('Scheduling automated retraining', { cronExpression });

    // This would use node-cron or a job scheduler like Bull
    // For now, we'll just log the schedule

    // Example implementation with node-cron:
    // const cron = require('node-cron');
    // cron.schedule(cronExpression, async () => {
    //   const version = `auto-${Date.now()}`;
    //   const endDate = new Date().toISOString().split('T')[0];
    //   const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    //
    //   await this.trainAllModels(version, { startDate, endDate });
    // });

    logger.info('Automated retraining scheduled');
  }

  /**
   * Record training result to database
   */
  private async recordTrainingResult(result: TrainingResult): Promise<void> {
    try {
      await db('ml_training_history').insert({
        model_id: result.modelId,
        model_type: result.modelType,
        version: result.version,
        status: result.status,
        metrics: JSON.stringify(result.metrics),
        training_duration: result.trainingDuration,
        sample_count: result.sampleCount,
        model_path: result.modelPath,
        error_message: result.error,
        created_at: result.createdAt,
      });

      logger.info('Training result recorded', { modelId: result.modelId });
    } catch (error: any) {
      logger.error('Failed to record training result', {
        modelId: result.modelId,
        error: error.message,
      });
    }
  }

  /**
   * Get training history
   */
  async getTrainingHistory(
    modelType?: string,
    limit: number = 10
  ): Promise<any[]> {
    const query = db('ml_training_history')
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (modelType) {
      query.where('model_type', modelType);
    }

    const history = await query;

    return history.map(record => ({
      ...record,
      metrics: JSON.parse(record.metrics),
    }));
  }

  /**
   * Compare model versions
   */
  async compareModels(version1: string, version2: string, modelType: string): Promise<any> {
    const model1 = await db('ml_training_history')
      .where({ version: version1, model_type: modelType })
      .first();

    const model2 = await db('ml_training_history')
      .where({ version: version2, model_type: modelType })
      .first();

    if (!model1 || !model2) {
      throw new Error('One or both model versions not found');
    }

    const metrics1 = JSON.parse(model1.metrics);
    const metrics2 = JSON.parse(model2.metrics);

    return {
      model1: {
        version: version1,
        metrics: metrics1,
        trainingDuration: model1.training_duration,
        sampleCount: model1.sample_count,
      },
      model2: {
        version: version2,
        metrics: metrics2,
        trainingDuration: model2.training_duration,
        sampleCount: model2.sample_count,
      },
      improvements: this.calculateImprovements(metrics1, metrics2),
    };
  }

  /**
   * Calculate metric improvements between versions
   */
  private calculateImprovements(metrics1: TrainingMetrics, metrics2: TrainingMetrics): Record<string, number> {
    const improvements: Record<string, number> = {};

    for (const key of Object.keys(metrics2)) {
      if (metrics1[key as keyof TrainingMetrics] !== undefined) {
        const val1 = metrics1[key as keyof TrainingMetrics]!;
        const val2 = metrics2[key as keyof TrainingMetrics]!;
        improvements[key] = ((val2 - val1) / val1) * 100;
      }
    }

    return improvements;
  }

  /**
   * Deploy model to production
   */
  async deployModel(modelId: string): Promise<void> {
    logger.info('Deploying model to production', { modelId });

    const model = await db('ml_training_history')
      .where({ model_id: modelId, status: 'SUCCESS' })
      .first();

    if (!model) {
      throw new Error(`Model not found or not successful: ${modelId}`);
    }

    // Mark as production
    await db('ml_models').insert({
      model_id: modelId,
      model_type: model.model_type,
      version: model.version,
      model_path: model.model_path,
      metrics: model.metrics,
      status: 'ACTIVE',
      deployed_at: new Date(),
    }).onConflict('model_type').merge();

    logger.info('Model deployed successfully', { modelId });
  }
}
