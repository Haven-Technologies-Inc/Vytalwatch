/**
 * ReshADX - Analytics Routes
 * API routes for analytics and reporting
 */

import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

/**
 * @route   GET /api/analytics/platform
 * @desc    Get platform-wide metrics (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/platform',
  authenticate,
  (req, res) => analyticsController.getPlatformMetrics(req, res)
);

/**
 * @route   GET /api/analytics/transactions
 * @desc    Get transaction analytics
 * @access  Private
 */
router.get(
  '/transactions',
  authenticate,
  (req, res) => analyticsController.getTransactionAnalytics(req, res)
);

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/revenue',
  authenticate,
  (req, res) => analyticsController.getRevenueAnalytics(req, res)
);

/**
 * @route   GET /api/analytics/users
 * @desc    Get user growth analytics (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/users',
  authenticate,
  (req, res) => analyticsController.getUserGrowthAnalytics(req, res)
);

/**
 * @route   GET /api/analytics/credit-scores
 * @desc    Get credit score analytics
 * @access  Private
 */
router.get(
  '/credit-scores',
  authenticate,
  (req, res) => analyticsController.getCreditScoreAnalytics(req, res)
);

/**
 * @route   GET /api/analytics/fraud
 * @desc    Get fraud detection analytics (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/fraud',
  authenticate,
  (req, res) => analyticsController.getFraudAnalytics(req, res)
);

/**
 * @route   GET /api/analytics/api-performance
 * @desc    Get API performance metrics (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/api-performance',
  authenticate,
  (req, res) => analyticsController.getAPIPerformanceAnalytics(req, res)
);

export default router;
