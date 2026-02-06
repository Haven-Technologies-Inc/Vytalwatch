import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { DevicePlatform } from '../entities/device-token.entity';

export interface FcmNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  icon?: string;
  badge?: string;
  sound?: string;
  tag?: string;
  color?: string;
  clickAction?: string;
  bodyLocKey?: string;
  bodyLocArgs?: string[];
  titleLocKey?: string;
  titleLocArgs?: string[];
}

export interface FcmDataPayload {
  [key: string]: string;
}

export interface FcmMessage {
  token: string;
  notification?: FcmNotificationPayload;
  data?: FcmDataPayload;
  android?: admin.messaging.AndroidConfig;
  apns?: admin.messaging.ApnsConfig;
  webpush?: admin.messaging.WebpushConfig;
  fcmOptions?: admin.messaging.FcmOptions;
}

export interface FcmResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class FcmProvider {
  private readonly logger = new Logger(FcmProvider.name);
  private firebaseApp: admin.app.App;
  private initialized = false;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize(): void {
    try {
      const fcmConfig = this.configService.get('fcm');

      if (!fcmConfig?.projectId || !fcmConfig?.privateKey || !fcmConfig?.clientEmail) {
        this.logger.warn('FCM configuration not found. Push notifications via FCM will be disabled.');
        return;
      }

      // Initialize Firebase Admin SDK
      this.firebaseApp = admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId: fcmConfig.projectId,
            privateKey: fcmConfig.privateKey.replace(/\\n/g, '\n'),
            clientEmail: fcmConfig.clientEmail,
          }),
        },
        'push-notifications',
      );

      this.initialized = true;
      this.logger.log('FCM Provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize FCM Provider', error);
    }
  }

  async sendNotification(message: FcmMessage, retryCount = 0): Promise<FcmResponse> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'FCM Provider not initialized',
        errorCode: 'NOT_INITIALIZED',
      };
    }

    try {
      const messaging = admin.messaging(this.firebaseApp);

      // Build the message
      const fcmMessage: admin.messaging.Message = {
        token: message.token,
        notification: message.notification
          ? {
              title: message.notification.title,
              body: message.notification.body,
              imageUrl: message.notification.imageUrl,
            }
          : undefined,
        data: message.data,
        android: message.android || this.getDefaultAndroidConfig(message),
        apns: message.apns || this.getDefaultApnsConfig(message),
        webpush: message.webpush || this.getDefaultWebPushConfig(message),
        fcmOptions: message.fcmOptions,
      };

      // Send the message
      const messageId = await messaging.send(fcmMessage);

      this.logger.log(`FCM notification sent successfully. Message ID: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send FCM notification (attempt ${retryCount + 1})`, error);

      // Check if we should retry
      if (this.shouldRetry(error) && retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        return this.sendNotification(message, retryCount + 1);
      }

      return {
        success: false,
        error: error.message,
        errorCode: this.getErrorCode(error),
      };
    }
  }

  async sendMulticast(
    tokens: string[],
    message: Omit<FcmMessage, 'token'>,
  ): Promise<{ successCount: number; failureCount: number; responses: FcmResponse[] }> {
    if (!this.initialized) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        responses: tokens.map(() => ({
          success: false,
          error: 'FCM Provider not initialized',
          errorCode: 'NOT_INITIALIZED',
        })),
      };
    }

    try {
      const messaging = admin.messaging(this.firebaseApp);

      // Build multicast message
      const multicastMessage: admin.messaging.MulticastMessage = {
        tokens,
        notification: message.notification
          ? {
              title: message.notification.title,
              body: message.notification.body,
              imageUrl: message.notification.imageUrl,
            }
          : undefined,
        data: message.data,
        android: message.android || this.getDefaultAndroidConfig(message),
        apns: message.apns || this.getDefaultApnsConfig(message),
        webpush: message.webpush || this.getDefaultWebPushConfig(message),
      };

      // Send to multiple tokens
      const response = await messaging.sendMulticast(multicastMessage);

      this.logger.log(
        `FCM multicast sent. Success: ${response.successCount}, Failure: ${response.failureCount}`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses.map((resp, index) => ({
          success: resp.success,
          messageId: resp.messageId,
          error: resp.error?.message,
          errorCode: resp.error?.code,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to send FCM multicast', error);

      return {
        successCount: 0,
        failureCount: tokens.length,
        responses: tokens.map(() => ({
          success: false,
          error: error.message,
          errorCode: this.getErrorCode(error),
        })),
      };
    }
  }

  async sendToTopic(
    topic: string,
    message: Omit<FcmMessage, 'token'>,
  ): Promise<FcmResponse> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'FCM Provider not initialized',
        errorCode: 'NOT_INITIALIZED',
      };
    }

    try {
      const messaging = admin.messaging(this.firebaseApp);

      const topicMessage: admin.messaging.Message = {
        topic,
        notification: message.notification
          ? {
              title: message.notification.title,
              body: message.notification.body,
              imageUrl: message.notification.imageUrl,
            }
          : undefined,
        data: message.data,
        android: message.android || this.getDefaultAndroidConfig(message),
        apns: message.apns || this.getDefaultApnsConfig(message),
        webpush: message.webpush || this.getDefaultWebPushConfig(message),
      };

      const messageId = await messaging.send(topicMessage);

      this.logger.log(`FCM topic notification sent successfully. Message ID: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send FCM topic notification to topic: ${topic}`, error);

      return {
        success: false,
        error: error.message,
        errorCode: this.getErrorCode(error),
      };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('FCM Provider not initialized');
    }

    const messaging = admin.messaging(this.firebaseApp);
    await messaging.subscribeToTopic(tokens, topic);
    this.logger.log(`Subscribed ${tokens.length} tokens to topic: ${topic}`);
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('FCM Provider not initialized');
    }

    const messaging = admin.messaging(this.firebaseApp);
    await messaging.unsubscribeFromTopic(tokens, topic);
    this.logger.log(`Unsubscribed ${tokens.length} tokens from topic: ${topic}`);
  }

  private getDefaultAndroidConfig(message: FcmMessage): admin.messaging.AndroidConfig {
    return {
      priority: 'high',
      notification: message.notification
        ? {
            title: message.notification.title,
            body: message.notification.body,
            icon: message.notification.icon || 'ic_notification',
            color: message.notification.color || '#0066cc',
            sound: message.notification.sound || 'default',
            tag: message.notification.tag,
            clickAction: message.notification.clickAction,
            bodyLocKey: message.notification.bodyLocKey,
            bodyLocArgs: message.notification.bodyLocArgs,
            titleLocKey: message.notification.titleLocKey,
            titleLocArgs: message.notification.titleLocArgs,
            imageUrl: message.notification.imageUrl,
          }
        : undefined,
      ttl: 86400000, // 24 hours in milliseconds
    };
  }

  private getDefaultApnsConfig(message: FcmMessage): admin.messaging.ApnsConfig {
    return {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          alert: message.notification
            ? {
                title: message.notification.title,
                body: message.notification.body,
              }
            : undefined,
          sound: message.notification?.sound || 'default',
          badge: message.notification?.badge ? parseInt(message.notification.badge) : undefined,
          contentAvailable: true,
        },
      },
    };
  }

  private getDefaultWebPushConfig(message: FcmMessage): admin.messaging.WebpushConfig {
    return {
      notification: message.notification
        ? {
            title: message.notification.title,
            body: message.notification.body,
            icon: message.notification.icon || '/icon-192x192.png',
            badge: message.notification.badge || '/badge-72x72.png',
            image: message.notification.imageUrl,
            requireInteraction: false,
            tag: message.notification.tag,
          }
        : undefined,
      fcmOptions: {
        link: message.notification?.clickAction,
      },
    };
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors and temporary server errors
    const retryableErrors = [
      'messaging/internal-error',
      'messaging/server-unavailable',
      'messaging/timeout',
    ];

    return retryableErrors.includes(error.code);
  }

  private getErrorCode(error: any): string {
    if (error.code) {
      return error.code;
    }

    if (error.message?.includes('registration-token-not-registered')) {
      return 'INVALID_TOKEN';
    }

    if (error.message?.includes('invalid-argument')) {
      return 'INVALID_ARGUMENT';
    }

    return 'UNKNOWN_ERROR';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
