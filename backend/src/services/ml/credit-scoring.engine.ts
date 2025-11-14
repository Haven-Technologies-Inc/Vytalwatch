/**
 * ReshADX - Credit Scoring ML Engine
 * Advanced credit scoring using traditional + alternative African data sources
 */

import db from '../../database';
import { logger } from '../../utils/logger';

export interface CreditScoreInput {
  userId: string;
  accountId?: string;
  includeAlternativeData?: boolean;
}

export interface CreditScoreResult {
  userId: string;
  score: number; // 300-850 (FICO-like scale)
  scoreBand: 'POOR' | 'FAIR' | 'GOOD' | 'VERY_GOOD' | 'EXCELLENT';
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  factors: CreditFactor[];
  traditionalScore: number;
  alternativeDataScore: number;
  confidence: number; // 0-100%
  recommendedCreditLimit: number;
  defaultProbability: number; // 0-1
  calculatedAt: Date;
}

export interface CreditFactor {
  factor: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  weight: number;
  description: string;
}

export interface AlternativeDataSources {
  mobileMoneyTransactions?: any[];
  telecomData?: any;
  utilityPayments?: any[];
  employmentHistory?: any[];
  educationRecords?: any[];
  socialConnections?: any[];
  locationData?: any;
  digitalFootprint?: any;
}

export class CreditScoringEngine {
  /**
   * Calculate comprehensive credit score
   */
  async calculateCreditScore(input: CreditScoreInput): Promise<CreditScoreResult> {
    try {
      logger.info('Calculating credit score', { userId: input.userId });

      // Get user's transaction and account history
      const accounts = await this.getUserAccounts(input.userId);
      const transactions = await this.getUserTransactions(input.userId);

      // Calculate traditional credit score (40% weight)
      const traditionalScore = await this.calculateTraditionalScore({
        accounts,
        transactions,
        userId: input.userId,
      });

      // Calculate alternative data score (60% weight) - uniquely African
      let alternativeDataScore = 500; // default neutral
      let confidence = 60;

      if (input.includeAlternativeData !== false) {
        const altData = await this.getAlternativeData(input.userId);
        alternativeDataScore = await this.calculateAlternativeDataScore(altData, input.userId);
        confidence = 85;
      }

      // Combine scores with weights
      const finalScore = Math.round(
        traditionalScore * 0.4 + alternativeDataScore * 0.6
      );

      // Ensure score is within valid range
      const boundedScore = Math.max(300, Math.min(850, finalScore));

      // Analyze factors
      const factors = await this.analyzeFactors(
        traditionalScore,
        alternativeDataScore,
        accounts,
        transactions
      );

      // Calculate risk metrics
      const scoreBand = this.getScoreBand(boundedScore);
      const riskGrade = this.getRiskGrade(boundedScore);
      const defaultProbability = this.calculateDefaultProbability(boundedScore);
      const recommendedCreditLimit = this.calculateCreditLimit(
        boundedScore,
        transactions,
        accounts
      );

      const result: CreditScoreResult = {
        userId: input.userId,
        score: boundedScore,
        scoreBand,
        riskGrade,
        factors,
        traditionalScore,
        alternativeDataScore,
        confidence,
        recommendedCreditLimit,
        defaultProbability,
        calculatedAt: new Date(),
      };

      // Store score history
      await this.storeScoreHistory(result);

      logger.info('Credit score calculated', {
        userId: input.userId,
        score: boundedScore,
        scoreBand,
      });

      return result;
    } catch (error) {
      logger.error('Error calculating credit score', { error, userId: input.userId });
      throw error;
    }
  }

  /**
   * Calculate traditional credit score (bank account based)
   */
  private async calculateTraditionalScore(data: {
    accounts: any[];
    transactions: any[];
    userId: string;
  }): Promise<number> {
    let score = 500; // Start at neutral

    if (data.accounts.length === 0 || data.transactions.length === 0) {
      return 450; // Slightly below neutral if no data
    }

    // Factor 1: Payment History (35% of traditional score)
    const paymentScore = this.analyzePaymentHistory(data.transactions);
    score += paymentScore * 0.35;

    // Factor 2: Credit Utilization (30% of traditional score)
    const utilizationScore = this.analyzeUtilization(data.accounts, data.transactions);
    score += utilizationScore * 0.3;

    // Factor 3: Credit History Length (15% of traditional score)
    const historyScore = this.analyzeHistoryLength(data.accounts);
    score += historyScore * 0.15;

    // Factor 4: Account Mix (10% of traditional score)
    const mixScore = this.analyzeAccountMix(data.accounts);
    score += mixScore * 0.1;

    // Factor 5: New Credit Inquiries (10% of traditional score)
    const inquiryScore = this.analyzeInquiries(data.userId);
    score += inquiryScore * 0.1;

    return Math.round(score);
  }

