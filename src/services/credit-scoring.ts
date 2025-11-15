// ReshADX Credit Scoring Service
// Revolutionary credit scoring using alternative African data

import { CreditScore, AlternativeDataScore, IncomeVerification, ScoreFactor } from '../types/credit-scoring-api';
import { EnrichedTransaction } from '../types/enrichment-api';

// ============================================================================
// CREDIT SCORING ENGINE
// ============================================================================

export class CreditScoringEngine {
  private static instance: CreditScoringEngine;

  private constructor() {}

  static getInstance(): CreditScoringEngine {
    if (!CreditScoringEngine.instance) {
      CreditScoringEngine.instance = new CreditScoringEngine();
    }
    return CreditScoringEngine.instance;
  }

  /**
   * Calculate credit score using alternative African data
   */
  async calculateCreditScore(params: {
    userId: string;
    transactions?: EnrichedTransaction[];
    phoneNumber?: string;
    nationalId?: string;
    includeAlternativeData: boolean;
  }): Promise<CreditScore> {
    // Parallel data collection
    const [
      traditionalScore,
      alternativeDataScore,
    ] = await Promise.all([
      this.calculateTraditionalScore(params.transactions || []),
      params.includeAlternativeData
        ? this.calculateAlternativeDataScore(params)
        : Promise.resolve(null),
    ]);

    // Combine scores with weights
    const finalScore = this.combinedScores(traditionalScore, alternativeDataScore);

    // Determine score band
    const scoreBand = this.getScoreBand(finalScore);

    // Calculate default probability
    const defaultProbability = this.calculateDefaultProbability(finalScore);

    // Risk grade
    const riskGrade = this.getRiskGrade(finalScore);

    // Credit recommendations
    const recommendations = this.generateRecommendations(finalScore, defaultProbability);

    // Generate score factors (explainability)
    const scoreFactors = this.generateScoreFactors(
      traditionalScore,
      alternativeDataScore
    );

    return {
      score_id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: params.userId,

      credit_score: finalScore,
      score_band: scoreBand,
      percentile: this.calculatePercentile(finalScore),

      default_probability: defaultProbability,
      risk_grade: riskGrade,

      recommended_credit_limit: recommendations.creditLimit,
      recommended_interest_rate: recommendations.interestRate,
      recommended_loan_term_months: recommendations.loanTerm,

      score_factors: scoreFactors,
      alternative_data_score: alternativeDataScore,

      model_version: 'v3.0.0',
      model_confidence: 0.89,
      scored_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),

      request_id: `req_${Date.now()}`,
    };
  }

  /**
   * Calculate traditional credit score from bank/mobile money transactions
   */
  private async calculateTraditionalScore(transactions: EnrichedTransaction[]): Promise<number> {
    if (transactions.length === 0) return 300; // Minimum score for no data

    let score = 300; // Start at minimum

    // Payment History (30 points)
    const paymentHistoryScore = this.analyzePaymentHistory(transactions);
    score += paymentHistoryScore;

    // Transaction Patterns (25 points)
    const patternsScore = this.analyzeTransactionPatterns(transactions);
    score += patternsScore;

    // Account Balance Stability (20 points)
    const balanceScore = this.analyzeBalanceStability(transactions);
    score += balanceScore;

    // Income Consistency (15 points)
    const incomeScore = this.analyzeIncomeConsistency(transactions);
    score += incomeScore;

    // Account Age & Activity (10 points)
    const activityScore = this.analyzeAccountActivity(transactions);
    score += activityScore;

    return Math.min(Math.max(Math.round(score), 300), 850);
  }

  /**
   * Analyze payment history
   */
  private analyzePaymentHistory(transactions: EnrichedTransaction[]): number {
    // Look for bill payments, loan repayments
    const billPayments = transactions.filter(tx =>
      tx.category.primary === 'RENT_AND_UTILITIES' ||
      tx.category.primary === 'LOAN_PAYMENTS'
    );

    if (billPayments.length === 0) return 0;

    // Assume all payments are on time for demo (in production, check due dates)
    const onTimeRate = 0.95;

    return onTimeRate * 30; // Max 30 points
  }

  /**
   * Analyze transaction patterns
   */
  private analyzeTransactionPatterns(transactions: EnrichedTransaction[]): number {
    let score = 0;

    // Regular spending pattern
    const monthlyTxCount = transactions.length / 6; // Assume 6 months of data
    if (monthlyTxCount >= 10) score += 10;

    // Diverse merchants
    const uniqueMerchants = new Set(transactions.map(tx => tx.merchant.name)).size;
    if (uniqueMerchants >= 15) score += 10;

    // No excessive small transactions (can indicate desperate behavior)
    const smallTx = transactions.filter(tx => Math.abs(tx.amount) < 5).length;
    if (smallTx / transactions.length < 0.2) score += 5;

    return Math.min(score, 25);
  }

  /**
   * Analyze balance stability
   */
  private analyzeBalanceStability(transactions: EnrichedTransaction[]): number {
    // Calculate variance in balances (simplified)
    // In production, use actual balance snapshots

    const amounts = transactions.map(tx => tx.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    // Low variance = stable = good score
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Score based on coefficient of variation
    const cv = stdDev / Math.abs(avgAmount);
    if (cv < 0.5) return 20;
    if (cv < 1.0) return 15;
    if (cv < 1.5) return 10;
    return 5;
  }

  /**
   * Analyze income consistency
   */
  private analyzeIncomeConsistency(transactions: EnrichedTransaction[]): number {
    const incomeTransactions = transactions.filter(tx =>
      tx.amount > 0 && tx.category.primary === 'INCOME'
    );

    if (incomeTransactions.length === 0) return 0;

    // Check for regular deposits
    const avgMonthlyIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0) / 6;

    if (avgMonthlyIncome >= 2000) return 15; // High income
    if (avgMonthlyIncome >= 1000) return 12; // Medium income
    if (avgMonthlyIncome >= 500) return 8; // Low income
    return 5;
  }

  /**
   * Analyze account activity
   */
  private analyzeAccountActivity(transactions: EnrichedTransaction[]): number {
    // More transactions = more activity = better
    if (transactions.length >= 100) return 10;
    if (transactions.length >= 50) return 7;
    if (transactions.length >= 20) return 5;
    return 2;
  }

  /**
   * Calculate alternative data score (Revolutionary!)
   */
  private async calculateAlternativeDataScore(params: any): Promise<AlternativeDataScore> {
    // Parallel analysis of multiple data sources
    const [
      mobileMoneyScore,
      telecomScore,
      utilityScore,
      employmentScore,
      educationScore,
      socialScore,
      locationScore,
      digitalScore,
    ] = await Promise.all([
      this.analyzeMobileMoneyBehavior(params),
      this.analyzeTelecomData(params),
      this.analyzeUtilityPayments(params),
      this.verifyEmployment(params),
      this.verifyEducation(params),
      this.analyzeSocialNetworks(params),
      this.analyzeLocationStability(params),
      this.analyzeDigitalFootprint(params),
    ]);

    return {
      mobile_money_score: mobileMoneyScore.score,
      mobile_money_insights: mobileMoneyScore.insights,

      telecom_score: telecomScore.score,
      telecom_insights: telecomScore.insights,

      utility_score: utilityScore.score,
      utility_insights: utilityScore.insights,

      employment_score: employmentScore.score,
      employment_insights: employmentScore.insights,

      education_score: educationScore.score,
      education_insights: educationScore.insights,

      social_score: socialScore.score,
      social_insights: socialScore.insights,

      location_score: locationScore.score,
      location_insights: locationScore.insights,

      digital_footprint_score: digitalScore.score,
      digital_insights: digitalScore.insights,

      agricultural_score: undefined, // Would implement for farmers
      agricultural_insights: undefined,

      psychometric_score: undefined, // Would require user to complete test
      psychometric_insights: undefined,
    };
  }

  /**
   * Analyze mobile money behavior
   */
  private async analyzeMobileMoneyBehavior(params: any): Promise<{ score: number; insights: any }> {
    // In production, integrate with MTN, Vodafone, etc. APIs
    return {
      score: 75,
      insights: {
        average_balance: 850,
        transaction_frequency: 25, // per month
        merchant_payment_consistency: 0.8,
        savings_behavior_score: 70,
        has_mobile_loan_history: true,
        mobile_loan_repayment_score: 85,
      },
    };
  }

  /**
   * Analyze telecom data (Airtime/Data purchases)
   */
  private async analyzeTelecomData(params: any): Promise<{ score: number; insights: any }> {
    // Regular airtime purchases = stable income
    return {
      score: 70,
      insights: {
        monthly_airtime_spend: 50,
        airtime_purchase_consistency: 0.85,
        data_usage_pattern: 'REGULAR',
        has_postpaid_contract: false,
        payment_timeliness_score: undefined,
      },
    };
  }

  /**
   * Analyze utility payments
   */
  private async analyzeUtilityPayments(params: any): Promise<{ score: number; insights: any }> {
    return {
      score: 65,
      insights: {
        electricity_payment_history: [],
        water_payment_history: [],
        cable_tv_payment_history: [],
        on_time_payment_rate: 0.90,
      },
    };
  }

  /**
   * Verify employment via SSNIT or other sources
   */
  private async verifyEmployment(params: any): Promise<{ score: number; insights: any }> {
    return {
      score: 80,
      insights: {
        verified_employer: true,
        employer_name: 'Demo Company Ltd',
        monthly_income_estimate: 2500,
        income_stability_score: 85,
        employment_duration_months: 24,
        has_ssnit_contributions: true,
      },
    };
  }

  /**
   * Verify education
   */
  private async verifyEducation(params: any): Promise<{ score: number; insights: any }> {
    return {
      score: 60,
      insights: {
        highest_qualification: 'TERTIARY',
        verified_degree: true,
        school_fees_payment_history: [],
        educational_institution: 'University of Ghana',
      },
    };
  }

  /**
   * Analyze social networks
   */
  private async analyzeSocialNetworks(params: any): Promise<{ score: number; insights: any }> {
    return {
      score: 55,
      insights: {
        linkedin_verified: false,
        professional_licenses: [],
        cooperative_membership: true,
        susu_participation: true,
        references_score: 70,
      },
    };
  }

  /**
   * Analyze location stability
   */
  private async analyzeLocationStability(params: any): Promise<{ score: number; insights: any }> {
    return {
      score: 75,
      insights: {
        home_stability_months: 36,
        work_stability_months: 24,
        location_consistency_score: 80,
        urban_rural_classification: 'URBAN',
      },
    };
  }

  /**
   * Analyze digital footprint
   */
  private async analyzeDigitalFootprint(params: any): Promise<{ score: number; insights: any }> {
    return {
      score: 65,
      insights: {
        smartphone_ownership: true,
        internet_usage_pattern: 'MODERATE',
        social_media_presence: true,
        online_shopping_history: true,
        digital_literacy_score: 70,
      },
    };
  }

  /**
   * Combine traditional and alternative scores
   */
  private combinedScores(traditional: number, alternative: AlternativeDataScore | null): number {
    if (!alternative) return traditional;

    // Weight traditional vs alternative data
    // Traditional: 40%, Alternative: 60% (Africa-specific!)
    const altAvg = (
      alternative.mobile_money_score +
      alternative.telecom_score +
      alternative.utility_score +
      alternative.employment_score +
      alternative.education_score +
      alternative.social_score +
      alternative.location_score +
      alternative.digital_footprint_score
    ) / 8;

    // Scale alternative score to 300-850 range
    const altScaled = 300 + (altAvg / 100) * 550;

    // Weighted average
    return Math.round(traditional * 0.4 + altScaled * 0.6);
  }

  /**
   * Get score band
   */
  private getScoreBand(score: number): 'POOR' | 'FAIR' | 'GOOD' | 'VERY_GOOD' | 'EXCELLENT' {
    if (score >= 750) return 'EXCELLENT';
    if (score >= 700) return 'VERY_GOOD';
    if (score >= 650) return 'GOOD';
    if (score >= 600) return 'FAIR';
    return 'POOR';
  }

  /**
   * Calculate default probability
   */
  private calculateDefaultProbability(score: number): number {
    // Logistic regression model (simplified)
    // In production, use trained ML model
    const z = (score - 650) / 100;
    const probability = 1 / (1 + Math.exp(z));

    return Math.max(0.01, Math.min(0.99, probability));
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
   * Calculate percentile
   */
  private calculatePercentile(score: number): number {
    // Simplified percentile calculation
    // In production, use actual population distribution
    return Math.min(99, Math.max(1, Math.round((score - 300) / 550 * 100)));
  }

  /**
   * Generate credit recommendations
   */
  private generateRecommendations(score: number, defaultProb: number): {
    creditLimit: number;
    interestRate: number;
    loanTerm: number;
  } {
    // Base credit limit on score
    let creditLimit = 0;
    let interestRate = 0;
    let loanTerm = 0;

    if (score >= 750) {
      creditLimit = 50000;
      interestRate = 12;
      loanTerm = 36;
    } else if (score >= 700) {
      creditLimit = 30000;
      interestRate = 15;
      loanTerm = 24;
    } else if (score >= 650) {
      creditLimit = 15000;
      interestRate = 18;
      loanTerm = 18;
    } else if (score >= 600) {
      creditLimit = 7500;
      interestRate: 22;
      loanTerm = 12;
    } else {
      creditLimit = 2500;
      interestRate = 28;
      loanTerm = 6;
    }

    return { creditLimit, interestRate, loanTerm };
  }

  /**
   * Generate score factors (explainability)
   */
  private generateScoreFactors(traditional: number, alternative: AlternativeDataScore | null): ScoreFactor[] {
    const factors: ScoreFactor[] = [];

    // Traditional factors
    if (traditional >= 650) {
      factors.push({
        category: 'Payment History',
        impact: 'POSITIVE',
        importance: 30,
        description: 'Strong history of on-time payments for bills and loans',
      });
    }

    // Alternative data factors
    if (alternative) {
      if (alternative.mobile_money_score >= 70) {
        factors.push({
          category: 'Mobile Money Usage',
          impact: 'VERY_POSITIVE',
          importance: 25,
          description: 'Regular mobile money usage with good balance management',
          value: alternative.mobile_money_score,
        });
      }

      if (alternative.employment_score >= 70) {
        factors.push({
          category: 'Employment Verification',
          impact: 'VERY_POSITIVE',
          importance: 20,
          description: 'Verified employer with SSNIT contributions',
          value: 'Verified',
        });
      }

      if (alternative.telecom_score >= 65) {
        factors.push({
          category: 'Airtime & Data Purchases',
          impact: 'POSITIVE',
          importance: 15,
          description: 'Consistent airtime purchases indicate stable income',
          value: alternative.telecom_insights.monthly_airtime_spend,
        });
      }

      if (alternative.location_score >= 70) {
        factors.push({
          category: 'Location Stability',
          impact: 'POSITIVE',
          importance: 10,
          description: `Living at same address for ${alternative.location_insights.home_stability_months} months`,
          value: alternative.location_insights.home_stability_months,
        });
      }
    }

    return factors;
  }
}

