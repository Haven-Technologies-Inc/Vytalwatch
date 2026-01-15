/**
 * ReshADX - Credit Scoring Model Trainer
 * Trains credit scoring models using gradient boosting on transaction and account data
 */

import { promises as fs } from 'fs';
import { getDatabase } from '../../../database';
import { logger } from '../../../utils/logger';
import { TrainingConfig, TrainingMetrics } from './pipeline';

interface TrainingDataPoint {
  features: number[];
  label: number; // Credit score 300-850
}

interface PreparedData {
  trainingData: TrainingDataPoint[];
  validationData: TrainingDataPoint[];
  testData: TrainingDataPoint[];
}

interface CreditScoringModel {
  type: 'gradient-boosting';
  version: string;
  weights: number[];
  biases: number[];
  featureScaling: { mean: number[]; std: number[] };
  featureNames: string[];
  treeEnsemble: DecisionTree[];
  numTrees: number;
  learningRate: number;
  maxDepth: number;
  trainedAt: Date;
}

interface DecisionTree {
  nodes: TreeNode[];
  leafValues: number[];
}

interface TreeNode {
  featureIndex: number;
  threshold: number;
  leftChild: number;
  rightChild: number;
  isLeaf: boolean;
  value?: number;
}

export class CreditScoringTrainer {
  private config: TrainingConfig;
  private db = getDatabase();
  private featureNames: string[] = [
    // Traditional Features (15)
    'avg_monthly_balance',
    'balance_volatility',
    'num_accounts',
    'account_age_days',
    'overdraft_count',
    'avg_transaction_amount',
    'transaction_frequency',
    'income_regularity_score',
    'expense_ratio',
    'savings_rate',
    'loan_payment_timeliness',
    'credit_utilization',
    'num_active_loans',
    'debt_to_income_ratio',
    'num_late_payments',

    // Alternative Data Features (15)
    'mobile_money_frequency',
    'mobile_money_volume',
    'airtime_purchase_regularity',
    'utility_payment_consistency',
    'bill_payment_timeliness',
    'digital_wallet_usage',
    'p2p_transfer_network_score',
    'merchant_diversity_score',
    'recurring_payment_count',
    'income_source_diversity',
    'employment_stability_score',
    'location_stability_score',
    'device_trust_score',
    'social_connection_score',
    'behavioral_consistency_score',
  ];

  constructor(config: TrainingConfig) {
    this.config = config;
  }

  /**
   * Prepare training data from database
   */
  async prepareData(): Promise<PreparedData> {
    logger.info('Preparing credit scoring training data');

    // Fetch users with credit history
    const users = await this.db('users')
      .select('user_id')
      .whereNotNull('kyc_completed_at')
      .whereBetween('created_at', [this.config.dataRange.startDate, this.config.dataRange.endDate]);

    logger.info(`Found ${users.length} users for training`);

    const dataPoints: TrainingDataPoint[] = [];

    for (const user of users) {
      try {
        const features = await this.extractFeatures(user.user_id);
        const label = await this.getHistoricalCreditScore(user.user_id);

        if (features && label) {
          dataPoints.push({ features, label });
        }
      } catch (error) {
        // Skip users with incomplete data
        continue;
      }
    }

    logger.info(`Extracted ${dataPoints.length} valid training samples`);

    // Shuffle data
    this.shuffleArray(dataPoints);

    // Split data
    const validationSplit = this.config.validationSplit || 0.2;
    const testSplit = this.config.testSplit || 0.1;

    const testSize = Math.floor(dataPoints.length * testSplit);
    const validationSize = Math.floor(dataPoints.length * validationSplit);
    const trainingSize = dataPoints.length - testSize - validationSize;

    return {
      trainingData: dataPoints.slice(0, trainingSize),
      validationData: dataPoints.slice(trainingSize, trainingSize + validationSize),
      testData: dataPoints.slice(trainingSize + validationSize),
    };
  }