  /**
   * Calculate alternative data score (African market specific)
   */
  private async calculateAlternativeDataScore(
    data: AlternativeDataSources,
    userId: string
  ): Promise<number> {
    let score = 500; // Start at neutral
    let weights = 0;

    // Mobile Money Behavior (25% of alternative score)
    if (data.mobileMoneyTransactions && data.mobileMoneyTransactions.length > 0) {
      const mmScore = this.analyzeMobileMoneyBehavior(data.mobileMoneyTransactions);
      score += mmScore * 0.25;
      weights += 0.25;
    }

    // Telecom/Airtime Data (20% of alternative score)
    if (data.telecomData) {
      const telecomScore = this.analyzeTelecomData(data.telecomData);
      score += telecomScore * 0.2;
      weights += 0.2;
    }

    // Utility Payment History (20% of alternative score)
    if (data.utilityPayments && data.utilityPayments.length > 0) {
      const utilityScore = this.analyzeUtilityPayments(data.utilityPayments);
      score += utilityScore * 0.2;
      weights += 0.2;
    }

    // Employment/Income Patterns (15% of alternative score)
    if (data.employmentHistory) {
      const employmentScore = this.analyzeEmployment(data.employmentHistory);
      score += employmentScore * 0.15;
      weights += 0.15;
    }

    // Education Records (10% of alternative score)
    if (data.educationRecords) {
      const educationScore = this.analyzeEducation(data.educationRecords);
      score += educationScore * 0.1;
      weights += 0.1;
    }

    // Social Connections (5% of alternative score)
    if (data.socialConnections) {
      const socialScore = this.analyzeSocialConnections(data.socialConnections);
      score += socialScore * 0.05;
      weights += 0.05;
    }

    // Location Stability (3% of alternative score)
    if (data.locationData) {
      const locationScore = this.analyzeLocationData(data.locationData);
      score += locationScore * 0.03;
      weights += 0.03;
    }

    // Digital Footprint (2% of alternative score)
    if (data.digitalFootprint) {
      const digitalScore = this.analyzeDigitalFootprint(data.digitalFootprint);
      score += digitalScore * 0.02;
      weights += 0.02;
    }

    // Adjust for missing data
    if (weights < 1.0) {
      score = score / weights;
    }

    return Math.round(score);
  }

  /**
   * Analyze payment history from transactions
   */
  private analyzePaymentHistory(transactions: any[]): number {
    let score = 0;

    // On-time payments
    const regularPayments = transactions.filter(t =>
      t.primary_category === 'LOAN_PAYMENTS' ||
      t.primary_category === 'CREDIT_CARD_PAYMENT'
    );

    if (regularPayments.length > 0) {
      score += 50; // Bonus for having payment history
    }

    // No overdrafts or NSF
    const negativeEvents = transactions.filter(t =>
      t.amount < 0 && t.primary_category === 'BANK_FEES'
    );

    if (negativeEvents.length === 0) {
      score += 30;
    } else {
      score -= negativeEvents.length * 5;
    }

    return score;
  }

  /**
   * Analyze credit utilization
   */
  private analyzeUtilization(accounts: any[], transactions: any[]): number {
    let score = 0;

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    for (const account of accounts) {
      if (account.account_type === 'CREDIT' && account.balance_current && account.balance_limit) {
        const utilization = Math.abs(account.balance_current / account.balance_limit);

        if (utilization < 0.3) {
          score += 30; // Excellent utilization
        } else if (utilization < 0.5) {
          score += 15; // Good utilization
        } else if (utilization < 0.7) {
          score += 5; // Fair utilization
        } else {
          score -= 20; // High utilization (risky)
        }
      }
    }

    return score;
  }

