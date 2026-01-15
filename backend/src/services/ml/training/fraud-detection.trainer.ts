/**
 * ReshADX - Fraud Detection Model Trainer
 * Trains binary classification model for real-time fraud detection
 */

import { promises as fs } from 'fs';
import { getDatabase } from '../../../database';
import { logger } from '../../../utils/logger';
import { TrainingConfig, TrainingMetrics } from './pipeline';

interface TrainingDataPoint {
  features: number[];
  label: number; // 0 = legitimate, 1 = fraud
}

interface PreparedData {
  trainingData: TrainingDataPoint[];
  validationData: TrainingDataPoint[];
  testData: TrainingDataPoint[];
}

interface FraudDetectionModel {
  type: 'random-forest';
  version: string;
  trees: RandomForestTree[];
  featureScaling: { mean: number[]; std: number[] };
  featureNames: string[];
  threshold: number; // Classification threshold
  numTrees: number;
  maxDepth: number;
  trainedAt: Date;
  classWeights: { negative: number; positive: number };
}

interface RandomForestTree {
  nodes: TreeNode[];
  featureSubset: number[]; // Indices of features used by this tree
}

interface TreeNode {
  featureIndex: number;
  threshold: number;
  leftChild: number;
  rightChild: number;
  isLeaf: boolean;
  classProbabilities?: [number, number]; // [P(legitimate), P(fraud)]
}

export class FraudDetectionTrainer {
  private config: TrainingConfig;
  private db = getDatabase();
  private featureNames: string[] = [
    // Transaction Features (12)
    'transaction_amount',
    'amount_deviation_from_avg',
    'is_round_amount',
    'hour_of_day',
    'day_of_week',
    'is_weekend',
    'transaction_frequency_1h',
    'transaction_frequency_24h',
    'unique_merchants_24h',
    'cumulative_amount_24h',
    'time_since_last_tx_minutes',
    'is_first_transaction',

    // Velocity Features (8)
    'velocity_1h',
    'velocity_6h',
    'velocity_24h',
    'amount_velocity_1h',
    'amount_velocity_24h',
    'distinct_locations_24h',
    'failed_attempts_1h',
    'card_not_present_ratio',

    // Device & Location Features (10)
    'is_new_device',
    'device_trust_score',
    'is_known_ip',
    'ip_risk_score',
    'geolocation_distance_km',
    'is_domestic',
    'is_high_risk_country',
    'location_consistency_score',
    'is_vpn_proxy',
    'is_tor_exit',

    // Behavioral Features (10)
    'behavioral_score',
    'typing_pattern_match',
    'session_duration_minutes',
    'page_interaction_score',
    'unusual_navigation_pattern',
    'time_to_transaction_seconds',
    'is_repeat_merchant',
    'merchant_category_match',
    'amount_category_match',
    'time_category_match',

    // Account Features (8)
    'account_age_days',
    'kyc_level',
    'historical_fraud_count',
    'historical_dispute_count',
    'days_since_password_change',
    'recent_profile_changes',
    'mfa_enabled',
    'account_tier',

    // Mobile Money Specific (6)
    'sim_swap_days',
    'is_same_sim_as_registration',
    'mobile_money_history_score',
    'momo_velocity_24h',
    'agent_transaction',
    'is_cash_out',
  ];

  constructor(config: TrainingConfig) {
    this.config = config;
  }

  /**
   * Prepare training data from database
   */
  async prepareData(): Promise<PreparedData> {
    logger.info('Preparing fraud detection training data');

    // Get labeled fraud checks
    const fraudChecks = await this.db('fraud_checks')
      .select('*')
      .whereIn('actual_outcome', ['LEGITIMATE', 'FRAUD_CONFIRMED'])
      .whereBetween('created_at', [this.config.dataRange.startDate, this.config.dataRange.endDate]);

    logger.info(`Found ${fraudChecks.length} labeled samples`);

    const dataPoints: TrainingDataPoint[] = [];
    let fraudCount = 0;
    let legitimateCount = 0;

    for (const check of fraudChecks) {
      try {
        const features = await this.extractFeatures(check);
        const label = check.actual_outcome === 'FRAUD_CONFIRMED' ? 1 : 0;

        dataPoints.push({ features, label });

        if (label === 1) fraudCount++;
        else legitimateCount++;
      } catch (error) {
        continue;
      }
    }

    logger.info(`Extracted ${dataPoints.length} samples (fraud: ${fraudCount}, legitimate: ${legitimateCount})`);

    // Handle class imbalance with SMOTE-like oversampling
    const balancedData = this.balanceClasses(dataPoints);

    // Shuffle data
    this.shuffleArray(balancedData);

    // Split data
    const validationSplit = this.config.validationSplit || 0.2;
    const testSplit = this.config.testSplit || 0.1;

    const testSize = Math.floor(balancedData.length * testSplit);
    const validationSize = Math.floor(balancedData.length * validationSplit);
    const trainingSize = balancedData.length - testSize - validationSize;

    return {
      trainingData: balancedData.slice(0, trainingSize),
      validationData: balancedData.slice(trainingSize, trainingSize + validationSize),
      testData: balancedData.slice(trainingSize + validationSize),
    };
  }

