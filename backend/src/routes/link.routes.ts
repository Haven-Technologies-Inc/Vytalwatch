/**
 * ReshADX - Link Routes
 * Account linking endpoints (Plaid Link equivalent)
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import { LinkController } from '../controllers/link.controller';
import { validateRequest } from '../middleware/validate-request';
import { authenticate } from '../middleware/authenticate';
import { rateLimitAPI } from '../middleware/rate-limit';

const router = Router();
const linkController = new LinkController();

/**
 * @route   POST /api/v1/link/token/create
 * @desc    Create a link token for initializing Link flow
 * @access  Private
 */
router.post(
  '/token/create',
  authenticate,
  rateLimitAPI,
  [
    body('userId').isUUID().optional(),
    body('products').isArray().optional(),
    body('countryCode').isISO31661Alpha2().optional(),
    body('language').isString().optional(),
    body('webhook').isURL().optional(),
    body('redirectUri').isURL().optional(),
  ],
  validateRequest,
  linkController.createLinkToken
);

/**
 * @route   POST /api/v1/link/token/exchange
 * @desc    Exchange public token for access token
 * @access  Private
 */
router.post(
  '/token/exchange',
  authenticate,
  rateLimitAPI,
  [
    body('publicToken').notEmpty(),
  ],
  validateRequest,
  linkController.exchangePublicToken
);

/**
 * @route   POST /api/v1/link/update
 * @desc    Get link token for updating existing item
 * @access  Private
 */
router.post(
  '/update',
  authenticate,
  rateLimitAPI,
  [
    body('accessToken').notEmpty(),
  ],
  validateRequest,
  linkController.updateItem
);

/**
 * @route   GET /api/v1/link/institutions
 * @desc    Get list of supported financial institutions
 * @access  Public
 */
router.get(
  '/institutions',
  rateLimitAPI,
  [
    query('country').isISO31661Alpha2().optional(),
    query('type').isIn(['BANK', 'MOBILE_MONEY', 'MICROFINANCE', 'ALL']).optional(),
    query('search').isString().optional(),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
    query('offset').isInt({ min: 0 }).optional(),
  ],
  validateRequest,
  linkController.getInstitutions
);

/**
 * @route   GET /api/v1/link/institutions/:institutionId
 * @desc    Get details of a specific institution
 * @access  Public
 */
router.get(
  '/institutions/:institutionId',
  rateLimitAPI,
  linkController.getInstitutionById
);

/**
 * @route   POST /api/v1/link/oauth/initiate
 * @desc    Initiate OAuth flow for institutions that support it
 * @access  Private
 */
router.post(
  '/oauth/initiate',
  authenticate,
  rateLimitAPI,
  [
    body('institutionId').isUUID(),
    body('redirectUri').isURL(),
  ],
  validateRequest,
  linkController.initiateOAuth
);

/**
 * @route   POST /api/v1/link/oauth/callback
 * @desc    Handle OAuth callback
 * @access  Private
 */
router.post(
  '/oauth/callback',
  authenticate,
  rateLimitAPI,
  [
    body('code').notEmpty(),
    body('state').notEmpty(),
  ],
  validateRequest,
  linkController.handleOAuthCallback
);

/**
 * @route   POST /api/v1/link/ussd/initiate
 * @desc    Initiate USSD flow for offline account linking
 * @access  Private
 */
router.post(
  '/ussd/initiate',
  authenticate,
  rateLimitAPI,
  [
    body('phoneNumber').isMobilePhone('any'),
    body('institutionId').isUUID(),
  ],
  validateRequest,
  linkController.initiateUSSD
);

/**
 * @route   POST /api/v1/link/ussd/verify
 * @desc    Verify USSD session
 * @access  Private
 */
router.post(
  '/ussd/verify',
  authenticate,
  rateLimitAPI,
  [
    body('sessionId').notEmpty(),
    body('code').notEmpty(),
  ],
  validateRequest,
  linkController.verifyUSSD
);

export default router;
