/**
 * ReshADX - Webhook Controller (COMPLETE IMPLEMENTATION)
 * Webhook management endpoints with WebhookService integration
 */

import { Request, Response } from 'express';
import { WebhookService } from '../services/webhook.service';
import { logger } from '../utils/logger';
import db from '../database';

const webhookService = new WebhookService();

export class WebhookController {
  /**
   * Create webhook
   * POST /api/v1/webhooks
   */
  async createWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { url, events, description } = req.body;

      if (!url || !events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'URL and events are required',
          },
        });
      }

      const webhook = await webhookService.createWebhook(userId, {
        url,
        events,
        description,
      });

      return res.status(201).json({
        success: true,
        data: { webhook },
        message: 'Webhook created successfully',
      });
    } catch (error) {
      logger.error('Create webhook error', { error, userId: req.user?.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create webhook',
        },
      });
    }
  }

  /**
   * Get all webhooks for user
   * GET /api/v1/webhooks
   */
  async getWebhooks(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const webhooks = await db('webhooks')
        .where({ user_id: userId })
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc');

      return res.status(200).json({
        success: true,
        data: {
          webhooks: webhooks.map(w => ({
            webhookId: w.webhook_id,
            url: w.url,
            events: w.events,
            description: w.description,
            status: w.status,
            createdAt: w.created_at,
            lastDeliveredAt: w.last_delivered_at,
            deliveryStats: {
              totalDeliveries: w.total_deliveries || 0,
              successfulDeliveries: w.successful_deliveries || 0,
              failedDeliveries: w.failed_deliveries || 0,
            },
          })),
        },
      });
    } catch (error) {
      logger.error('Get webhooks error', { error, userId: req.user?.userId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch webhooks',
        },
      });
    }
  }

  /**
   * Get specific webhook
   * GET /api/v1/webhooks/:webhookId
   */
  async getWebhookById(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { webhookId } = req.params;

      const webhook = await db('webhooks')
        .where({ webhook_id: webhookId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          webhook: {
            webhookId: webhook.webhook_id,
            url: webhook.url,
            events: webhook.events,
            description: webhook.description,
            status: webhook.status,
            secret: webhook.secret.substring(0, 8) + '...',
            createdAt: webhook.created_at,
            updatedAt: webhook.updated_at,
            lastDeliveredAt: webhook.last_delivered_at,
            deliveryStats: {
              totalDeliveries: webhook.total_deliveries || 0,
              successfulDeliveries: webhook.successful_deliveries || 0,
              failedDeliveries: webhook.failed_deliveries || 0,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Get webhook error', { error, webhookId: req.params.webhookId });
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Webhook not found',
        },
      });
    }
  }

  /**
   * Update webhook configuration
   * PATCH /api/v1/webhooks/:webhookId
   */
  async updateWebhookConfig(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { webhookId } = req.params;
      const { url, events, description, status } = req.body;

      const webhook = await db('webhooks')
        .where({ webhook_id: webhookId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        });
      }

      const updates: any = { updated_at: new Date() };
      if (url) updates.url = url;
      if (events) updates.events = events;
      if (description !== undefined) updates.description = description;
      if (status) updates.status = status;

      await db('webhooks')
        .where({ webhook_id: webhookId })
        .update(updates);

      return res.status(200).json({
        success: true,
        message: 'Webhook updated successfully',
      });
    } catch (error) {
      logger.error('Update webhook error', { error, webhookId: req.params.webhookId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update webhook',
        },
      });
    }
  }

  /**
   * Delete webhook
   * DELETE /api/v1/webhooks/:webhookId
   */
  async deleteWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { webhookId } = req.params;

      const webhook = await db('webhooks')
        .where({ webhook_id: webhookId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        });
      }

      await db('webhooks')
        .where({ webhook_id: webhookId })
        .update({
          deleted_at: new Date(),
          status: 'DISABLED',
        });

      return res.status(200).json({
        success: true,
        message: 'Webhook deleted successfully',
      });
    } catch (error) {
      logger.error('Delete webhook error', { error, webhookId: req.params.webhookId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete webhook',
        },
      });
    }
  }

  /**
   * Get webhook deliveries
   * GET /api/v1/webhooks/:webhookId/deliveries
   */
  async getWebhookDeliveries(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { webhookId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Verify webhook belongs to user
      const webhook = await db('webhooks')
        .where({ webhook_id: webhookId, user_id: userId })
        .first();

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        });
      }

      const deliveries = await db('webhook_deliveries')
        .where({ webhook_id: webhookId })
        .orderBy('attempted_at', 'desc')
        .limit(limit)
        .offset(offset);

      const total = await db('webhook_deliveries')
        .where({ webhook_id: webhookId })
        .count('* as count')
        .first();

      return res.status(200).json({
        success: true,
        data: {
          deliveries: deliveries.map(d => ({
            deliveryId: d.delivery_id,
            eventType: d.event_type,
            status: d.status,
            httpStatus: d.http_status,
            attemptCount: d.attempt_count,
            attemptedAt: d.attempted_at,
            nextRetry: d.next_retry_at,
            error: d.error_message,
          })),
          pagination: {
            total: parseInt(total?.count as string || '0'),
            limit,
            offset,
          },
        },
      });
    } catch (error) {
      logger.error('Get webhook deliveries error', { error, webhookId: req.params.webhookId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch webhook deliveries',
        },
      });
    }
  }

  /**
   * Test webhook
   * POST /api/v1/webhooks/:webhookId/test
   */
  async testWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { webhookId } = req.params;

      const webhook = await db('webhooks')
        .where({ webhook_id: webhookId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        });
      }

      // Send test event
      await webhookService.sendWebhook(userId, {
        type: 'WEBHOOK_TEST',
        webhookId,
        timestamp: new Date(),
        data: {
          message: 'This is a test webhook event',
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Test webhook sent successfully',
      });
    } catch (error) {
      logger.error('Test webhook error', { error, webhookId: req.params.webhookId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send test webhook',
        },
      });
    }
  }

  /**
   * Rotate webhook secret
   * POST /api/v1/webhooks/:webhookId/rotate-secret
   */
  async rotateWebhookSecret(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { webhookId } = req.params;

      const webhook = await db('webhooks')
        .where({ webhook_id: webhookId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        });
      }

      const newSecret = await webhookService.rotateSecret(webhookId);

      return res.status(200).json({
        success: true,
        data: {
          secret: newSecret,
        },
        message: 'Webhook secret rotated successfully. Please update your webhook handler.',
      });
    } catch (error) {
      logger.error('Rotate webhook secret error', { error, webhookId: req.params.webhookId });
      return res.status(500).json({
        success: false,
        error: {
          code: 'ROTATION_ERROR',
          message: 'Failed to rotate webhook secret',
        },
      });
    }
  }
}