  /**
   * Extract features from fraud check record
   */
  private async extractFeatures(check: any): Promise<number[]> {
    const txFeatures = await this.extractTransactionFeatures(check);
    const velocityFeatures = await this.extractVelocityFeatures(check);
    const deviceFeatures = await this.extractDeviceFeatures(check);
    const behavioralFeatures = this.extractBehavioralFeatures(check);
    const accountFeatures = await this.extractAccountFeatures(check);
    const mobileMoneyFeatures = await this.extractMobileMoneyFeatures(check);

    return [
      ...txFeatures,
      ...velocityFeatures,
      ...deviceFeatures,
      ...behavioralFeatures,
      ...accountFeatures,
      ...mobileMoneyFeatures,
    ];
  }

  private async extractTransactionFeatures(check: any): Promise<number[]> {
    const checkResults = check.check_results || {};
    const metadata = check.metadata || {};

    // Get user's historical transactions
    let avgAmount = 100;
    let txCount24h = 0;
    let uniqueMerchants = 0;
    let cumAmount24h = 0;
    let timeSinceLastTx = 60;

    if (check.user_id) {
      const userTx = await this.db('transactions')
        .where('user_id', check.user_id)
        .orderBy('created_at', 'desc')
        .limit(100);

      if (userTx.length > 0) {
        avgAmount = userTx.reduce((sum, t) => sum + Math.abs(t.amount), 0) / userTx.length;

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = userTx.filter(t => new Date(t.created_at) > oneDayAgo);
        txCount24h = recent.length;
        uniqueMerchants = new Set(recent.map(t => t.merchant_name)).size;
        cumAmount24h = recent.reduce((sum, t) => sum + Math.abs(t.amount), 0);

        if (userTx.length > 1) {
          timeSinceLastTx = (Date.now() - new Date(userTx[1].created_at).getTime()) / 60000;
        }
      }
    }

    const amount = metadata.amount || 0;
    const createdAt = new Date(check.created_at);
    const hour = createdAt.getHours();
    const dayOfWeek = createdAt.getDay();

    return [
      amount,
      avgAmount > 0 ? (amount - avgAmount) / avgAmount : 0,
      amount % 100 === 0 ? 1 : 0, // Round amount
      hour,
      dayOfWeek,
      dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0, // Weekend
      checkResults.velocity?.count_1h || 0,
      txCount24h,
      uniqueMerchants,
      cumAmount24h,
      timeSinceLastTx,
      txCount24h === 0 ? 1 : 0, // First transaction
    ];
  }

  private async extractVelocityFeatures(check: any): Promise<number[]> {
    const checkResults = check.check_results || {};
    const velocityData = checkResults.velocity || {};

    return [
      velocityData.count_1h || 0,
      velocityData.count_6h || 0,
      velocityData.count_24h || 0,
      velocityData.amount_1h || 0,
      velocityData.amount_24h || 0,
      velocityData.locations_24h || 1,
      velocityData.failed_1h || 0,
      velocityData.card_not_present_ratio || 0,
    ];
  }

