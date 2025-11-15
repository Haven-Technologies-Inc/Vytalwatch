/**
 * ReshADX TypeScript SDK - Credit Score Resource
 */

import { HttpClient } from '../utils/http';
import {
  CalculateCreditScoreRequest,
  CalculateCreditScoreResponse,
  CreditScore,
  CreditScoreFactor,
  CreditRecommendation,
} from '../types';

export class CreditScoreResource {
  constructor(private http: HttpClient) {}

  /**
   * Calculate credit score
   */
  async calculate(request: CalculateCreditScoreRequest = {}): Promise<CalculateCreditScoreResponse> {
    return this.http.post<CalculateCreditScoreResponse>('/credit-score/calculate', request);
  }

  /**
   * Get current credit score
   */
  async get(): Promise<CreditScore> {
    return this.http.get<CreditScore>('/credit-score');
  }

  /**
   * Get credit score history
   */
  async getHistory(params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<{
    scores: Array<CreditScore & { calculatedAt: string }>;
  }> {
    return this.http.get('/credit-score/history', { params });
  }

  /**
   * Get credit score factors
   */
  async getFactors(): Promise<{ factors: CreditScoreFactor[] }> {
    return this.http.get('/credit-score/factors');
  }

  /**
   * Get credit recommendations
   */
  async getRecommendations(): Promise<{ recommendations: CreditRecommendation[] }> {
    return this.http.get('/credit-score/recommendations');
  }

  /**
   * Get credit score simulator
   */
  async simulate(scenarios: {
    payOffDebt?: number;
    increaseIncome?: number;
    reduceUtilization?: number;
  }): Promise<{
    currentScore: number;
    projectedScore: number;
    improvement: number;
    timeframe: string;
  }> {
    return this.http.post('/credit-score/simulate', scenarios);
  }
}
