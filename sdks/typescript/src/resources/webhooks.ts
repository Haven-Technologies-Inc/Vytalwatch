/**
 * ReshADX TypeScript SDK - Webhooks Resource
 */

import { HttpClient } from '../utils/http';
import { CreateWebhookRequest, Webhook, WebhookDelivery, WebhookEvent } from '../types';
import crypto from 'crypto';

export class Webhooks {
  constructor(private http: HttpClient) {}

  /**
   * Create a new webhook
   */
  async create(request: CreateWebhookRequest): Promise<{ webhook: Webhook }> {
    return this.http.post('/webhooks', request);
  }

  /**
   * List all webhooks
   */
  async list(): Promise<{ webhooks: Webhook[] }> {
    return this.http.get('/webhooks');
  }

  /**
   * Get webhook details
   */
  async get(webhookId: string): Promise<{ webhook: Webhook }> {
    return this.http.get(`/webhooks/${webhookId}`);
  }

  /**
   * Update webhook
   */
  async update(
    webhookId: string,
    updates: {
      url?: string;
      events?: WebhookEvent[];
      description?: string;
      status?: 'ACTIVE' | 'INACTIVE';
    }
  ): Promise<{ webhook: Webhook }> {
    return this.http.patch(`/webhooks/${webhookId}`, updates);
  }

  /**
   * Delete webhook
   */
  async delete(webhookId: string): Promise<{ success: boolean }> {
    return this.http.delete(`/webhooks/${webhookId}`);
  }

  /**
   * Test webhook (send test event)
   */
  async test(webhookId: string): Promise<{
    deliveryId: string;
    status: string;
  }> {
    return this.http.post(`/webhooks/${webhookId}/test`);
  }

  /**
   * Rotate webhook secret
   */
  async rotateSecret(webhookId: string): Promise<{ secret: string }> {
    return this.http.post(`/webhooks/${webhookId}/rotate-secret`);
  }

  /**
   * Get webhook deliveries (logs)
   */
  async getDeliveries(
    webhookId: string,
    params: {
      status?: 'PENDING' | 'SENT' | 'FAILED';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    deliveries: WebhookDelivery[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> {
    return this.http.get(`/webhooks/${webhookId}/deliveries`, { params });
  }

  /**
   * Retry failed webhook delivery
   */
  async retryDelivery(webhookId: string, deliveryId: string): Promise<{
    deliveryId: string;
    status: string;
  }> {
    return this.http.post(`/webhooks/${webhookId}/deliveries/${deliveryId}/retry`);
  }

  /**
   * Verify webhook signature
   * Use this in your webhook endpoint to verify the request is from ReshADX
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse webhook payload
   * Helper to parse and validate webhook payload
   */
  static parsePayload<T = any>(
    rawBody: string,
    signature: string,
    secret: string
  ): T | null {
    if (!this.verifySignature(rawBody, signature, secret)) {
      return null;
    }

    try {
      return JSON.parse(rawBody) as T;
    } catch (error) {
      return null;
    }
  }
}
