/**
 * ReshADX - Credit Score Routes
 * Alternative credit scoring endpoints (Africa-specific)
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import { CreditScoreController } from '../controllers/credit-score.controller';
import { validateRequest } from '../middleware/validate-request';
import { authenticate } from '../middleware/authenticate';
import { rateLimitAPI } from '../middleware/rate-limit';

const router = Router();
const creditScoreController = new CreditScoreController();

/**
 * @route   GET /api/v1/credit-score
 * @desc    Get user's credit score
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  rateLimitAPI,
  [
    query('userId').isUUID().optional(),
  ],
  validateRequest,
  creditScoreController.getCreditScore
);

/**
 * @route   POST /api/v1/credit-score/calculate
 * @desc    Calculate/recalculate credit score
 * @access  Private
 */
router.post(
  '/calculate',
  authenticate,
  rateLimitAPI,
  [
    body('userId').isUUID().optional(),
    body('includeAlternativeData').isBoolean().optional(),
  ],
  validateRequest,
  creditScoreController.calculateCreditScore
);

/**
 * @route   GET /api/v1/credit-score/history
 * @desc    Get credit score history
 * @access  Private
 */
router.get(
  '/history',
  authenticate,
  rateLimitAPI,
  [
    query('userId').isUUID().optional(),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
  ],
  validateRequest,
  creditScoreController.getCreditScoreHistory
);

/**
 * @route   GET /api/v1/credit-score/factors
 * @desc    Get factors affecting credit score
 * @access  Private
 */
router.get(
  '/factors',
  authenticate,
  rateLimitAPI,
  creditScoreController.getCreditScoreFactors
);

/**
 * @route   GET /api/v1/credit-score/recommendations
 * @desc    Get credit recommendations based on score
 * @access  Private
 */
router.get(
  '/recommendations',
  authenticate,
  rateLimitAPI,
  creditScoreController.getCreditRecommendations
);

/**
 * @route   POST /api/v1/credit-score/alternative-data
 * @desc    Submit alternative data for credit scoring
 * @access  Private
 */
router.post(
  '/alternative-data',
  authenticate,
  rateLimitAPI,
  [
    body('dataType').isIn([
      'MOBILE_MONEY',
      'TELECOM',
      'UTILITY',
      'EMPLOYMENT',
      'EDUCATION',
      'SOCIAL',
      'LOCATION',
    ]),
    body('data').isObject(),
  ],
  validateRequest,
  creditScoreController.submitAlternativeData
);

/**
 * @route   GET /api/v1/credit-score/report
 * @desc    Get detailed credit report
 * @access  Private
 */
router.get(
  '/report',
  authenticate,
  rateLimitAPI,
  creditScoreController.getCreditReport
);

export default router;
