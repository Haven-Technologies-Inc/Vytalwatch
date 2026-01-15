/**
 * ReshADX - Transaction Categorization Model Trainer
 * Trains multi-class classification model for automatic transaction categorization
 */

import { promises as fs } from 'fs';
import { getDatabase } from '../../../database';
import { logger } from '../../../utils/logger';
import { TrainingConfig, TrainingMetrics } from './pipeline';

interface TrainingDataPoint {
  features: number[];
  textFeatures: string;
  label: number; // Category index
}

interface PreparedData {
  trainingData: TrainingDataPoint[];
  validationData: TrainingDataPoint[];
  testData: TrainingDataPoint[];
}

interface CategorizationModel {
  type: 'naive-bayes-tfidf';
  version: string;
  categories: string[];
  categoryPriors: number[];
  tfidfVectorizer: TFIDFVectorizer;
  conditionalProbabilities: number[][]; // [category][word] = P(word|category)
  featureWeights: number[];
  trainedAt: Date;
}

interface TFIDFVectorizer {
  vocabulary: Map<string, number>;
  idf: number[];
  maxFeatures: number;
}

// Category definitions for African fintech
const CATEGORIES = [
  'INCOME_SALARY',
  'INCOME_BUSINESS',
  'INCOME_OTHER',
  'FOOD_DINING',
  'FOOD_GROCERIES',
  'TRANSPORT_FUEL',
  'TRANSPORT_RIDE',
  'TRANSPORT_PUBLIC',
  'UTILITIES_ELECTRICITY',
  'UTILITIES_WATER',
  'UTILITIES_GAS',
  'TELECOM_AIRTIME',
  'TELECOM_DATA',
  'TELECOM_SUBSCRIPTION',
  'SHOPPING_RETAIL',
  'SHOPPING_ONLINE',
  'ENTERTAINMENT',
  'HEALTHCARE',
  'EDUCATION',
  'PERSONAL_CARE',
  'RENT_HOUSING',
  'INSURANCE',
  'BANK_FEES',
  'TRANSFER_P2P',
  'TRANSFER_INTERNATIONAL',
  'MOBILE_MONEY_DEPOSIT',
  'MOBILE_MONEY_WITHDRAWAL',
  'LOAN_PAYMENT',
  'LOAN_DISBURSEMENT',
  'INVESTMENT',
  'SAVINGS',
  'GOVERNMENT_FEES',
  'CHARITY_DONATION',
  'OTHER',
];

export class CategorizationTrainer {
  private config: TrainingConfig;
  private db = getDatabase();
  private categories = CATEGORIES;

  // Common African merchant patterns
  private merchantPatterns: Map<RegExp, string> = new Map([
    [/MTN|VODAFONE|AIRTELTIGO|AIRTIME|DATA/i, 'TELECOM_AIRTIME'],
    [/UBER|BOLT|YANGO|TAXI|TROTRO/i, 'TRANSPORT_RIDE'],
    [/SHELL|TOTAL|GOIL|FUEL|PETROL/i, 'TRANSPORT_FUEL'],
    [/ECG|GRIDCo|ELECTRICITY|POWER/i, 'UTILITIES_ELECTRICITY'],
    [/GWCL|WATER/i, 'UTILITIES_WATER'],
    [/JUMIA|TONATON|JIJI|AMAZON|ALIBABA/i, 'SHOPPING_ONLINE'],
    [/MELCOM|SHOPRITE|GAME|PALACE|MALL/i, 'SHOPPING_RETAIL'],
    [/KFC|MCDONALD|PAPAYE|CHICKEN|RESTAURANT|FOOD/i, 'FOOD_DINING'],
    [/PHARMACY|HOSPITAL|CLINIC|MEDICAL|HEALTH/i, 'HEALTHCARE'],
    [/SCHOOL|UNIVERSITY|COLLEGE|EDUCATION|TUITION/i, 'EDUCATION'],
    [/RENT|HOUSING|LANDLORD/i, 'RENT_HOUSING'],
    [/TRANSFER|SEND|P2P/i, 'TRANSFER_P2P'],
    [/SALARY|WAGES|PAY/i, 'INCOME_SALARY'],
  ]);

