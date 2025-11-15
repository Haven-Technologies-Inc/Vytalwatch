/**
 * ReshADX - Transaction Routes
 * Transaction data and enrichment endpoints
 */

import { Router } from 'express';
import { param, query } from 'express-validator';
import { TransactionController } from '../controllers/transaction.controller';
import { validateRequest } from '../middleware/validate-request';
import { authenticate } from '../middleware/authenticate';
import { rateLimitAPI } from '../middleware/rate-limit';

const router = Router();
const transactionController = new TransactionController();

/**
 * @route   GET /api/v1/transactions
 * @desc    Get transactions for user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  rateLimitAPI,
  [
    query('accountId').isUUID().optional(),
    query('startDate').isISO8601().optional(),
    query('endDate').isISO8601().optional(),
    query('minAmount').isNumeric().optional(),
    query('maxAmount').isNumeric().optional(),
    query('category').isString().optional(),
    query('search').isString().optional(),
    query('limit').isInt({ min: 1, max: 500 }).optional(),
    query('offset').isInt({ min: 0 }).optional(),
  ],
  validateRequest,
  transactionController.getTransactions
);

/**
 * @route   GET /api/v1/transactions/:transactionId
 * @desc    Get specific transaction details
 * @access  Private
 */
router.get(
  '/:transactionId',
  authenticate,
  rateLimitAPI,
  [
    param('transactionId').isUUID(),
  ],
  validateRequest,
  transactionController.getTransactionById
);

/**
 * @route   GET /api/v1/transactions/sync
 * @desc    Sync latest transactions from institutions
 * @access  Private
 */
router.post(
  '/sync',
  authenticate,
  rateLimitAPI,
  [
    query('accountId').isUUID().optional(),
    query('itemId').isUUID().optional(),
  ],
  validateRequest,
  transactionController.syncTransactions
);

/**
 * @route   GET /api/v1/transactions/:transactionId/enrich
 * @desc    Get enriched transaction data (merchant, category, etc.)
 * @access  Private
 */
router.get(
  '/:transactionId/enrich',
  authenticate,
  rateLimitAPI,
  [
    param('transactionId').isUUID(),
  ],
  validateRequest,
  transactionController.getEnrichedTransaction
);

/**
 * @route   GET /api/v1/transactions/analytics/spending
 * @desc    Get spending analytics by category
 * @access  Private
 */
router.get(
  '/analytics/spending',
  authenticate,
  rateLimitAPI,
  [
    query('accountId').isUUID().optional(),
    query('startDate').isISO8601().optional(),
    query('endDate').isISO8601().optional(),
    query('groupBy').isIn(['category', 'merchant', 'month', 'week']).optional(),
  ],
  validateRequest,
  transactionController.getSpendingAnalytics
);

/**
 * @route   GET /api/v1/transactions/analytics/income
 * @desc    Get income analytics
 * @access  Private
 */
router.get(
  '/analytics/income',
  authenticate,
  rateLimitAPI,
  [
    query('accountId').isUUID().optional(),
    query('startDate').isISO8601().optional(),
    query('endDate').isISO8601().optional(),
  ],
  validateRequest,
  transactionController.getIncomeAnalytics
);

/**
 * @route   GET /api/v1/transactions/recurring
 * @desc    Get recurring transactions
 * @access  Private
 */
router.get(
  '/recurring',
  authenticate,
  rateLimitAPI,
  [
    query('accountId').isUUID().optional(),
  ],
  validateRequest,
  transactionController.getRecurringTransactions
);

export default router;
