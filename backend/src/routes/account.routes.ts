/**
 * ReshADX - Account Routes
 * Financial account endpoints
 */

import { Router } from 'express';
import { param, query } from 'express-validator';
import { AccountController } from '../controllers/account.controller';
import { validateRequest } from '../middleware/validate-request';
import { authenticate } from '../middleware/authenticate';
import { rateLimitAPI } from '../middleware/rate-limit';

const router = Router();
const accountController = new AccountController();

/**
 * @route   GET /api/v1/accounts
 * @desc    Get all accounts for authenticated user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  rateLimitAPI,
  [
    query('itemId').isUUID().optional(),
    query('type').isString().optional(),
    query('status').isString().optional(),
  ],
  validateRequest,
  accountController.getAccounts
);

/**
 * @route   GET /api/v1/accounts/:accountId
 * @desc    Get specific account details
 * @access  Private
 */
router.get(
  '/:accountId',
  authenticate,
  rateLimitAPI,
  [
    param('accountId').isUUID(),
  ],
  validateRequest,
  accountController.getAccountById
);

/**
 * @route   GET /api/v1/accounts/:accountId/balance
 * @desc    Get account balance
 * @access  Private
 */
router.get(
  '/:accountId/balance',
  authenticate,
  rateLimitAPI,
  [
    param('accountId').isUUID(),
  ],
  validateRequest,
  accountController.getBalance
);

/**
 * @route   GET /api/v1/accounts/:accountId/balance/history
 * @desc    Get historical balance data
 * @access  Private
 */
router.get(
  '/:accountId/balance/history',
  authenticate,
  rateLimitAPI,
  [
    param('accountId').isUUID(),
    query('startDate').isISO8601().optional(),
    query('endDate').isISO8601().optional(),
    query('interval').isIn(['daily', 'weekly', 'monthly']).optional(),
  ],
  validateRequest,
  accountController.getBalanceHistory
);

/**
 * @route   GET /api/v1/accounts/:accountId/identity
 * @desc    Get account holder identity information
 * @access  Private
 */
router.get(
  '/:accountId/identity',
  authenticate,
  rateLimitAPI,
  [
    param('accountId').isUUID(),
  ],
  validateRequest,
  accountController.getIdentity
);

/**
 * @route   POST /api/v1/accounts/:accountId/verify
 * @desc    Verify account ownership (microdeposit, manual, etc.)
 * @access  Private
 */
router.post(
  '/:accountId/verify',
  authenticate,
  rateLimitAPI,
  [
    param('accountId').isUUID(),
  ],
  validateRequest,
  accountController.verifyAccount
);

export default router;
