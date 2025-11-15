/**
 * ReshADX - Credit Score Controller (COMPLETE IMPLEMENTATION)
 * Credit scoring endpoints with ML integration
 */

import { Request, Response } from 'express';
import { CreditScoringEngine } from '../services/ml/credit-scoring.engine';
import { logger } from '../utils/logger';
import db from '../database';

const creditScoringEngine = new CreditScoringEngine();

export class CreditScoreController {
  /**
   * Get user's credit score
   * GET /api/v1/credit-score
   */
  async getCreditScore(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const includeAlternativeData = req.query.includeAlternativeData !== 'false';

      const score = await creditScoringEngine.calculateCreditScore({
        userId,
        includeAlternativeData,
      });

      return res.status(200).json({
        success: true,
        data: { score },
      });
    } catch (error) {
      logger.error('Get credit score error', { error, userId: req.user?.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'SCORE_CALCULATION_ERROR',
          message: 'Failed to calculate credit score',
        },
      });
    }
  }

  /**
   * Calculate/refresh credit score
   * POST /api/v1/credit-score/calculate
   */
  async calculateCreditScore(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const includeAlternativeData = req.body.includeAlternativeData !== false;

      const score = await creditScoringEngine.calculateCreditScore({
        userId,
        includeAlternativeData,
      });

      return res.status(200).json({
        success: true,
        data: { score },
        message: 'Credit score calculated successfully',
      });
    } catch (error) {
      logger.error('Calculate credit score error', { error, userId: req.user?.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: 'Failed to calculate credit score',
        },
      });
    }
  }

  /**
   * Get credit score history
   * GET /api/v1/credit-score/history
   */
  async getCreditScoreHistory(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 12;
      const offset = parseInt(req.query.offset as string) || 0;

      const history = await db('credit_scores')
        .where({ user_id: userId })
        .orderBy('calculated_at', 'desc')
        .limit(limit)
        .offset(offset)
        .select('*');

      const total = await db('credit_scores')
        .where({ user_id: userId })
        .count('* as count')
        .first();

      return res.status(200).json({
        success: true,
        data: {
          history: history.map(h => ({
            score: h.score,
            scoreBand: h.score_band,
            riskGrade: h.risk_grade,
            traditionalScore: h.traditional_score,
            alternativeDataScore: h.alternative_data_score,
            confidence: h.confidence,
            recommendedCreditLimit: h.recommended_credit_limit,
            defaultProbability: h.default_probability,
            factors: JSON.parse(h.factors),
            calculatedAt: h.calculated_at,
          })),
          pagination: {
            total: parseInt(total?.count as string || '0'),
            limit,
            offset,
          },
        },
      });
    } catch (error) {
      logger.error('Get credit score history error', { error, userId: req.user?.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch credit score history',
        },
      });
    }
  }

  /**
   * Get credit factors breakdown
   * GET /api/v1/credit-score/factors
   */
  async getCreditScoreFactors(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const latestScore = await db('credit_scores')
        .where({ user_id: userId })
        .orderBy('calculated_at', 'desc')
        .first();

      if (!latestScore) {
        const score = await creditScoringEngine.calculateCreditScore({
          userId,
          includeAlternativeData: true,
        });

        return res.status(200).json({
          success: true,
          data: {
            factors: score.factors,
            traditionalScore: score.traditionalScore,
            alternativeDataScore: score.alternativeDataScore,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          factors: JSON.parse(latestScore.factors),
          traditionalScore: latestScore.traditional_score,
          alternativeDataScore: latestScore.alternative_data_score,
          calculatedAt: latestScore.calculated_at,
        },
      });
    } catch (error) {
      logger.error('Get credit factors error', { error, userId: req.user?.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch credit factors',
        },
      });
    }
  }

  /**
   * Get credit recommendations
   * GET /api/v1/credit-score/recommendations
   */
  async getCreditRecommendations(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const latestScore = await db('credit_scores')
        .where({ user_id: userId })
        .orderBy('calculated_at', 'desc')
        .first();

      if (!latestScore) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No credit score available',
          },
        });
      }

      const recommendations = this.generateRecommendations(latestScore);

      return res.status(200).json({
        success: true,
        data: {
          recommendations,
          recommendedCreditLimit: latestScore.recommended_credit_limit,
          score: latestScore.score,
        },
      });
    } catch (error) {
      logger.error('Get credit recommendations error', { error, userId: req.user?.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch recommendations',
        },
      });
    }
  }

  /**
   * Submit alternative data
   * POST /api/v1/credit-score/alternative-data
   */
  async submitAlternativeData(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { dataType, data } = req.body;

      // Store alternative data
      await db('alternative_credit_data').insert({
        user_id: userId,
        data_type: dataType,
        data: JSON.stringify(data),
        created_at: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: 'Alternative data submitted successfully',
      });
    } catch (error) {
      logger.error('Submit alternative data error', { error, userId: req.user?.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'SUBMISSION_ERROR',
          message: 'Failed to submit alternative data',
        },
      });
    }
  }

  /**
   * Get comprehensive credit report
   * GET /api/v1/credit-score/report
   */
  async getCreditReport(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const latestScore = await db('credit_scores')
        .where({ user_id: userId })
        .orderBy('calculated_at', 'desc')
        .first();

      if (!latestScore) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No credit report available',
          },
        });
      }

      const report = {
        score: latestScore.score,
        scoreBand: latestScore.score_band,
        riskGrade: latestScore.risk_grade,
        traditionalScore: latestScore.traditional_score,
        alternativeDataScore: latestScore.alternative_data_score,
        confidence: latestScore.confidence,
        recommendedCreditLimit: latestScore.recommended_credit_limit,
        defaultProbability: latestScore.default_probability,
        factors: JSON.parse(latestScore.factors),
        insights: this.generateInsights(latestScore),
        recommendations: this.generateRecommendations(latestScore),
        calculatedAt: latestScore.calculated_at,
      };

      return res.status(200).json({
        success: true,
        data: { report },
      });
    } catch (error) {
      logger.error('Get credit report error', { error, userId: req.user?.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch credit report',
        },
      });
    }
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(score: any): Array<{
    type: 'ACTION' | 'TIP' | 'WARNING';
    title: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
  }> {
    const recommendations = [];

    if (score.score < 600) {
      recommendations.push({
        type: 'ACTION' as const,
        title: 'Improve Payment History',
        description: 'Make all payments on time to build a positive payment history',
        impact: 'HIGH' as const,
      });
    }

    if (score.alternative_data_score < score.traditional_score) {
      recommendations.push({
        type: 'TIP' as const,
        title: 'Add Alternative Data',
        description: 'Link your mobile money and utility accounts to improve your score',
        impact: 'MEDIUM' as const,
      });
    }

    return recommendations;
  }

  /**
   * Generate insights
   */
  private generateInsights(score: any): Array<{
    type: 'TIP' | 'WARNING' | 'ACHIEVEMENT';
    title: string;
    description: string;
  }> {
    const insights = [];

    if (score.score >= 750) {
      insights.push({
        type: 'ACHIEVEMENT' as const,
        title: 'Excellent Credit Score!',
        description: 'You have an excellent credit score',
      });
    }

    return insights;
  }
}