  private async extractDeviceFeatures(check: any): Promise<number[]> {
    const checkResults = check.check_results || {};
    const deviceData = checkResults.device || {};
    const geoData = checkResults.geolocation || {};

    let deviceTrustScore = 50;
    let isKnownDevice = 0;

    if (check.user_id && check.device_id) {
      const device = await this.db('user_devices')
        .where({ user_id: check.user_id, fingerprint_hash: check.device_id })
        .first();

      if (device) {
        isKnownDevice = 1;
        deviceTrustScore = device.trust_status === 'TRUSTED' ? 90 :
          device.trust_status === 'SUSPICIOUS' ? 20 : 50;
      }
    }

    return [
      isKnownDevice === 0 ? 1 : 0, // New device
      deviceTrustScore,
      deviceData.is_known_ip ? 1 : 0,
      deviceData.ip_risk_score || 30,
      geoData.distance_km || 0,
      geoData.is_domestic !== false ? 1 : 0,
      geoData.is_high_risk_country ? 1 : 0,
      geoData.consistency_score || 70,
      deviceData.is_vpn ? 1 : 0,
      deviceData.is_tor ? 1 : 0,
    ];
  }

  private extractBehavioralFeatures(check: any): number[] {
    const checkResults = check.check_results || {};
    const behaviorData = checkResults.behavior || {};

    return [
      behaviorData.score || 70,
      behaviorData.typing_match || 0.8,
      behaviorData.session_duration || 5,
      behaviorData.interaction_score || 70,
      behaviorData.unusual_navigation ? 1 : 0,
      behaviorData.time_to_transaction || 120,
      behaviorData.is_repeat_merchant ? 1 : 0,
      behaviorData.merchant_match || 0.5,
      behaviorData.amount_match || 0.5,
      behaviorData.time_match || 0.5,
    ];
  }

  private async extractAccountFeatures(check: any): Promise<number[]> {
    let accountAgeDays = 30;
    let kycLevel = 1;
    let fraudCount = 0;
    let disputeCount = 0;
    let daysSincePasswordChange = 30;
    let recentProfileChanges = 0;
    let mfaEnabled = 0;
    let accountTier = 1;

    if (check.user_id) {
      const user = await this.db('users').where('user_id', check.user_id).first();

      if (user) {
        accountAgeDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
        kycLevel = user.kyc_level === 'TIER_3' ? 3 : user.kyc_level === 'TIER_2' ? 2 : 1;
        mfaEnabled = user.mfa_enabled ? 1 : 0;
        accountTier = ['FREE', 'STARTUP', 'GROWTH', 'BUSINESS', 'ENTERPRISE'].indexOf(user.account_tier) + 1;
      }

      // Count historical fraud
      fraudCount = await this.db('fraud_alerts')
        .where('user_id', check.user_id)
        .where('resolution', 'FRAUD_CONFIRMED')
        .count('* as count')
        .first()
        .then(r => r?.count || 0);
    }

    return [
      accountAgeDays,
      kycLevel,
      fraudCount,
      disputeCount,
      daysSincePasswordChange,
      recentProfileChanges,
      mfaEnabled,
      accountTier,
    ];
  }

  private async extractMobileMoneyFeatures(check: any): Promise<number[]> {
    const checkResults = check.check_results || {};
    const momoData = checkResults.mobile_money || {};

    let simSwapDays = 365;
    let sameSim = 1;

    if (check.user_id) {
      const session = await this.db('sessions')
        .where('user_id', check.user_id)
        .orderBy('created_at', 'desc')
        .first();

      if (session?.sim_serial) {
        // Check SIM swap
        const firstSession = await this.db('sessions')
          .where('user_id', check.user_id)
          .orderBy('created_at', 'asc')
          .first();

        sameSim = firstSession?.sim_serial === session.sim_serial ? 1 : 0;
      }
    }

    return [
      momoData.sim_swap_days || simSwapDays,
      sameSim,
      momoData.history_score || 70,
      momoData.velocity_24h || 0,
      momoData.is_agent ? 1 : 0,
      momoData.is_cash_out ? 1 : 0,
    ];
  }

  /**
   * Balance classes using SMOTE-like oversampling
   */
  private balanceClasses(data: TrainingDataPoint[]): TrainingDataPoint[] {
    const fraudSamples = data.filter(d => d.label === 1);
    const legitimateSamples = data.filter(d => d.label === 0);

    // Oversample minority class (fraud)
    const targetCount = Math.floor(legitimateSamples.length * 0.3); // 30% fraud rate
    const oversampledFraud: TrainingDataPoint[] = [];

    while (oversampledFraud.length < targetCount) {
      for (const sample of fraudSamples) {
        if (oversampledFraud.length >= targetCount) break;

        // Create synthetic sample with slight noise
        const synthetic: TrainingDataPoint = {
          features: sample.features.map(f => f + (Math.random() - 0.5) * 0.1 * Math.abs(f)),
          label: 1,
        };
        oversampledFraud.push(synthetic);
      }
    }

    return [...legitimateSamples, ...fraudSamples, ...oversampledFraud];
  }

