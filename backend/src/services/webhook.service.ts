/**
 * ReshADX - Webhook Service
 * Webhook delivery and management
 */

import axios from 'axios';
import crypto from 'crypto';
import db from '../database';
import { config } from '../config';
import { logger } from '../utils/logger';

export class WebhookService {
  /**
   * Send webhook to user's configured endpoint
   */
  async sendWebhook(userId: string, event: any): Promise<void> {
    try {
      // Get active webhooks for user
      const webhooks = await db('webhooks')
        .where({ user_id: userId, status: 'ACTIVE' })
        .whereNull('deleted_at');

      for (const webhook of webhooks) {
        // Check if webhook subscribes to this event type
        const eventTypes = webhook.event_types || [];
        if (!eventTypes.includes(event.type) && !eventTypes.includes('*')) {
          continue;
        }

        // Send webhook
        await this.deliverWebhook(webhook, event);
      }
    } catch (error) {
      logger.error('Error sending webhooks', { error, userId });
    }
  }

  /**
   * Deliver individual webhook
   */
  private async deliverWebhook(webhook: any, event: any): Promise<void> {
    const deliveryId = crypto.randomUUID();

    try {
      // Build payload
      const payload = {
        webhook_id: webhook.webhook_id,
        event_id: crypto.randomUUID(),
        event_type: event.type,
        timestamp: new Date().toISOString(),
        data: event,
      };

      // Generate signature
      const signature = this.generateSignature(
        JSON.stringify(payload),
        webhook.secret
      );

      // Send HTTP request
      const startTime = Date.now();
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-ReshADX-Signature': signature,
          'X-ReshADX-Delivery-ID': deliveryId,
        },
        timeout: config.webhooks.timeoutMs,
      });

      const responseTime = Date.now() - startTime;

      // Log successful delivery
      await db('webhook_deliveries').insert({
        webhook_id: webhook.webhook_id,
        user_id: webhook.user_id,
        event_type: event.type,
        event_id: payload.event_id,
        payload: JSON.stringify(payload),
        attempt_number: 1,
        attempted_at: new Date(),
        request_url: webhook.url,
        request_signature: signature,
        response_status_code: response.status,
        response_time_ms: responseTime,
        status: 'SUCCESS',
      });

      // Update webhook stats
      await db('webhooks')
        .where({ webhook_id: webhook.webhook_id })
        .update({
          total_deliveries: db.raw('total_deliveries + 1'),
          successful_deliveries: db.raw('successful_deliveries + 1'),
          last_delivery_at: new Date(),
          last_successful_delivery: new Date(),
          consecutive_failures: 0,
        });

      logger.info('Webhook delivered successfully', {
        webhookId: webhook.webhook_id,
        eventType: event.type,
        responseTime,
      });
    } catch (error: any) {
      // Log failed delivery
      await db('webhook_deliveries').insert({
        webhook_id: webhook.webhook_id,
        user_id: webhook.user_id,
        event_type: event.type,
        payload: JSON.stringify(event),
        attempt_number: 1,
        attempted_at: new Date(),
        request_url: webhook.url,
        response_status_code: error.response?.status || 0,
        status: 'FAILED',
        error_message: error.message,
        error_type: error.code || 'UNKNOWN',
      });

      // Update webhook stats
      const consecutiveFailures = webhook.consecutive_failures + 1;
      const updates: any = {
        total_deliveries: db.raw('total_deliveries + 1'),
        failed_deliveries: db.raw('failed_deliveries + 1'),
        last_delivery_at: new Date(),
        last_failed_delivery: new Date(),
        last_error_message: error.message,
        consecutive_failures: consecutiveFailures,
      };

      // Auto-pause if threshold exceeded
      if (
        webhook.auto_pause_on_failure &&
        consecutiveFailures >= webhook.auto_pause_threshold
      ) {
        updates.status = 'PAUSED';
        updates.paused_at = new Date();
        updates.pause_reason = `Auto-paused after ${consecutiveFailures} consecutive failures`;
      }

      await db('webhooks')
        .where({ webhook_id: webhook.webhook_id })
        .update(updates);

      logger.error('Webhook delivery failed', {
        webhookId: webhook.webhook_id,
        error: error.message,
      });

      // Retry if configured
      if (webhook.enable_retry && consecutiveFailures < webhook.max_retry_attempts) {
        this.scheduleRetry(webhook, event, consecutiveFailures + 1);
      }
    }
  }

  /**
   * Schedule webhook retry
   */
  private async scheduleRetry(
    webhook: any,
    event: any,
    attemptNumber: number
  ): Promise<void> {
    // Exponential backoff
    const delayMs = webhook.retry_delay_seconds * 1000 * Math.pow(2, attemptNumber - 1);

    setTimeout(() => {
      this.deliverWebhook(webhook, event);
    }, delayMs);

    logger.info('Webhook retry scheduled', {
      webhookId: webhook.webhook_id,
      attemptNumber,
      delayMs,
    });
  }

  /**
   * Generate HMAC signature for webhook
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
}