  /**
   * Analyze credit history length
   */
  private analyzeHistoryLength(accounts: any[]): number {
    if (accounts.length === 0) return -30;

    const oldestAccount = accounts.reduce((oldest, account) => {
      const accountDate = new Date(account.created_at);
      return accountDate < oldest ? accountDate : oldest;
    }, new Date());

    const monthsOfHistory = Math.floor(
      (Date.now() - oldestAccount.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    if (monthsOfHistory >= 60) return 50; // 5+ years
    if (monthsOfHistory >= 36) return 35; // 3-5 years
    if (monthsOfHistory >= 24) return 20; // 2-3 years
    if (monthsOfHistory >= 12) return 10; // 1-2 years
    return -10; // Less than 1 year
  }

  /**
   * Analyze account mix
   */
  private analyzeAccountMix(accounts: any[]): number {
    const types = new Set(accounts.map(a => a.account_type));

    if (types.size >= 4) return 30; // Excellent mix
    if (types.size === 3) return 20; // Good mix
    if (types.size === 2) return 10; // Fair mix
    return 0; // Limited mix
  }

  /**
   * Analyze credit inquiries
   */
  private analyzeInquiries(userId: string): number {
    // In production, this would check credit inquiry history
    // For now, return neutral
    return 0;
  }

  /**
   * Analyze mobile money behavior (uniquely African)
   */
  private analyzeMobileMoneyBehavior(transactions: any[]): number {
    let score = 0;

    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);

    const recentTxns = transactions.filter(t =>
      new Date(t.date) >= last90Days
    );

    // Transaction frequency
    if (recentTxns.length > 50) score += 40;
    else if (recentTxns.length > 20) score += 25;
    else if (recentTxns.length > 5) score += 10;

    // Balance maintenance
    const avgBalance = recentTxns.reduce((sum, t) => sum + t.balance_after, 0) / recentTxns.length;
    if (avgBalance > 50000) score += 30; // GHS 500+
    else if (avgBalance > 10000) score += 15; // GHS 100+

    // Regular top-ups (indicates employment)
    const topUps = recentTxns.filter(t => t.transaction_type === 'CREDIT' && t.amount > 10000);
    if (topUps.length > 4) score += 20; // Monthly income

    // Merchant payments (indicates spending capacity)
    const merchantPayments = recentTxns.filter(t =>
      t.merchant_name && t.transaction_type === 'DEBIT'
    );
    if (merchantPayments.length > 10) score += 10;

    return score;
  }

  /**
   * Analyze telecom/airtime data
   */
  private analyzeTelecomData(data: any): number {
    let score = 0;

    // Account longevity
    if (data.accountAgeMonths > 24) score += 30;
    else if (data.accountAgeMonths > 12) score += 15;

    // Regular airtime purchases
    if (data.avgMonthlySpend > 5000) score += 20; // GHS 50+/month
    else if (data.avgMonthlySpend > 2000) score += 10; // GHS 20+/month

    // Data usage (indicates digital literacy)
    if (data.avgMonthlyDataGB > 5) score += 15;
    else if (data.avgMonthlyDataGB > 2) score += 8;

    // No payment defaults
    if (data.missedPayments === 0) score += 25;
    else score -= data.missedPayments * 10;

    return score;
  }

  /**
   * Analyze utility payment history
   */
  private analyzeUtilityPayments(payments: any[]): number {
    let score = 0;

    const last6Months = new Date();
    last6Months.setMonth(last6Months.getMonth() - 6);

    const recentPayments = payments.filter(p =>
      new Date(p.date) >= last6Months
    );

    // Regular payments
    if (recentPayments.length >= 6) score += 40; // All months
    else if (recentPayments.length >= 4) score += 25;
    else if (recentPayments.length >= 2) score += 10;

    // On-time payments
    const latePayments = recentPayments.filter(p => p.daysLate > 0);
    if (latePayments.length === 0) score += 30;
    else score -= latePayments.length * 5;

    // Payment consistency
    const amounts = recentPayments.map(p => p.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.map(x => Math.pow(x - avgAmount, 2)).reduce((a, b) => a + b, 0) / amounts.length
    );

    if (stdDev / avgAmount < 0.3) score += 20; // Consistent payments

    return score;
  }

  /**
   * Analyze employment/income patterns
   */
  private analyzeEmployment(history: any[]): number {
    let score = 0;

    if (history.length === 0) return 0;

    const current = history[0];

    // Employment status
    if (current.status === 'EMPLOYED') score += 30;
    else if (current.status === 'SELF_EMPLOYED') score += 20;

    // Employment length
    if (current.monthsInRole > 24) score += 25;
    else if (current.monthsInRole > 12) score += 15;
    else if (current.monthsInRole > 6) score += 5;

    // Income level
    if (current.monthlyIncome > 500000) score += 30; // GHS 5000+
    else if (current.monthlyIncome > 200000) score += 20; // GHS 2000+
    else if (current.monthlyIncome > 100000) score += 10; // GHS 1000+

    // Stability (fewer job changes)
    if (history.length === 1) score += 15; // Only one job
    else if (history.length === 2) score += 5;

    return score;
  }

  /**
   * Analyze education records
   */
  private analyzeEducation(records: any[]): number {
    let score = 0;

    if (!records || records.length === 0) return 0;

    const highest = records.reduce((max, rec) =>
      rec.level > max.level ? rec : max
    , records[0]);

    switch (highest.level) {
      case 'POSTGRADUATE': score += 30; break;
      case 'UNDERGRADUATE': score += 20; break;
      case 'DIPLOMA': score += 15; break;
      case 'SECONDARY': score += 10; break;
      case 'PRIMARY': score += 5; break;
    }

    return score;
  }

  /**
   * Analyze social connections
   */
  private analyzeSocialConnections(connections: any[]): number {
    let score = 0;

    // Network size
    if (connections.length > 100) score += 15;
    else if (connections.length > 50) score += 10;
    else if (connections.length > 20) score += 5;

    // Quality of connections (verified users with good scores)
    const qualityConnections = connections.filter(c =>
      c.isVerified && c.creditScore > 650
    );

    if (qualityConnections.length > 10) score += 15;
    else if (qualityConnections.length > 5) score += 8;

    return score;
  }

  /**
   * Analyze location data
   */
  private analyzeLocationData(data: any): number {
    let score = 0;

    // Location stability
    if (data.monthsAtCurrentAddress > 24) score += 15;
    else if (data.monthsAtCurrentAddress > 12) score += 8;

    // Urban vs rural (different risk profiles)
    if (data.locationType === 'URBAN') score += 5;

    return score;
  }

  /**
   * Analyze digital footprint
   */
  private analyzeDigitalFootprint(data: any): number {
    let score = 0;

    if (data.hasVerifiedEmail) score += 5;
    if (data.hasVerifiedPhone) score += 5;
    if (data.socialMediaVerified) score += 5;

    return score;
  }

  /**
   * Get score band classification
   */
  private getScoreBand(score: number): 'POOR' | 'FAIR' | 'GOOD' | 'VERY_GOOD' | 'EXCELLENT' {
    if (score >= 750) return 'EXCELLENT';
    if (score >= 700) return 'VERY_GOOD';
    if (score >= 650) return 'GOOD';
    if (score >= 600) return 'FAIR';
    return 'POOR';
  }

  /**
   * Get risk grade
   */
  private getRiskGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' {
    if (score >= 750) return 'A';
    if (score >= 700) return 'B';
    if (score >= 650) return 'C';
    if (score >= 600) return 'D';
    if (score >= 550) return 'E';
    return 'F';
  }