  constructor(config: TrainingConfig) {
    this.config = config;
  }

  /**
   * Prepare training data from database
   */
  async prepareData(): Promise<PreparedData> {
    logger.info('Preparing categorization training data');

    // Get categorization history with confirmed categories
    const history = await this.db('categorization_history')
      .select('*')
      .where('user_corrected', false)
      .orWhere(function() {
        this.where('user_corrected', true).where('is_training_data', true);
      })
      .whereBetween('created_at', [this.config.dataRange.startDate, this.config.dataRange.endDate]);

    logger.info(`Found ${history.length} categorization records`);

    // Also get transactions with categories
    const transactions = await this.db('transactions')
      .select('*')
      .whereNotNull('category')
      .whereBetween('created_at', [this.config.dataRange.startDate, this.config.dataRange.endDate])
      .limit(50000);

    logger.info(`Found ${transactions.length} categorized transactions`);

    const dataPoints: TrainingDataPoint[] = [];

    // Process categorization history
    for (const record of history) {
      const categoryIndex = this.categories.indexOf(record.category_assigned);
      if (categoryIndex === -1) continue;

      const features = this.extractNumericFeatures(record);
      const textFeatures = this.extractTextFeatures(record.transaction_description);

      dataPoints.push({
        features,
        textFeatures,
        label: categoryIndex,
      });
    }

    // Process transactions
    for (const tx of transactions) {
      const categoryIndex = this.categories.indexOf(tx.category);
      if (categoryIndex === -1) continue;

      const features = this.extractNumericFeaturesFromTx(tx);
      const textFeatures = this.extractTextFeatures(tx.description || tx.merchant_name || '');

      dataPoints.push({
        features,
        textFeatures,
        label: categoryIndex,
      });
    }

    logger.info(`Extracted ${dataPoints.length} valid samples`);

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
   * Extract numeric features from categorization record
   */
  private extractNumericFeatures(record: any): number[] {
    const features = record.features_extracted || {};

    return [
      features.amount_bucket || 2, // 0-5 bucket
      features.hour_of_day || 12,
      features.day_of_week || 3,
      features.is_weekend ? 1 : 0,
      features.is_recurring ? 1 : 0,
      features.is_debit ? 1 : 0,
      features.is_round_amount ? 1 : 0,
      features.merchant_name_length || 10,
    ];
  }

  /**
   * Extract numeric features from transaction
   */
  private extractNumericFeaturesFromTx(tx: any): number[] {
    const amount = Math.abs(tx.amount || 0);
    const amountBucket = amount < 10 ? 0 :
      amount < 50 ? 1 :
      amount < 200 ? 2 :
      amount < 1000 ? 3 :
      amount < 5000 ? 4 : 5;

    const date = new Date(tx.date || tx.created_at);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    return [
      amountBucket,
      hour,
      dayOfWeek,
      dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0,
      tx.is_recurring ? 1 : 0,
      (tx.amount || 0) < 0 ? 1 : 0,
      amount % 100 === 0 || amount % 50 === 0 ? 1 : 0,
      (tx.merchant_name || tx.description || '').length,
    ];
  }

  /**
   * Extract and preprocess text features
   */
  private extractTextFeatures(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Train Naive Bayes classifier with TF-IDF features
   */
  async train(trainingData: TrainingDataPoint[]): Promise<CategorizationModel> {
    logger.info('Training categorization model', { samples: trainingData.length });

    // Build TF-IDF vectorizer
    const maxFeatures = this.config.hyperparameters?.maxFeatures || 5000;
    const tfidfVectorizer = this.buildTFIDFVectorizer(
      trainingData.map(d => d.textFeatures),
      maxFeatures
    );

    logger.info(`Built vocabulary with ${tfidfVectorizer.vocabulary.size} terms`);

    // Calculate category priors P(c)
    const categoryCounts = new Array(this.categories.length).fill(0);
    for (const sample of trainingData) {
      categoryCounts[sample.label]++;
    }

    const totalSamples = trainingData.length;
    const categoryPriors = categoryCounts.map(count =>
      Math.log((count + 1) / (totalSamples + this.categories.length)) // Laplace smoothing
    );

    // Calculate conditional probabilities P(word|category)
    const wordCountsByCategory: number[][] = this.categories.map(() =>
      new Array(tfidfVectorizer.vocabulary.size).fill(0)
    );
    const totalWordsByCategory: number[] = new Array(this.categories.length).fill(0);

    for (const sample of trainingData) {
      const words = sample.textFeatures.split(' ');
      for (const word of words) {
        const wordIndex = tfidfVectorizer.vocabulary.get(word);
        if (wordIndex !== undefined) {
          wordCountsByCategory[sample.label][wordIndex]++;
          totalWordsByCategory[sample.label]++;
        }
      }
    }

    // Calculate log probabilities with Laplace smoothing
    const vocabSize = tfidfVectorizer.vocabulary.size;
    const conditionalProbabilities: number[][] = wordCountsByCategory.map((counts, catIdx) => {
      const totalWords = totalWordsByCategory[catIdx] + vocabSize;
      return counts.map(count => Math.log((count + 1) / totalWords));
    });

    // Calculate feature weights for numeric features
    const featureWeights = this.calculateFeatureWeights(trainingData);

    return {
      type: 'naive-bayes-tfidf',
      version: this.config.version,
      categories: this.categories,
      categoryPriors,
      tfidfVectorizer,
      conditionalProbabilities,
      featureWeights,
      trainedAt: new Date(),
    };
  }

  /**
   * Build TF-IDF vectorizer
   */
  private buildTFIDFVectorizer(documents: string[], maxFeatures: number): TFIDFVectorizer {
    // Calculate document frequency
    const documentFrequency = new Map<string, number>();

    for (const doc of documents) {
      const uniqueWords = new Set(doc.split(' '));
      for (const word of uniqueWords) {
        if (word.length >= 2) {
          documentFrequency.set(word, (documentFrequency.get(word) || 0) + 1);
        }
      }
    }

    // Filter by frequency and select top features
    const sortedWords = [...documentFrequency.entries()]
      .filter(([, count]) => count >= 5 && count <= documents.length * 0.9) // Remove rare/common
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxFeatures);

    const vocabulary = new Map<string, number>();
    sortedWords.forEach(([word], index) => vocabulary.set(word, index));

    // Calculate IDF
    const numDocs = documents.length;
    const idf = sortedWords.map(([, df]) => Math.log((numDocs + 1) / (df + 1)) + 1);

    return { vocabulary, idf, maxFeatures };
  }

  /**
   * Calculate feature importance weights
   */
  private calculateFeatureWeights(data: TrainingDataPoint[]): number[] {
    const numFeatures = data[0].features.length;
    const weights: number[] = [];

    for (let i = 0; i < numFeatures; i++) {
      // Calculate information gain for each feature
      const gain = this.calculateInformationGain(
        data.map(d => d.features[i]),
        data.map(d => d.label)
      );
      weights.push(gain);
    }

    // Normalize weights
    const maxWeight = Math.max(...weights);
    return weights.map(w => w / maxWeight);
  }

  /**
   * Calculate information gain
   */
  private calculateInformationGain(feature: number[], labels: number[]): number {
    const entropy = (labels: number[]): number => {
      const counts = new Map<number, number>();
      for (const label of labels) {
        counts.set(label, (counts.get(label) || 0) + 1);
      }

      let ent = 0;
      for (const count of counts.values()) {
        const p = count / labels.length;
        if (p > 0) ent -= p * Math.log2(p);
      }
      return ent;
    };

    const parentEntropy = entropy(labels);

    // Discretize feature into bins
    const sorted = [...feature].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const leftLabels: number[] = [];
    const rightLabels: number[] = [];

    for (let i = 0; i < feature.length; i++) {
      if (feature[i] <= median) {
        leftLabels.push(labels[i]);
      } else {
        rightLabels.push(labels[i]);
      }
    }

    const childEntropy =
      (leftLabels.length / labels.length) * entropy(leftLabels) +
      (rightLabels.length / labels.length) * entropy(rightLabels);

    return parentEntropy - childEntropy;
  }

  /**
   * Validate model
   */
  async validate(model: CategorizationModel, validationData: TrainingDataPoint[]): Promise<TrainingMetrics> {
    const predictions = validationData.map(point => this.predict(model, point));
    const actuals = validationData.map(point => point.label);

    return this.calculateMetrics(predictions, actuals);
  }

  /**
   * Test model
   */
  async test(model: CategorizationModel, testData: TrainingDataPoint[]): Promise<TrainingMetrics> {
    const predictions = testData.map(point => this.predict(model, point));
    const actuals = testData.map(point => point.label);

    return this.calculateMetrics(predictions, actuals);
  }

  /**
   * Make prediction
   */
  private predict(model: CategorizationModel, dataPoint: TrainingDataPoint): number {
    const scores: number[] = [];

    // Calculate log probability for each category
    for (let c = 0; c < model.categories.length; c++) {
      let score = model.categoryPriors[c];

      // Text features (Naive Bayes)
      const words = dataPoint.textFeatures.split(' ');
      for (const word of words) {
        const wordIndex = model.tfidfVectorizer.vocabulary.get(word);
        if (wordIndex !== undefined) {
          score += model.conditionalProbabilities[c][wordIndex];
        }
      }

      // Numeric features contribution
      for (let i = 0; i < dataPoint.features.length; i++) {
        score += model.featureWeights[i] * this.featureCategoryScore(
          dataPoint.features[i],
          i,
          c,
          model
        );
      }

      scores.push(score);
    }

    // Apply merchant pattern rules as boost
    for (const [pattern, category] of this.merchantPatterns.entries()) {
      if (pattern.test(dataPoint.textFeatures)) {
        const catIndex = model.categories.indexOf(category);
        if (catIndex !== -1) {
          scores[catIndex] += 2; // Boost matching category
        }
      }
    }

    // Return category with highest score
    return scores.indexOf(Math.max(...scores));
  }

  /**
   * Calculate feature contribution for a category
   */
  private featureCategoryScore(
    featureValue: number,
    featureIndex: number,
    categoryIndex: number,
    model: CategorizationModel
  ): number {
    // Simplified: use feature value as score adjustment
    // In production, this would use learned feature-category correlations
    return featureValue * 0.1;
  }

  /**
   * Save model
   */
  async saveModel(model: CategorizationModel, modelPath: string): Promise<void> {
    // Convert Map to object for JSON serialization
    const serializable = {
      ...model,
      tfidfVectorizer: {
        ...model.tfidfVectorizer,
        vocabulary: Object.fromEntries(model.tfidfVectorizer.vocabulary),
      },
    };

    await fs.writeFile(modelPath, JSON.stringify(serializable, null, 2));
    logger.info('Categorization model saved', { modelPath });
  }

  /**
   * Calculate metrics
   */
  private calculateMetrics(predictions: number[], actuals: number[]): TrainingMetrics {
    const correct = predictions.filter((p, i) => p === actuals[i]).length;
    const accuracy = correct / actuals.length;

    // Calculate macro-averaged precision, recall, F1
    let totalPrecision = 0;
    let totalRecall = 0;
    let validCategories = 0;

    for (let c = 0; c < this.categories.length; c++) {
      const tp = predictions.filter((p, i) => p === c && actuals[i] === c).length;
      const fp = predictions.filter((p, i) => p === c && actuals[i] !== c).length;
      const fn = predictions.filter((p, i) => p !== c && actuals[i] === c).length;

      if (tp + fp > 0 && tp + fn > 0) {
        totalPrecision += tp / (tp + fp);
        totalRecall += tp / (tp + fn);
        validCategories++;
      }
    }

    const precision = validCategories > 0 ? totalPrecision / validCategories : 0;
    const recall = validCategories > 0 ? totalRecall / validCategories : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    return { accuracy, precision, recall, f1Score };
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