  /**
   * Extract features for a user
   */
  private async extractFeatures(userId: string): Promise<number[]> {
    // Get user accounts
    const accounts = await this.db('accounts')
      .where('user_id', userId)
      .whereNull('deleted_at');

    // Get recent transactions (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const transactions = await this.db('transactions')
      .whereIn('account_id', accounts.map(a => a.account_id))
      .where('created_at', '>=', ninetyDaysAgo.toISOString());

    // Calculate traditional features
    const traditionalFeatures = this.calculateTraditionalFeatures(accounts, transactions);

    // Calculate alternative data features
    const alternativeFeatures = await this.calculateAlternativeFeatures(userId, transactions);

    return [...traditionalFeatures, ...alternativeFeatures];
  }

  /**
   * Calculate traditional credit features
   */
  private calculateTraditionalFeatures(accounts: any[], transactions: any[]): number[] {
    // Average monthly balance
    const avgBalance = accounts.length > 0
      ? accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0) / accounts.length
      : 0;

    // Balance volatility (std dev of balances)
    const balanceStd = this.standardDeviation(accounts.map(a => a.current_balance || 0));

    // Number of accounts
    const numAccounts = accounts.length;

    // Oldest account age in days
    const accountAgeDays = accounts.length > 0
      ? Math.max(...accounts.map(a => this.daysBetween(new Date(a.created_at), new Date())))
      : 0;

    // Overdraft count
    const overdraftCount = transactions.filter(t =>
      t.amount < 0 && t.category === 'OVERDRAFT_FEE'
    ).length;

    // Average transaction amount
    const avgTxAmount = transactions.length > 0
      ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length
      : 0;

    // Transaction frequency (per month)
    const txFrequency = transactions.length / 3; // 90 days = 3 months

    // Income regularity score (0-100)
    const incomeRegularity = this.calculateIncomeRegularity(transactions);

    // Expense ratio (expenses / income)
    const { income, expenses } = this.calculateIncomeExpenses(transactions);
    const expenseRatio = income > 0 ? expenses / income : 1;

    // Savings rate
    const savingsRate = income > 0 ? Math.max(0, (income - expenses) / income) : 0;

    // Loan payment timeliness (0-100)
    const loanTimeliness = this.calculateLoanTimeliness(transactions);

    // Credit utilization (0-1)
    const creditUtilization = this.calculateCreditUtilization(accounts);

    // Number of active loans
    const activeLoans = accounts.filter(a => a.type === 'LOAN' && a.status === 'ACTIVE').length;

    // Debt to income ratio
    const totalDebt = accounts
      .filter(a => a.type === 'LOAN' || a.type === 'CREDIT')
      .reduce((sum, a) => sum + (a.current_balance || 0), 0);
    const debtToIncomeRatio = income > 0 ? totalDebt / (income * 12) : 1;

    // Late payment count
    const latePayments = transactions.filter(t => t.is_late_payment).length;