  /**
   * Calculate default probability
   */
  private calculateDefaultProbability(score: number): number {
    // Logistic regression mapping score to default probability
    const z = -10 + (score / 50);
    const probability = 1 / (1 + Math.exp(-z));
    return 1 - probability; // Invert so higher score = lower default risk
  }

  /**
   * Calculate recommended credit limit
   */
  private calculateCreditLimit(
    score: number,
    transactions: any[],
    accounts: any[]
  ): number {
    // Base limit on score
    let baseLimit = 0;
    if (score >= 750) baseLimit = 1000000; // GHS 10,000
    else if (score >= 700) baseLimit = 500000; // GHS 5,000
    else if (score >= 650) baseLimit = 300000; // GHS 3,000
    else if (score >= 600) baseLimit = 150000; // GHS 1,500
    else if (score >= 550) baseLimit = 50000; // GHS 500
    else baseLimit = 20000; // GHS 200

    // Adjust based on income (if available)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentCredits = transactions.filter(t =>
      t.transaction_type === 'CREDIT' &&
      new Date(t.date) >= last30Days
    );

    if (recentCredits.length > 0) {
      const avgMonthlyIncome = recentCredits.reduce((sum, t) => sum + t.amount, 0) / 1;
      const incomeBasedLimit = avgMonthlyIncome * 0.3; // 30% of monthly income

      return Math.min(baseLimit, incomeBasedLimit);
    }

