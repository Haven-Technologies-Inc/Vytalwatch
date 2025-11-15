/**
 * ReshADX - Analytics Controller
 * Comprehensive analytics and metrics endpoints
 */

import { Request, Response } from 'express';
import { db } from '../config/database';
import { logger } from '../utils/logger';

export class AnalyticsController {
  /**
   * Get platform overview metrics
   */
  async getPlatformMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d' } = req.query;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      // Only admins can view platform-wide metrics
      if (userRole !== 'admin') {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Admin access required',
        });
        return;
      }

      const now = new Date();
      const periodDays = this.getPeriodDays(period as string);
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Total users
      const [totalUsersCount] = await db('users').count('user_id as count');
      const totalUsers = totalUsersCount.count;

      // New users in period
      const [newUsersCount] = await db('users')
        .where('created_at', '>=', startDate)
        .count('user_id as count');
      const newUsers = newUsersCount.count;

      // Active businesses
      const [activeBusinessesCount] = await db('users')
        .where('account_tier', 'IN', ['professional', 'enterprise'])
        .where('account_status', 'active')
        .count('user_id as count');
      const activeBusinesses = activeBusinessesCount.count;

      // Total transactions in period
      const [transactionCount] = await db('transactions')
        .where('created_at', '>=', startDate)
        .count('transaction_id as count');
      const apiCalls = transactionCount.count;

      // Transaction value
      const [transactionValue] = await db('transactions')
        .where('created_at', '>=', startDate)
        .sum('amount as total');
      const revenue = transactionValue.total || 0;

      // Success rate
      const [successTransactions] = await db('transactions')
        .where('created_at', '>=', startDate)
        .where('status', 'completed')
        .count('transaction_id as count');
      const successRate = apiCalls > 0 ? (successTransactions.count / apiCalls) * 100 : 0;

      res.json({
        totalUsers,
        newUsers,
        activeBusinesses,
        apiCalls,
        revenue: revenue / 100, // Convert from cents
        successRate: successRate.toFixed(1),
        period,
        generatedAt: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Failed to get platform metrics', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve platform metrics',
      });
    }
  }

  /**
   * Get transaction analytics
   */
  async getTransactionAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d', groupBy = 'day' } = req.query;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const now = new Date();
      const periodDays = this.getPeriodDays(period as string);
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Build query based on user role
      let query = db('transactions')
        .where('created_at', '>=', startDate);

      // Non-admin users can only see their own transactions
      if (userRole !== 'admin') {
        query = query.where('user_id', userId);
      }

      // Get daily transaction stats
      const dailyStats = await db.raw(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as volume,
          SUM(amount) as value,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as success,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM transactions
        WHERE created_at >= ?
        ${userRole !== 'admin' ? 'AND user_id = ?' : ''}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, userRole !== 'admin' ? [startDate, userId] : [startDate]);

      // Transaction categories distribution
      const categoryStats = await db('transactions')
        .select('category')
        .where('created_at', '>=', startDate)
        .modify((qb) => {
          if (userRole !== 'admin') {
            qb.where('user_id', userId);
          }
        })
        .count('transaction_id as count')
        .groupBy('category')
        .orderBy('count', 'desc');

      const totalCategoryCount = categoryStats.reduce((sum, cat) => sum + parseInt(cat.count as string), 0);

      const categories = categoryStats.map(cat => ({
        name: cat.category,
        value: parseInt(cat.count as string),
        percentage: ((parseInt(cat.count as string) / totalCategoryCount) * 100).toFixed(1),
      }));

      res.json({
        period,
        dailyStats: dailyStats[0] || dailyStats,
        categories,
        generatedAt: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Failed to get transaction analytics', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve transaction analytics',
      });
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30d' } = req.query;
      const userRole = req.user!.role;

      // Only admins can view revenue analytics
      if (userRole !== 'admin') {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Admin access required',
        });
        return;
      }

      const now = new Date();
      const periodDays = this.getPeriodDays(period as string);
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Daily revenue
      const revenueData = await db.raw(`
        SELECT
          DATE(created_at) as date,
          SUM(amount) as revenue,
          COUNT(*) as transactions,
          COUNT(DISTINCT user_id) as unique_users
        FROM transactions
        WHERE created_at >= ?
          AND status = 'completed'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDate]);

      // Revenue by country
      const revenueByCountry = await db('transactions')
        .select('users.country')
        .join('users', 'transactions.user_id', 'users.user_id')
        .where('transactions.created_at', '>=', startDate)
        .where('transactions.status', 'completed')
        .sum('transactions.amount as revenue')
        .count('transactions.transaction_id as count')
        .groupBy('users.country')
        .orderBy('revenue', 'desc')
        .limit(10);

      // Revenue by business tier
      const revenueByTier = await db('transactions')
        .select('users.account_tier')
        .join('users', 'transactions.user_id', 'users.user_id')
        .where('transactions.created_at', '>=', startDate)
        .where('transactions.status', 'completed')
        .sum('transactions.amount as revenue')
        .count('transactions.transaction_id as count')
        .groupBy('users.account_tier')
        .orderBy('revenue', 'desc');

      res.json({
        period,
        dailyRevenue: revenueData[0] || revenueData,
        revenueByCountry: revenueByCountry.map(r => ({
          country: r.country,
          revenue: (r.revenue / 100).toFixed(2),
          transactionCount: r.count,
        })),
        revenueByTier: revenueByTier.map(r => ({
          tier: r.account_tier,
          revenue: (r.revenue / 100).toFixed(2),
          transactionCount: r.count,
        })),
        generatedAt: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Failed to get revenue analytics', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve revenue analytics',
      });
    }
  }

  /**
   * Get user growth analytics
   */
  async getUserGrowthAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30d' } = req.query;
      const userRole = req.user!.role;

      // Only admins can view user growth analytics
      if (userRole !== 'admin') {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Admin access required',
        });
        return;
      }

      const now = new Date();
      const periodDays = this.getPeriodDays(period as string);
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Daily user growth
      const userGrowth = await db.raw(`
        SELECT
          DATE(created_at) as date,
          COUNT(CASE WHEN account_tier = 'individual' THEN 1 END) as individual,
          COUNT(CASE WHEN account_tier IN ('professional', 'enterprise') THEN 1 END) as business,
          COUNT(*) as total
        FROM users
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDate]);

      // User retention (users active in last 30 days)
      const [retentionData] = await db.raw(`
        SELECT
          COUNT(DISTINCT user_id) as active_users
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL 30 DAY
      `);

      // User distribution by country
      const usersByCountry = await db('users')
        .select('country')
        .count('user_id as count')
        .groupBy('country')
        .orderBy('count', 'desc')
        .limit(10);

      res.json({
        period,
        dailyGrowth: userGrowth[0] || userGrowth,
        activeUsers: retentionData.active_users || 0,
        usersByCountry,
        generatedAt: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Failed to get user growth analytics', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve user growth analytics',
      });
    }
  }

  /**
   * Get credit score analytics
   */
  async getCreditScoreAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30d' } = req.query;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const now = new Date();
      const periodDays = this.getPeriodDays(period as string);
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Build query based on user role
      let query = db('credit_scores')
        .where('created_at', '>=', startDate);

      if (userRole !== 'admin') {
        query = query.where('user_id', userId);
      }

      // Credit score distribution
      const scoreDistribution = await db.raw(`
        SELECT
          CASE
            WHEN score < 500 THEN '300-499 (Poor)'
            WHEN score < 580 THEN '500-579 (Fair)'
            WHEN score < 670 THEN '580-669 (Good)'
            WHEN score < 750 THEN '670-749 (Very Good)'
            ELSE '750-850 (Excellent)'
          END as range,
          COUNT(*) as count
        FROM credit_scores
        WHERE created_at >= ?
        ${userRole !== 'admin' ? 'AND user_id = ?' : ''}
        GROUP BY range
        ORDER BY
          CASE range
            WHEN '300-499 (Poor)' THEN 1
            WHEN '500-579 (Fair)' THEN 2
            WHEN '580-669 (Good)' THEN 3
            WHEN '670-749 (Very Good)' THEN 4
            WHEN '750-850 (Excellent)' THEN 5
          END
      `, userRole !== 'admin' ? [startDate, userId] : [startDate]);

      const totalScores = (scoreDistribution[0] || scoreDistribution).reduce(
        (sum: number, item: any) => sum + parseInt(item.count), 0
      );

      const distribution = (scoreDistribution[0] || scoreDistribution).map((item: any) => ({
        range: item.range,
        count: parseInt(item.count),
        percentage: ((parseInt(item.count) / totalScores) * 100).toFixed(1),
      }));

      // Average score trend
      const scoreTrend = await db.raw(`
        SELECT
          DATE(created_at) as date,
          AVG(score) as avg_score,
          MIN(score) as min_score,
          MAX(score) as max_score
        FROM credit_scores
        WHERE created_at >= ?
        ${userRole !== 'admin' ? 'AND user_id = ?' : ''}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, userRole !== 'admin' ? [startDate, userId] : [startDate]);

      res.json({
        period,
        distribution,
        scoreTrend: scoreTrend[0] || scoreTrend,
        generatedAt: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Failed to get credit score analytics', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve credit score analytics',
      });
    }
  }

  /**
   * Get fraud detection analytics
   */
  async getFraudAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d', status } = req.query;
      const userRole = req.user!.role;

      // Only admins can view fraud analytics
      if (userRole !== 'admin') {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Admin access required',
        });
        return;
      }

      const now = new Date();
      const periodDays = this.getPeriodDays(period as string);
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Fraud alerts summary
      let alertsQuery = db('fraud_alerts')
        .where('created_at', '>=', startDate);

      if (status) {
        alertsQuery = alertsQuery.where('status', status);
      }

      const alerts = await alertsQuery
        .orderBy('created_at', 'desc')
        .limit(50);

      // Fraud by severity
      const bySeverity = await db('fraud_alerts')
        .select('severity')
        .where('created_at', '>=', startDate)
        .count('alert_id as count')
        .groupBy('severity')
        .orderBy('count', 'desc');

      // Fraud by type
      const byType = await db('fraud_alerts')
        .select('alert_type')
        .where('created_at', '>=', startDate)
        .count('alert_id as count')
        .groupBy('alert_type')
        .orderBy('count', 'desc');

      // Daily fraud trend
      const dailyTrend = await db.raw(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical,
          COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high,
          COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium,
          COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low
        FROM fraud_alerts
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDate]);

      // Detection rate (prevented fraudulent transactions / total suspicious)
      const [detectionStats] = await db('fraud_alerts')
        .where('created_at', '>=', startDate)
        .count('alert_id as total')
        .count(db.raw('CASE WHEN status = "blocked" THEN 1 END as prevented'));

      const detectionRate = detectionStats.total > 0
        ? ((detectionStats.prevented / detectionStats.total) * 100).toFixed(1)
        : 0;

      res.json({
        period,
        alerts: alerts.map(alert => ({
          ...alert,
          amount: alert.amount / 100,
        })),
        bySeverity,
        byType,
        dailyTrend: dailyTrend[0] || dailyTrend,
        detectionRate,
        generatedAt: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Failed to get fraud analytics', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve fraud analytics',
      });
    }
  }

  /**
   * Get API performance analytics
   */
  async getAPIPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d' } = req.query;
      const userRole = req.user!.role;

      // Only admins can view API performance
      if (userRole !== 'admin') {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Admin access required',
        });
        return;
      }

      const now = new Date();
      const periodDays = this.getPeriodDays(period as string);
      const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // API endpoint performance
      const endpointStats = await db.raw(`
        SELECT
          endpoint,
          COUNT(*) as total_calls,
          AVG(response_time) as avg_response_time,
          MAX(response_time) as max_response_time,
          COUNT(CASE WHEN status_code < 400 THEN 1 END) as success_count,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
        FROM api_logs
        WHERE created_at >= ?
        GROUP BY endpoint
        ORDER BY total_calls DESC
        LIMIT 20
      `, [startDate]);

      // Response time trend
      const responseTrend = await db.raw(`
        SELECT
          DATE(created_at) as date,
          AVG(response_time) as avg_response_time,
          MAX(response_time) as max_response_time,
          COUNT(*) as request_count
        FROM api_logs
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDate]);

      // Error rate by status code
      const errorStats = await db('api_logs')
        .select('status_code')
        .where('created_at', '>=', startDate)
        .where('status_code', '>=', 400)
        .count('log_id as count')
        .groupBy('status_code')
        .orderBy('count', 'desc');

      res.json({
        period,
        endpoints: endpointStats[0] || endpointStats,
        responseTrend: responseTrend[0] || responseTrend,
        errors: errorStats,
        generatedAt: new Date().toISOString(),
      });

    } catch (error: any) {
      logger.error('Failed to get API performance analytics', {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve API performance analytics',
      });
    }
  }

  /**
   * Helper: Convert period string to days
   */
  private getPeriodDays(period: string): number {
    switch (period) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 7;
    }
  }
}