  /**
   * Train random forest model
   */
  async train(trainingData: TrainingDataPoint[]): Promise<FraudDetectionModel> {
    logger.info('Training fraud detection model', { samples: trainingData.length });

    // Feature scaling
    const { scaledData, featureScaling } = this.scaleFeatures(trainingData);

    // Calculate class weights for imbalanced data
    const fraudCount = trainingData.filter(d => d.label === 1).length;
    const legitimateCount = trainingData.filter(d => d.label === 0).length;
    const classWeights = {
      negative: trainingData.length / (2 * legitimateCount),
      positive: trainingData.length / (2 * fraudCount),
    };

    // Initialize model parameters
    const numTrees = this.config.hyperparameters?.numTrees || 100;
    const maxDepth = this.config.hyperparameters?.maxDepth || 10;
    const maxFeatures = Math.floor(Math.sqrt(this.featureNames.length));

    const trees: RandomForestTree[] = [];

    // Build trees
    for (let i = 0; i < numTrees; i++) {
      // Bootstrap sample
      const bootstrapData = this.bootstrapSample(scaledData);

      // Random feature subset
      const featureSubset = this.randomFeatureSubset(maxFeatures);

      // Build tree
      const tree = this.buildTree(bootstrapData, featureSubset, maxDepth, classWeights);
      trees.push({ nodes: tree, featureSubset });

      if ((i + 1) % 20 === 0) {
        logger.info(`Built ${i + 1}/${numTrees} trees`);
      }
    }

    // Find optimal threshold
    const threshold = this.findOptimalThreshold(trees, scaledData, featureScaling);

    return {
      type: 'random-forest',
      version: this.config.version,
      trees,
      featureScaling,
      featureNames: this.featureNames,
      threshold,
      numTrees,
      maxDepth,
      trainedAt: new Date(),
      classWeights,
    };
  }

  /**
   * Validate model
   */
  async validate(model: FraudDetectionModel, validationData: TrainingDataPoint[]): Promise<TrainingMetrics> {
    const predictions = validationData.map(point => this.predict(model, point.features));
    const actuals = validationData.map(point => point.label);

    return this.calculateMetrics(predictions, actuals, model.threshold);
  }

  /**
   * Test model
   */
  async test(model: FraudDetectionModel, testData: TrainingDataPoint[]): Promise<TrainingMetrics> {
    const predictions = testData.map(point => this.predict(model, point.features));
    const actuals = testData.map(point => point.label);

    return this.calculateMetrics(predictions, actuals, model.threshold);
  }

  /**
   * Make prediction
   */
  private predict(model: FraudDetectionModel, features: number[]): number {
    // Scale features
    const scaledFeatures = features.map((f, i) =>
      (f - model.featureScaling.mean[i]) / (model.featureScaling.std[i] || 1)
    );

    // Aggregate predictions from all trees
    let fraudVotes = 0;
    let totalVotes = 0;

    for (const tree of model.trees) {
      const [probLegit, probFraud] = this.predictTree(tree, scaledFeatures);
      fraudVotes += probFraud;
      totalVotes += 1;
    }

    return fraudVotes / totalVotes;
  }

  private predictTree(tree: RandomForestTree, features: number[]): [number, number] {
    let nodeIndex = 0;
    const nodes = tree.nodes;

    while (!nodes[nodeIndex].isLeaf) {
      const node = nodes[nodeIndex];
      const featureValue = features[tree.featureSubset[node.featureIndex]];

      if (featureValue <= node.threshold) {
        nodeIndex = node.leftChild;
      } else {
        nodeIndex = node.rightChild;
      }
    }

    return nodes[nodeIndex].classProbabilities || [0.5, 0.5];
  }

  /**
   * Save model
   */
  async saveModel(model: FraudDetectionModel, modelPath: string): Promise<void> {
    await fs.writeFile(modelPath, JSON.stringify(model, null, 2));
    logger.info('Fraud detection model saved', { modelPath });
  }