    return [
      avgBalance,
      balanceStd,
      numAccounts,
      accountAgeDays,
      overdraftCount,
      avgTxAmount,
      txFrequency,
      incomeRegularity,
      expenseRatio,
      savingsRate,
      loanTimeliness,
      creditUtilization,
      activeLoans,
      debtToIncomeRatio,
      latePayments,
    ];
  }

  /**
   * Calculate alternative data features (African-specific)
   */
  private async calculateAlternativeFeatures(userId: string, transactions: any[]): Promise<number[]> {
    // Mobile money transactions
    const mmTransactions = transactions.filter(t =>
      t.payment_channel === 'MOBILE_MONEY' || t.category?.includes('MOBILE')
    );
    const mmFrequency = mmTransactions.length / 3;
    const mmVolume = mmTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Airtime purchase regularity
    const airtimeTx = transactions.filter(t => t.category === 'AIRTIME');
    const airtimeRegularity = this.calculateRegularityScore(airtimeTx);

    // Utility payment consistency
    const utilityTx = transactions.filter(t =>
      t.category === 'UTILITIES' || t.category === 'BILLS'
    );
    const utilityConsistency = this.calculatePaymentConsistency(utilityTx);

    // Bill payment timeliness
    const billTimeliness = this.calculateBillTimeliness(transactions);

    // Digital wallet usage
    const walletUsage = transactions.filter(t =>
      t.payment_channel === 'WALLET' || t.merchant_name?.includes('PAY')
    ).length / Math.max(1, transactions.length);

    // P2P transfer network score
    const p2pScore = this.calculateP2PScore(transactions);

    // Merchant diversity score
    const merchantDiversity = this.calculateMerchantDiversity(transactions);

    // Recurring payment count
    const recurringCount = transactions.filter(t => t.is_recurring).length;

    // Income source diversity
    const incomeDiversity = this.calculateIncomeDiversity(transactions);

    // Employment stability score (from transaction patterns)
    const employmentStability = this.inferEmploymentStability(transactions);

    // Location stability score
    const locationStability = await this.calculateLocationStability(userId);

    // Device trust score
    const deviceTrust = await this.calculateDeviceTrust(userId);

    // Social connection score (based on P2P network)
    const socialScore = this.calculateSocialScore(transactions);

    // Behavioral consistency score
    const behavioralConsistency = this.calculateBehavioralConsistency(transactions);

    return [
      mmFrequency,
      mmVolume,
      airtimeRegularity,
      utilityConsistency,
      billTimeliness,
      walletUsage * 100,
      p2pScore,
      merchantDiversity,
      recurringCount,
      incomeDiversity,
      employmentStability,
      locationStability,
      deviceTrust,
      socialScore,
      behavioralConsistency,
    ];
  }

  /**
   * Train gradient boosting model
   */
  async train(trainingData: TrainingDataPoint[]): Promise<CreditScoringModel> {
    logger.info('Training credit scoring model', { samples: trainingData.length });

    // Feature scaling
    const { scaledData, featureScaling } = this.scaleFeatures(trainingData);

    // Initialize model
    const numTrees = this.config.hyperparameters?.numTrees || 100;
    const learningRate = this.config.hyperparameters?.learningRate || 0.1;
    const maxDepth = this.config.hyperparameters?.maxDepth || 6;

    const trees: DecisionTree[] = [];
    let predictions = new Array(scaledData.length).fill(575); // Initial prediction (mean score)

    // Build trees iteratively
    for (let i = 0; i < numTrees; i++) {
      // Calculate residuals
      const residuals = scaledData.map((point, idx) => point.label - predictions[idx]);

      // Build tree to fit residuals
      const tree = this.buildDecisionTree(
        scaledData.map((p, idx) => ({ features: p.features, label: residuals[idx] })),
        maxDepth
      );
      trees.push(tree);

      // Update predictions
      predictions = predictions.map((pred, idx) =>
        pred + learningRate * this.predictWithTree(tree, scaledData[idx].features)
      );

      if ((i + 1) % 20 === 0) {
        const currentMSE = this.calculateMSE(
          scaledData.map(p => p.label),
          predictions
        );
        logger.info(`Tree ${i + 1}/${numTrees}, MSE: ${currentMSE.toFixed(2)}`);
      }
    }

    // Calculate linear weights for base prediction
    const weights = this.calculateLinearWeights(scaledData);

    return {
      type: 'gradient-boosting',
      version: this.config.version,
      weights,
      biases: [575], // Base score
      featureScaling,
      featureNames: this.featureNames,
      treeEnsemble: trees,
      numTrees,
      learningRate,
      maxDepth,
      trainedAt: new Date(),
    };
  }

  /**
   * Validate model on validation set
   */
  async validate(model: CreditScoringModel, validationData: TrainingDataPoint[]): Promise<TrainingMetrics> {
    const predictions = validationData.map(point => this.predict(model, point.features));
    const actuals = validationData.map(point => point.label);

    return this.calculateMetrics(predictions, actuals);
  }

  /**
   * Test model on test set
   */
  async test(model: CreditScoringModel, testData: TrainingDataPoint[]): Promise<TrainingMetrics> {
    const predictions = testData.map(point => this.predict(model, point.features));
    const actuals = testData.map(point => point.label);

    return this.calculateMetrics(predictions, actuals);
  }

  /**
   * Make prediction with trained model
   */
  private predict(model: CreditScoringModel, features: number[]): number {
    // Scale features
    const scaledFeatures = features.map((f, i) =>
      (f - model.featureScaling.mean[i]) / (model.featureScaling.std[i] || 1)
    );

    // Base prediction
    let prediction = model.biases[0];

    // Add tree ensemble predictions
    for (const tree of model.treeEnsemble) {
      prediction += model.learningRate * this.predictWithTree(tree, scaledFeatures);
    }

    // Clip to valid range
    return Math.max(300, Math.min(850, Math.round(prediction)));
  }

  /**
   * Save model to file
   */
  async saveModel(model: CreditScoringModel, modelPath: string): Promise<void> {
    await fs.writeFile(modelPath, JSON.stringify(model, null, 2));
    logger.info('Credit scoring model saved', { modelPath });
  }

  // Helper methods
  private buildDecisionTree(data: TrainingDataPoint[], maxDepth: number, depth: number = 0): DecisionTree {
    const nodes: TreeNode[] = [];
    const leafValues: number[] = [];

    this.buildNode(data, nodes, leafValues, maxDepth, depth);

    return { nodes, leafValues };
  }

  private buildNode(
    data: TrainingDataPoint[],
    nodes: TreeNode[],
    leafValues: number[],
    maxDepth: number,
    depth: number
  ): number {
    const nodeIndex = nodes.length;

    if (depth >= maxDepth || data.length < 10) {
      // Leaf node
      const meanValue = data.reduce((sum, p) => sum + p.label, 0) / data.length;
      nodes.push({
        featureIndex: -1,
        threshold: 0,
        leftChild: -1,
        rightChild: -1,
        isLeaf: true,
        value: meanValue,
      });
      leafValues.push(meanValue);
      return nodeIndex;
    }

    // Find best split
    const { featureIndex, threshold, gain } = this.findBestSplit(data);

    if (gain <= 0) {
      // No improvement, create leaf
      const meanValue = data.reduce((sum, p) => sum + p.label, 0) / data.length;
      nodes.push({
        featureIndex: -1,
        threshold: 0,
        leftChild: -1,
        rightChild: -1,
        isLeaf: true,
        value: meanValue,
      });
      leafValues.push(meanValue);
      return nodeIndex;
    }

    // Create internal node (placeholder)
    nodes.push({
      featureIndex,
      threshold,
      leftChild: -1,
      rightChild: -1,
      isLeaf: false,
    });

    // Split data
    const leftData = data.filter(p => p.features[featureIndex] <= threshold);
    const rightData = data.filter(p => p.features[featureIndex] > threshold);

    // Build children
    nodes[nodeIndex].leftChild = this.buildNode(leftData, nodes, leafValues, maxDepth, depth + 1);
    nodes[nodeIndex].rightChild = this.buildNode(rightData, nodes, leafValues, maxDepth, depth + 1);

    return nodeIndex;
  }

  private findBestSplit(data: TrainingDataPoint[]): { featureIndex: number; threshold: number; gain: number } {
    let bestGain = -Infinity;
    let bestFeature = 0;
    let bestThreshold = 0;

    const totalVariance = this.variance(data.map(p => p.label));

    for (let f = 0; f < this.featureNames.length; f++) {
      const values = [...new Set(data.map(p => p.features[f]))].sort((a, b) => a - b);

      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;

        const leftData = data.filter(p => p.features[f] <= threshold);
        const rightData = data.filter(p => p.features[f] > threshold);

        if (leftData.length < 5 || rightData.length < 5) continue;

        const leftVariance = this.variance(leftData.map(p => p.label));
        const rightVariance = this.variance(rightData.map(p => p.label));

        const weightedVariance =
          (leftData.length / data.length) * leftVariance +
          (rightData.length / data.length) * rightVariance;

        const gain = totalVariance - weightedVariance;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    return { featureIndex: bestFeature, threshold: bestThreshold, gain: bestGain };
  }

  private predictWithTree(tree: DecisionTree, features: number[]): number {
    let nodeIndex = 0;

    while (!tree.nodes[nodeIndex].isLeaf) {
      const node = tree.nodes[nodeIndex];
      if (features[node.featureIndex] <= node.threshold) {
        nodeIndex = node.leftChild;
      } else {
        nodeIndex = node.rightChild;
      }
    }

    return tree.nodes[nodeIndex].value || 0;
  }

  private scaleFeatures(data: TrainingDataPoint[]): {
    scaledData: TrainingDataPoint[];
    featureScaling: { mean: number[]; std: number[] };
  } {
    const numFeatures = data[0].features.length;
    const mean: number[] = [];
    const std: number[] = [];

    for (let i = 0; i < numFeatures; i++) {
      const values = data.map(p => p.features[i]);
      mean.push(values.reduce((a, b) => a + b, 0) / values.length);
      std.push(this.standardDeviation(values) || 1);
    }

    const scaledData = data.map(point => ({
      features: point.features.map((f, i) => (f - mean[i]) / std[i]),
      label: point.label,
    }));

    return { scaledData, featureScaling: { mean, std } };
  }

  private calculateLinearWeights(data: TrainingDataPoint[]): number[] {
    // Simple linear regression coefficients
    const numFeatures = data[0].features.length;
    const weights: number[] = [];

    for (let i = 0; i < numFeatures; i++) {
      const x = data.map(p => p.features[i]);
      const y = data.map(p => p.label);
      const correlation = this.correlation(x, y);
      weights.push(correlation * 10); // Scale factor
    }

    return weights;
  }

  private calculateMetrics(predictions: number[], actuals: number[]): TrainingMetrics {
    const mse = this.calculateMSE(actuals, predictions);
    const mae = predictions.reduce((sum, p, i) => sum + Math.abs(p - actuals[i]), 0) / predictions.length;

    // R-squared
    const ssTot = actuals.reduce((sum, a) => {
      const mean = actuals.reduce((s, v) => s + v, 0) / actuals.length;
      return sum + Math.pow(a - mean, 2);
    }, 0);
    const ssRes = predictions.reduce((sum, p, i) => sum + Math.pow(p - actuals[i], 2), 0);
    const r2 = 1 - (ssRes / ssTot);

    // Binned accuracy (within 50 points)
    const withinThreshold = predictions.filter((p, i) => Math.abs(p - actuals[i]) <= 50).length;
    const accuracy = withinThreshold / predictions.length;

    return { mse, mae, r2, accuracy };
  }

  private calculateMSE(actuals: number[], predictions: number[]): number {
    return predictions.reduce((sum, p, i) => sum + Math.pow(p - actuals[i], 2), 0) / predictions.length;
  }

  private variance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    return Math.sqrt(this.variance(values));
  }

  private correlation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private daysBetween(date1: Date, date2: Date): number {
    return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Feature calculation helpers
  private calculateIncomeRegularity(transactions: any[]): number {
    const incomes = transactions.filter(t => t.amount > 0 && t.category === 'INCOME');
    if (incomes.length < 3) return 50;

    const intervals = [];
    for (let i = 1; i < incomes.length; i++) {
      const days = this.daysBetween(new Date(incomes[i-1].date), new Date(incomes[i].date));
      intervals.push(days);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stdInterval = this.standardDeviation(intervals);

    // Lower std = more regular = higher score
    return Math.max(0, Math.min(100, 100 - stdInterval * 5));
  }

  private calculateIncomeExpenses(transactions: any[]): { income: number; expenses: number } {
    const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { income, expenses };
  }

  private calculateLoanTimeliness(transactions: any[]): number {
    const loanPayments = transactions.filter(t => t.category === 'LOAN_PAYMENT');
    if (loanPayments.length === 0) return 75;

    const onTimeCount = loanPayments.filter(t => !t.is_late_payment).length;
    return (onTimeCount / loanPayments.length) * 100;
  }

  private calculateCreditUtilization(accounts: any[]): number {
    const creditAccounts = accounts.filter(a => a.type === 'CREDIT');
    if (creditAccounts.length === 0) return 0.3; // Default moderate utilization

    const totalBalance = creditAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
    const totalLimit = creditAccounts.reduce((sum, a) => sum + (a.credit_limit || 0), 0);

    return totalLimit > 0 ? totalBalance / totalLimit : 0.5;
  }

  private calculateRegularityScore(transactions: any[]): number {
    if (transactions.length < 2) return 50;
    return Math.min(100, transactions.length * 10);
  }

  private calculatePaymentConsistency(transactions: any[]): number {
    if (transactions.length < 3) return 50;
    const amounts = transactions.map(t => Math.abs(t.amount));
    const std = this.standardDeviation(amounts);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const cv = mean > 0 ? std / mean : 1;
    return Math.max(0, Math.min(100, 100 - cv * 50));
  }

  private calculateBillTimeliness(transactions: any[]): number {
    const bills = transactions.filter(t => t.category === 'BILLS' || t.category === 'UTILITIES');
    if (bills.length === 0) return 75;
    const onTime = bills.filter(t => !t.is_late_payment).length;
    return (onTime / bills.length) * 100;
  }

  private calculateP2PScore(transactions: any[]): number {
    const p2p = transactions.filter(t => t.category === 'TRANSFER' || t.payment_channel === 'P2P');
    return Math.min(100, p2p.length * 5);
  }

  private calculateMerchantDiversity(transactions: any[]): number {
    const merchants = new Set(transactions.map(t => t.merchant_name).filter(Boolean));
    return Math.min(100, merchants.size * 2);
  }

  private calculateIncomeDiversity(transactions: any[]): number {
    const incomes = transactions.filter(t => t.amount > 0);
    const sources = new Set(incomes.map(t => t.merchant_name || t.category));
    return Math.min(100, sources.size * 20);
  }

  private inferEmploymentStability(transactions: any[]): number {
    // Look for regular salary-like deposits
    const deposits = transactions.filter(t => t.amount > 0 && t.amount > 100);
    if (deposits.length < 3) return 50;

    const amounts = deposits.map(t => t.amount);
    const std = this.standardDeviation(amounts);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Low variance in deposit amounts suggests stable employment
    return Math.min(100, Math.max(0, 100 - (std / mean) * 100));
  }

  private async calculateLocationStability(userId: string): Promise<number> {
    const sessions = await this.db('sessions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(10);

    if (sessions.length < 3) return 50;

    const cities = new Set(sessions.map(s => s.city).filter(Boolean));
    // Fewer unique cities = more stable
    return Math.max(0, 100 - (cities.size - 1) * 20);
  }

  private async calculateDeviceTrust(userId: string): Promise<number> {
    const devices = await this.db('user_devices')
      .where('user_id', userId)
      .where('trust_status', 'TRUSTED');

    if (devices.length === 0) return 50;
    return Math.min(100, 50 + devices.length * 10);
  }

  private calculateSocialScore(transactions: any[]): number {
    // P2P transfers to unique recipients
    const p2p = transactions.filter(t => t.category === 'TRANSFER');
    const recipients = new Set(p2p.map(t => t.counterparty_id).filter(Boolean));
    return Math.min(100, recipients.size * 10);
  }

  private calculateBehavioralConsistency(transactions: any[]): number {
    // Check transaction timing patterns
    const hours = transactions.map(t => new Date(t.date).getHours());
    const std = this.standardDeviation(hours);
    return Math.max(0, Math.min(100, 100 - std * 5));
  }

  private async getHistoricalCreditScore(userId: string): Promise<number | null> {
    const score = await this.db('credit_scores')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .first();

    return score?.score || null;
  }
}
