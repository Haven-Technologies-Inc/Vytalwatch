/**
 * ReshADX - Item Routes
 * Item management endpoints (user-institution connections)
 */

import { Router } from 'express';
import { param, body } from 'express-validator';
import { ItemController } from '../controllers/item.controller';
import { validateRequest } from '../middleware/validate-request';
import { authenticate } from '../middleware/authenticate';
import { rateLimitAPI } from '../middleware/rate-limit';

const router = Router();
const itemController = new ItemController();

/**
 * @route   GET /api/v1/item/:itemId
 * @desc    Get item details
 * @access  Private
 */
router.get(
  '/:itemId',
  authenticate,
  rateLimitAPI,
  [
    param('itemId').isUUID(),
  ],
  validateRequest,
  itemController.getItem
);

/**
 * @route   GET /api/v1/item
 * @desc    Get all items for the authenticated user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  rateLimitAPI,
  itemController.getUserItems
);

/**
 * @route   DELETE /api/v1/item/:itemId
 * @desc    Remove an item (disconnect institution)
 * @access  Private
 */
router.delete(
  '/:itemId',
  authenticate,
  rateLimitAPI,
  [
    param('itemId').isUUID(),
  ],
  validateRequest,
  itemController.deleteItem
);

/**
 * @route   POST /api/v1/item/:itemId/sync
 * @desc    Manually trigger sync for an item
 * @access  Private
 */
router.post(
  '/:itemId/sync',
  authenticate,
  rateLimitAPI,
  [
    param('itemId').isUUID(),
  ],
  validateRequest,
  itemController.syncItem
);

/**
 * @route   PATCH /api/v1/item/:itemId/webhook
 * @desc    Update webhook URL for an item
 * @access  Private
 */
router.patch(
  '/:itemId/webhook',
  authenticate,
  rateLimitAPI,
  [
    param('itemId').isUUID(),
    body('webhookUrl').isURL(),
  ],
  validateRequest,
  itemController.updateWebhook
);

/**
 * @route   POST /api/v1/item/:itemId/credentials
 * @desc    Update credentials for an item
 * @access  Private
 */
router.post(
  '/:itemId/credentials',
  authenticate,
  rateLimitAPI,
  [
    param('itemId').isUUID(),
    body('credentials').isObject(),
  ],
  validateRequest,
  itemController.updateCredentials
);

/**
 * @route   GET /api/v1/item/:itemId/status
 * @desc    Get sync status and health of an item
 * @access  Private
 */
router.get(
  '/:itemId/status',
  authenticate,
  rateLimitAPI,
  [
    param('itemId').isUUID(),
  ],
  validateRequest,
  itemController.getItemStatus
);

/**
 * @route   POST /api/v1/item/:itemId/consent/renew
 * @desc    Renew consent for an item (African regulatory requirement)
 * @access  Private
 */
router.post(
  '/:itemId/consent/renew',
  authenticate,
  rateLimitAPI,
  [
    param('itemId').isUUID(),
    body('consentDurationDays').isInt({ min: 1, max: 365 }).optional(),
  ],
  validateRequest,
  itemController.renewConsent
);

export default router;