  // Helper methods
  private buildTree(
    data: TrainingDataPoint[],
    featureSubset: number[],
    maxDepth: number,
    classWeights: { negative: number; positive: number }
  ): TreeNode[] {
    const nodes: TreeNode[] = [];
    this.buildNode(data, featureSubset, nodes, maxDepth, 0, classWeights);
    return nodes;
  }

  private buildNode(
    data: TrainingDataPoint[],
    featureSubset: number[],
    nodes: TreeNode[],
    maxDepth: number,
    depth: number,
    classWeights: { negative: number; positive: number }
  ): number {
    const nodeIndex = nodes.length;

    // Check stopping conditions
    const fraudCount = data.filter(d => d.label === 1).length;
    const legitimateCount = data.length - fraudCount;

    if (depth >= maxDepth || data.length < 10 || fraudCount === 0 || legitimateCount === 0) {
      // Leaf node
      const totalWeight = fraudCount * classWeights.positive + legitimateCount * classWeights.negative;
      const probFraud = (fraudCount * classWeights.positive) / totalWeight;

      nodes.push({
        featureIndex: -1,
        threshold: 0,
        leftChild: -1,
        rightChild: -1,
        isLeaf: true,
        classProbabilities: [1 - probFraud, probFraud],
      });
      return nodeIndex;
    }

    // Find best split
    const { featureIndex, threshold, gain } = this.findBestSplit(data, featureSubset, classWeights);

    if (gain <= 0) {
      // No improvement, create leaf
      const totalWeight = fraudCount * classWeights.positive + legitimateCount * classWeights.negative;
      const probFraud = (fraudCount * classWeights.positive) / totalWeight;

      nodes.push({
        featureIndex: -1,
        threshold: 0,
        leftChild: -1,
        rightChild: -1,
        isLeaf: true,
        classProbabilities: [1 - probFraud, probFraud],
      });
      return nodeIndex;
    }

    // Create internal node
    nodes.push({
      featureIndex,
      threshold,
      leftChild: -1,
      rightChild: -1,
      isLeaf: false,
    });

    // Split data
    const leftData = data.filter(d => d.features[featureSubset[featureIndex]] <= threshold);
    const rightData = data.filter(d => d.features[featureSubset[featureIndex]] > threshold);

    // Build children
    nodes[nodeIndex].leftChild = this.buildNode(leftData, featureSubset, nodes, maxDepth, depth + 1, classWeights);
    nodes[nodeIndex].rightChild = this.buildNode(rightData, featureSubset, nodes, maxDepth, depth + 1, classWeights);

    return nodeIndex;
  }