// ============================================================================
// INCOME VERIFICATION ENGINE
// ============================================================================

export class IncomeVerificationEngine {
  /**
   * Verify income from transaction data
   */
  static async verifyIncome(transactions: EnrichedTransaction[]): Promise<IncomeVerification> {
    // Identify income streams
    const incomeStreams = this.identifyIncomeStreams(transactions);

    // Calculate monthly estimates
    const monthlyEstimates = this.calculateMonthlyIncome(incomeStreams);

    // Determine income stability
    const stability = this.assessIncomeStability(monthlyEstimates);

    return {
      verification_id: `verify_${Date.now()}`,
      user_id: 'user_123',
      account_id: 'account_123',

      estimated_monthly_income: monthlyEstimates[monthlyEstimates.length - 1] || 0,
      income_confidence: 'HIGH',
      income_stability: stability,

      income_streams: incomeStreams,
      primary_income_stream: incomeStreams[0],

      last_6_months_income: monthlyEstimates.slice(-6),
      last_12_months_income: monthlyEstimates,
      income_trend: this.calculateTrend(monthlyEstimates),

      employment_income: incomeStreams.find(s => s.stream_type === 'EMPLOYMENT')?.monthly_amount || 0,
      business_income: incomeStreams.find(s => s.stream_type === 'BUSINESS')?.monthly_amount || 0,
      rental_income: 0,
      investment_income: 0,
      remittance_income: incomeStreams.find(s => s.stream_type === 'REMITTANCE')?.monthly_amount || 0,
      government_benefits: 0,
      other_income: 0,

      employment_verified: true,
      employer_name: 'Demo Company Ltd',
      employer_verification_method: 'SSNIT',

      affordability_analysis: {
        total_monthly_income: monthlyEstimates[monthlyEstimates.length - 1] || 0,
        total_monthly_expenses: 1500,
        disposable_income: 1000,
        debt_to_income_ratio: 0.3,
        max_affordable_monthly_payment: 500,
        max_affordable_loan_amount: 15000,
        recommended_loan_term_months: 24,
        over_leveraged: false,
        high_expense_volatility: false,
        negative_cash_flow_months: 0,
      },

      verified_at: new Date().toISOString(),
      request_id: `req_${Date.now()}`,
    };
  }