    return baseLimit;
  }

  /**
   * Analyze contributing factors
   */
  private async analyzeFactors(
    traditionalScore: number,
    alternativeScore: number,
    accounts: any[],
    transactions: any[]
  ): Promise<CreditFactor[]> {
    const factors: CreditFactor[] = [];

    // Traditional factors
    if (accounts.length > 0) {
      factors.push({
        factor: 'ACCOUNT_HISTORY',
        impact: accounts.length >= 3 ? 'POSITIVE' : 'NEUTRAL',
        weight: 15,
        description: `${accounts.length} account(s) linked`,
      });
    }

    if (transactions.length > 0) {
      const last90Days = new Date();
      last90Days.setDate(last90Days.getDate() - 90);
      const recentTxns = transactions.filter(t => new Date(t.date) >= last90Days);

      factors.push({
        factor: 'TRANSACTION_ACTIVITY',
        impact: recentTxns.length > 20 ? 'POSITIVE' : 'NEUTRAL',
        weight: 20,
        description: `${recentTxns.length} transactions in last 90 days`,
      });
    }

    // Alternative data factors
    factors.push({
      factor: 'ALTERNATIVE_DATA',
      impact: alternativeScore > 550 ? 'POSITIVE' : 'NEUTRAL',
      weight: 60,
      description: 'Mobile money, telecom, and utility payment history considered',
    });

    return factors;
  }

  /**
   * Store score history
   */
  private async storeScoreHistory(result: CreditScoreResult): Promise<void> {
    await db('credit_scores').insert({
      user_id: result.userId,
      score: result.score,
      score_band: result.scoreBand,
      risk_grade: result.riskGrade,
      traditional_score: result.traditionalScore,
      alternative_data_score: result.alternativeDataScore,
      confidence: result.confidence,
      recommended_credit_limit: result.recommendedCreditLimit,
      default_probability: result.defaultProbability,
      factors: JSON.stringify(result.factors),
      calculated_at: result.calculatedAt,
    });
  }

  /**
   * Get user accounts
   */
  private async getUserAccounts(userId: string): Promise<any[]> {
    return await db('accounts')
      .where({ user_id: userId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc');
  }

  /**
   * Get user transactions
   */
  private async getUserTransactions(userId: string): Promise<any[]> {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    return await db('transactions')
      .where({ user_id: userId })
      .where('date', '>=', last12Months)
      .orderBy('date', 'desc')
      .limit(1000);
  }

  /**
   * Get alternative data from various sources
   */
  private async getAlternativeData(userId: string): Promise<AlternativeDataSources> {
    // In production, this would integrate with:
    // - Mobile money providers (MTN, Vodafone, AirtelTigo)
    // - Telecom providers
    // - Utility companies
    // - Employment verification services
    // - Education verification services

    // For now, return mock data structure
    return {
      mobileMoneyTransactions: await this.getMobileMoneyData(userId),
      telecomData: await this.getTelecomData(userId),
      utilityPayments: await this.getUtilityData(userId),
      employmentHistory: await this.getEmploymentData(userId),
      educationRecords: await this.getEducationData(userId),
      socialConnections: await this.getSocialConnections(userId),
      locationData: await this.getLocationData(userId),
      digitalFootprint: await this.getDigitalFootprint(userId),
    };
  }

  private async getMobileMoneyData(userId: string): Promise<any[]> {
    // Integration point for mobile money providers
    return [];
  }

  private async getTelecomData(userId: string): Promise<any> {
    // Integration point for telecom providers
    return null;
  }

  private async getUtilityData(userId: string): Promise<any[]> {
    // Integration point for utility companies
    return [];
  }

  private async getEmploymentData(userId: string): Promise<any[]> {
    // Integration point for employment verification
    return [];
  }

  private async getEducationData(userId: string): Promise<any[]> {
    // Integration point for education verification
    return [];
  }

  private async getSocialConnections(userId: string): Promise<any[]> {
    // Get user's referrals and connections
    const connections = await db('users')
      .where({ referred_by: userId })
      .select('user_id', 'account_status');

    return connections;
  }

  private async getLocationData(userId: string): Promise<any> {
    // Get user's address information
    const user = await db('users')
      .where({ user_id: userId })
      .first();

    return {
      monthsAtCurrentAddress: 12, // Would calculate from address history
      locationType: 'URBAN',
    };
  }

  private async getDigitalFootprint(userId: string): Promise<any> {
    const user = await db('users')
      .where({ user_id: userId })
      .first();

    return {
      hasVerifiedEmail: user?.email_verified === true,
      hasVerifiedPhone: user?.phone_verified === true,
      socialMediaVerified: false,
    };
  }
}