  private findBestSplit(
    data: TrainingDataPoint[],
    featureSubset: number[],
    classWeights: { negative: number; positive: number }
  ): { featureIndex: number; threshold: number; gain: number } {
    let bestGain = -Infinity;
    let bestFeature = 0;
    let bestThreshold = 0;

    const parentGini = this.weightedGini(data, classWeights);

    for (let f = 0; f < featureSubset.length; f++) {
      const realFeatureIndex = featureSubset[f];
      const values = [...new Set(data.map(d => d.features[realFeatureIndex]))].sort((a, b) => a - b);

      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;

        const leftData = data.filter(d => d.features[realFeatureIndex] <= threshold);
        const rightData = data.filter(d => d.features[realFeatureIndex] > threshold);

        if (leftData.length < 5 || rightData.length < 5) continue;

        const leftGini = this.weightedGini(leftData, classWeights);
        const rightGini = this.weightedGini(rightData, classWeights);

        const weightedGini =
          (leftData.length / data.length) * leftGini +
          (rightData.length / data.length) * rightGini;

        const gain = parentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    return { featureIndex: bestFeature, threshold: bestThreshold, gain: bestGain };
  }

  private weightedGini(data: TrainingDataPoint[], classWeights: { negative: number; positive: number }): number {
    const fraudCount = data.filter(d => d.label === 1).length;
    const legitimateCount = data.length - fraudCount;

    const totalWeight = fraudCount * classWeights.positive + legitimateCount * classWeights.negative;
    const pFraud = (fraudCount * classWeights.positive) / totalWeight;
    const pLegit = (legitimateCount * classWeights.negative) / totalWeight;

    return 1 - (pFraud * pFraud + pLegit * pLegit);
  }

  private findOptimalThreshold(
    trees: RandomForestTree[],
    data: TrainingDataPoint[],
    featureScaling: { mean: number[]; std: number[] }
  ): number {
    // Test different thresholds and find best F1 score
    const predictions = data.map(d => {
      const scaled = d.features.map((f, i) => (f - featureScaling.mean[i]) / (featureScaling.std[i] || 1));
      let fraudVotes = 0;
      for (const tree of trees) {
        const [, probFraud] = this.predictTree(tree, scaled);
        fraudVotes += probFraud;
      }
      return fraudVotes / trees.length;
    });

    const actuals = data.map(d => d.label);

    let bestThreshold = 0.5;
    let bestF1 = 0;

    for (let t = 0.1; t <= 0.9; t += 0.05) {
      const binaryPreds = predictions.map(p => p >= t ? 1 : 0);

      const tp = binaryPreds.filter((p, i) => p === 1 && actuals[i] === 1).length;
      const fp = binaryPreds.filter((p, i) => p === 1 && actuals[i] === 0).length;
      const fn = binaryPreds.filter((p, i) => p === 0 && actuals[i] === 1).length;

      const precision = tp / (tp + fp) || 0;
      const recall = tp / (tp + fn) || 0;
      const f1 = 2 * (precision * recall) / (precision + recall) || 0;

      if (f1 > bestF1) {
        bestF1 = f1;
        bestThreshold = t;
      }
    }

    return bestThreshold;
  }

  private scaleFeatures(data: TrainingDataPoint[]): {
    scaledData: TrainingDataPoint[];
    featureScaling: { mean: number[]; std: number[] };
  } {
    const numFeatures = data[0].features.length;
    const mean: number[] = [];
    const std: number[] = [];

    for (let i = 0; i < numFeatures; i++) {
      const values = data.map(d => d.features[i]);
      mean.push(values.reduce((a, b) => a + b, 0) / values.length);
      std.push(this.standardDeviation(values) || 1);
    }

    const scaledData = data.map(d => ({
      features: d.features.map((f, i) => (f - mean[i]) / std[i]),
      label: d.label,
    }));

    return { scaledData, featureScaling: { mean, std } };
  }

  private calculateMetrics(predictions: number[], actuals: number[], threshold: number): TrainingMetrics {
    const binaryPreds = predictions.map(p => p >= threshold ? 1 : 0);

    const tp = binaryPreds.filter((p, i) => p === 1 && actuals[i] === 1).length;
    const tn = binaryPreds.filter((p, i) => p === 0 && actuals[i] === 0).length;
    const fp = binaryPreds.filter((p, i) => p === 1 && actuals[i] === 0).length;
    const fn = binaryPreds.filter((p, i) => p === 0 && actuals[i] === 1).length;

    const accuracy = (tp + tn) / actuals.length;
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    // AUC-ROC approximation
    const auc = this.calculateAUC(predictions, actuals);

    return { accuracy, precision, recall, f1Score, auc };
  }

  private calculateAUC(predictions: number[], actuals: number[]): number {
    // Simple trapezoidal AUC calculation
    const sorted = predictions
      .map((p, i) => ({ pred: p, actual: actuals[i] }))
      .sort((a, b) => b.pred - a.pred);

    let auc = 0;
    let tpSum = 0;
    let fpSum = 0;
    const totalPositive = actuals.filter(a => a === 1).length;
    const totalNegative = actuals.length - totalPositive;

    for (const item of sorted) {
      if (item.actual === 1) {
        tpSum++;
      } else {
        auc += tpSum / totalPositive;
        fpSum++;
      }
    }

    return totalNegative > 0 ? auc / totalNegative : 0;
  }

  private standardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private bootstrapSample(data: TrainingDataPoint[]): TrainingDataPoint[] {
    const sample: TrainingDataPoint[] = [];
    for (let i = 0; i < data.length; i++) {
      sample.push(data[Math.floor(Math.random() * data.length)]);
    }
    return sample;
  }

  private randomFeatureSubset(count: number): number[] {
    const indices = Array.from({ length: this.featureNames.length }, (_, i) => i);
    this.shuffleArray(indices);
    return indices.slice(0, count);
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
