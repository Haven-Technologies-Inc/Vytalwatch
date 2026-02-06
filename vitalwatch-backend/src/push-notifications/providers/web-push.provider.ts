import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

export interface WebPushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  vibrate?: number[];
  sound?: string;
  dir?: 'auto' | 'ltr' | 'rtl';
  tag?: string;
  requireInteraction?: boolean;
  renotify?: boolean;
  silent?: boolean;
  timestamp?: number;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
}

export interface WebPushMessage {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  payload: WebPushNotificationPayload;
  options?: {
    TTL?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    topic?: string;
  };
}

export interface WebPushResponse {
  success: boolean;
  statusCode?: number;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class WebPushProvider {
  private readonly logger = new Logger(WebPushProvider.name);
  private initialized = false;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize(): void {
    try {
      const webPushConfig = this.configService.get('webPush');

      if (!webPushConfig?.publicKey || !webPushConfig?.privateKey) {
        this.logger.warn(
          'Web Push configuration not found. Push notifications via Web Push will be disabled.',
        );
        return;
      }

      // Set VAPID details
      webpush.setVapidDetails(
        webPushConfig.subject || 'mailto:support@vitalwatch.ai',
        webPushConfig.publicKey,
        webPushConfig.privateKey,
      );

      this.initialized = true;
      this.logger.log('Web Push Provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Web Push Provider', error);
    }
  }

  async sendNotification(message: WebPushMessage, retryCount = 0): Promise<WebPushResponse> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'Web Push Provider not initialized',
        errorCode: 'NOT_INITIALIZED',
      };
    }

    try {
      const pushSubscription: webpush.PushSubscription = {
        endpoint: message.subscription.endpoint,
        keys: {
          p256dh: message.subscription.keys.p256dh,
          auth: message.subscription.keys.auth,
        },
      };

      const payload = JSON.stringify(message.payload);

      const options: webpush.RequestOptions = {
        TTL: message.options?.TTL || 86400, // 24 hours default
        urgency: message.options?.urgency || 'normal',
        topic: message.options?.topic,
      };

      const result = await webpush.sendNotification(pushSubscription, payload, options);

      this.logger.log(
        `Web Push notification sent successfully. Status: ${result.statusCode}`,
      );

      return {
        success: true,
        statusCode: result.statusCode,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send Web Push notification (attempt ${retryCount + 1})`,
        error,
      );

      // Check if we should retry
      if (this.shouldRetry(error) && retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        return this.sendNotification(message, retryCount + 1);
      }

      return {
        success: false,
        statusCode: error.statusCode,
        error: error.body || error.message,
        errorCode: this.getErrorCode(error),
      };
    }
  }

  async sendMultiple(messages: WebPushMessage[]): Promise<WebPushResponse[]> {
    if (!this.initialized) {
      return messages.map(() => ({
        success: false,
        error: 'Web Push Provider not initialized',
        errorCode: 'NOT_INITIALIZED',
      }));
    }

    const results = await Promise.all(
      messages.map((message) => this.sendNotification(message)),
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    this.logger.log(
      `Web Push batch sent. Success: ${successCount}, Failure: ${failureCount}`,
    );

    return results;
  }

  async verifySubscription(subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      const pushSubscription: webpush.PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      };

      // Send a test notification with empty payload
      await webpush.sendNotification(pushSubscription, '', { TTL: 0 });

      return true;
    } catch (error) {
      // If subscription is invalid, we'll get a 410 Gone or 404 Not Found
      if (error.statusCode === 410 || error.statusCode === 404) {
        return false;
      }

      // For other errors, assume subscription might be valid
      return true;
    }
  }

  parseSubscriptionFromToken(token: string): {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  } | null {
    try {
      // Token format: base64(JSON.stringify(subscription))
      const subscriptionJson = Buffer.from(token, 'base64').toString('utf-8');
      const subscription = JSON.parse(subscriptionJson);

      if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        return null;
      }

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse Web Push subscription from token', error);
      return null;
    }
  }

  createTokenFromSubscription(subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): string {
    // Token format: base64(JSON.stringify(subscription))
    const subscriptionJson = JSON.stringify(subscription);
    return Buffer.from(subscriptionJson).toString('base64');
  }

  private shouldRetry(error: any): boolean {
    // Retry on temporary errors
    if (!error.statusCode) {
      return true; // Network errors
    }

    const retryableStatusCodes = [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];

    return retryableStatusCodes.includes(error.statusCode);
  }

  private getErrorCode(error: any): string {
    if (!error.statusCode) {
      return 'NETWORK_ERROR';
    }

    const errorCodeMap: Record<number, string> = {
      400: 'INVALID_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'SUBSCRIPTION_NOT_FOUND',
      410: 'SUBSCRIPTION_EXPIRED',
      413: 'PAYLOAD_TOO_LARGE',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return errorCodeMap[error.statusCode] || `HTTP_${error.statusCode}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getPublicKey(): string | null {
    if (!this.initialized) {
      return null;
    }

    const webPushConfig = this.configService.get('webPush');
    return webPushConfig?.publicKey || null;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