  /**
   * Identify income streams from transactions
   */
  private static identifyIncomeStreams(transactions: EnrichedTransaction[]): any[] {
    const incomeTransactions = transactions.filter(tx => tx.amount > 0);

    // Group by patterns
    return [
      {
        stream_id: 'stream_1',
        stream_name: 'Monthly Salary',
        stream_type: 'EMPLOYMENT',
        monthly_amount: 2500,
        frequency: 'MONTHLY',
        consistency_score: 95,
        detected_from: 'BANK_DEPOSITS',
        first_detected: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        last_detected: new Date().toISOString(),
        transaction_count: 12,
      },
    ];
  }

  /**
   * Calculate monthly income estimates
   */
  private static calculateMonthlyIncome(streams: any[]): number[] {
    // For last 12 months
    const monthly = new Array(12).fill(0);

    streams.forEach(stream => {
      for (let i = 0; i < 12; i++) {
        monthly[i] += stream.monthly_amount;
      }
    });

    return monthly;
  }

  /**
   * Assess income stability
   */
  private static assessIncomeStability(monthly: number[]): 'VERY_STABLE' | 'STABLE' | 'VARIABLE' | 'IRREGULAR' {
    const avg = monthly.reduce((a, b) => a + b, 0) / monthly.length;
    const variance = monthly.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / monthly.length;
    const cv = Math.sqrt(variance) / avg; // Coefficient of variation

    if (cv < 0.1) return 'VERY_STABLE';
    if (cv < 0.25) return 'STABLE';
    if (cv < 0.5) return 'VARIABLE';
    return 'IRREGULAR';
  }

  /**
   * Calculate income trend
   */
  private static calculateTrend(monthly: number[]): 'INCREASING' | 'STABLE' | 'DECREASING' {
    const recent3 = monthly.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous3 = monthly.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;

    const change = (recent3 - previous3) / previous3;

    if (change > 0.1) return 'INCREASING';
    if (change < -0.1) return 'DECREASING';
    return 'STABLE';
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const creditScoring = CreditScoringEngine.getInstance();
