/**
 * ReshADX - Risk Assessment Routes
 * Fraud detection and risk analysis endpoints (Plaid Signal equivalent)
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { RiskController } from '../controllers/risk.controller';
import { validateRequest } from '../middleware/validate-request';
import { authenticate } from '../middleware/authenticate';
import { rateLimitAPI } from '../middleware/rate-limit';

const router = Router();
const riskController = new RiskController();

/**
 * @route   POST /api/v1/risk/assess
 * @desc    Assess risk for a transaction or account
 * @access  Private
 */
router.post(
  '/assess',
  authenticate,
  rateLimitAPI,
  [
    body('assessmentType').isIn([
      'ACCOUNT_OPENING',
      'TRANSACTION',
      'LOGIN',
      'PAYMENT',
      'WITHDRAWAL',
      'TRANSFER',
    ]),
    body('userId').isUUID(),
    body('accountId').isUUID().optional(),
    body('transactionId').isUUID().optional(),
    body('amount').isNumeric().optional(),
    body('deviceInfo').isObject().optional(),
  ],
  validateRequest,
  riskController.assessRisk
);

/**
 * @route   GET /api/v1/risk/assessments
 * @desc    Get risk assessments for user
 * @access  Private
 */
router.get(
  '/assessments',
  authenticate,
  rateLimitAPI,
  [
    query('userId').isUUID().optional(),
    query('accountId').isUUID().optional(),
    query('riskLevel').isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
  ],
  validateRequest,
  riskController.getRiskAssessments
);

/**
 * @route   GET /api/v1/risk/assessments/:assessmentId
 * @desc    Get specific risk assessment details
 * @access  Private
 */
router.get(
  '/assessments/:assessmentId',
  authenticate,
  rateLimitAPI,
  [
    param('assessmentId').isUUID(),
  ],
  validateRequest,
  riskController.getRiskAssessmentById
);

/**
 * @route   POST /api/v1/risk/check/sim-swap
 * @desc    Check for SIM swap fraud (critical for mobile money)
 * @access  Private
 */
router.post(
  '/check/sim-swap',
  authenticate,
  rateLimitAPI,
  [
    body('phoneNumber').isMobilePhone('any'),
    body('userId').isUUID().optional(),
  ],
  validateRequest,
  riskController.checkSIMSwap
);

/**
 * @route   POST /api/v1/risk/check/sanctions
 * @desc    Check against sanctions lists (OFAC, UN, EU)
 * @access  Private
 */
router.post(
  '/check/sanctions',
  authenticate,
  rateLimitAPI,
  [
    body('name').isString(),
    body('dateOfBirth').isISO8601().optional(),
    body('country').isISO31661Alpha2().optional(),
  ],
  validateRequest,
  riskController.checkSanctions
);

/**
 * @route   POST /api/v1/risk/check/pep
 * @desc    Check if person is politically exposed (PEP)
 * @access  Private
 */
router.post(
  '/check/pep',
  authenticate,
  rateLimitAPI,
  [
    body('name').isString(),
    body('country').isISO31661Alpha2(),
  ],
  validateRequest,
  riskController.checkPEP
);

/**
 * @route   GET /api/v1/risk/account/:accountId/score
 * @desc    Get risk score for specific account
 * @access  Private
 */
router.get(
  '/account/:accountId/score',
  authenticate,
  rateLimitAPI,
  [
    param('accountId').isUUID(),
  ],
  validateRequest,
  riskController.getAccountRiskScore
);

/**
 * @route   GET /api/v1/risk/transaction/:transactionId/flags
 * @desc    Get fraud flags for a transaction
 * @access  Private
 */
router.get(
  '/transaction/:transactionId/flags',
  authenticate,
  rateLimitAPI,
  [
    param('transactionId').isUUID(),
  ],
  validateRequest,
  riskController.getTransactionFraudFlags
);

/**
 * @route   POST /api/v1/risk/report-fraud
 * @desc    Report fraudulent activity
 * @access  Private
 */
router.post(
  '/report-fraud',
  authenticate,
  rateLimitAPI,
  [
    body('transactionId').isUUID().optional(),
    body('accountId').isUUID().optional(),
    body('fraudType').isString(),
    body('description').isString(),
  ],
  validateRequest,
  riskController.reportFraud
);

export default router;
