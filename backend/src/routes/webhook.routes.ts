/**
 * ReshADX - Webhook Routes
 * Webhook configuration and management endpoints
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { WebhookController } from '../controllers/webhook.controller';
import { validateRequest } from '../middleware/validate-request';
import { authenticate } from '../middleware/authenticate';
import { rateLimitAPI } from '../middleware/rate-limit';
import { webhookUrlValidator } from '../middleware/webhook-url-validator';

const router = Router();
const webhookController = new WebhookController();

/**
 * @route   POST /api/v1/webhooks
 * @desc    Create a new webhook
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  rateLimitAPI,
  [
    body('url').isURL(),
    body('eventTypes').isArray(),
    body('description').isString().optional(),
  ],
  validateRequest,
  webhookUrlValidator, // SSRF protection
  webhookController.createWebhook
);

/**
 * @route   GET /api/v1/webhooks
 * @desc    Get all webhooks for user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  rateLimitAPI,
  webhookController.getWebhooks
);

/**
 * @route   GET /api/v1/webhooks/:webhookId
 * @desc    Get specific webhook details
 * @access  Private
 */
router.get(
  '/:webhookId',
  authenticate,
  rateLimitAPI,
  [
    param('webhookId').isUUID(),
  ],
  validateRequest,
  webhookController.getWebhookById
);

/**
 * @route   PATCH /api/v1/webhooks/:webhookId
 * @desc    Update webhook configuration
 * @access  Private
 */
router.patch(
  '/:webhookId',
  authenticate,
  rateLimitAPI,
  [
    param('webhookId').isUUID(),
    body('url').isURL().optional(),
    body('eventTypes').isArray().optional(),
    body('status').isIn(['ACTIVE', 'INACTIVE', 'PAUSED']).optional(),
  ],
  validateRequest,
  webhookUrlValidator, // SSRF protection when URL is being updated
  webhookController.updateWebhook
);

/**
 * @route   DELETE /api/v1/webhooks/:webhookId
 * @desc    Delete a webhook
 * @access  Private
 */
router.delete(
  '/:webhookId',
  authenticate,
  rateLimitAPI,
  [
    param('webhookId').isUUID(),
  ],
  validateRequest,
  webhookController.deleteWebhook
);

/**
 * @route   GET /api/v1/webhooks/:webhookId/deliveries
 * @desc    Get webhook delivery history
 * @access  Private
 */
router.get(
  '/:webhookId/deliveries',
  authenticate,
  rateLimitAPI,
  [
    param('webhookId').isUUID(),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
    query('offset').isInt({ min: 0 }).optional(),
  ],
  validateRequest,
  webhookController.getWebhookDeliveries
);

/**
 * @route   POST /api/v1/webhooks/:webhookId/test
 * @desc    Send test webhook
 * @access  Private
 */
router.post(
  '/:webhookId/test',
  authenticate,
  rateLimitAPI,
  [
    param('webhookId').isUUID(),
  ],
  validateRequest,
  webhookController.testWebhook
);

/**
 * @route   POST /api/v1/webhooks/:webhookId/rotate-secret
 * @desc    Rotate webhook secret
 * @access  Private
 */
router.post(
  '/:webhookId/rotate-secret',
  authenticate,
  rateLimitAPI,
  [
    param('webhookId').isUUID(),
  ],
  validateRequest,
  webhookController.rotateWebhookSecret
);

export default router;
