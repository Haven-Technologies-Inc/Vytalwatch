import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as apn from 'apn';

export interface ApnsNotificationPayload {
  title: string;
  subtitle?: string;
  body: string;
  badge?: number;
  sound?: string;
  category?: string;
  threadId?: string;
  launchImage?: string;
  titleLocKey?: string;
  titleLocArgs?: string[];
  subtitleLocKey?: string;
  subtitleLocArgs?: string[];
  locKey?: string;
  locArgs?: string[];
}

export interface ApnsDataPayload {
  [key: string]: any;
}

export interface ApnsMessage {
  token: string;
  notification: ApnsNotificationPayload;
  data?: ApnsDataPayload;
  priority?: number; // 10 = immediate, 5 = power considerations
  expiry?: number; // Unix timestamp
  collapseId?: string;
  topic?: string;
  contentAvailable?: boolean;
  mutableContent?: boolean;
}

export interface ApnsResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class ApnsProvider {
  private readonly logger = new Logger(ApnsProvider.name);
  private apnProvider: apn.Provider;
  private initialized = false;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize(): void {
    try {
      const apnsConfig = this.configService.get('apns');

      if (!apnsConfig?.teamId || !apnsConfig?.keyId || !apnsConfig?.key) {
        this.logger.warn('APNS configuration not found. Push notifications via APNS will be disabled.');
        return;
      }

      // Initialize APNS Provider
      const options: apn.ProviderOptions = {
        token: {
          key: apnsConfig.key.replace(/\\n/g, '\n'),
          keyId: apnsConfig.keyId,
          teamId: apnsConfig.teamId,
        },
        production: apnsConfig.production !== false,
      };

      this.apnProvider = new apn.Provider(options);

      this.initialized = true;
      this.logger.log(
        `APNS Provider initialized successfully (${options.production ? 'production' : 'sandbox'})`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize APNS Provider', error);
    }
  }

  async sendNotification(message: ApnsMessage, retryCount = 0): Promise<ApnsResponse> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'APNS Provider not initialized',
        errorCode: 'NOT_INITIALIZED',
      };
    }

    try {
      const notification = new apn.Notification();

      // Set alert
      notification.alert = {
        title: message.notification.title,
        subtitle: message.notification.subtitle,
        body: message.notification.body,
        'title-loc-key': message.notification.titleLocKey,
        'title-loc-args': message.notification.titleLocArgs,
        'subtitle-loc-key': message.notification.subtitleLocKey,
        'subtitle-loc-args': message.notification.subtitleLocArgs,
        'loc-key': message.notification.locKey,
        'loc-args': message.notification.locArgs,
        'launch-image': message.notification.launchImage,
      };

      // Set badge
      if (message.notification.badge !== undefined) {
        notification.badge = message.notification.badge;
      }

      // Set sound
      notification.sound = message.notification.sound || 'default';

      // Set category
      if (message.notification.category) {
        notification.category = message.notification.category;
      }

      // Set thread ID
      if (message.notification.threadId) {
        notification.threadId = message.notification.threadId;
      }

      // Set priority
      notification.priority = message.priority || 10;

      // Set expiry
      if (message.expiry) {
        notification.expiry = message.expiry;
      } else {
        // Default to 24 hours
        notification.expiry = Math.floor(Date.now() / 1000) + 86400;
      }

      // Set collapse ID
      if (message.collapseId) {
        notification.collapseId = message.collapseId;
      }

      // Set topic (bundle ID)
      if (message.topic) {
        notification.topic = message.topic;
      } else {
        const apnsConfig = this.configService.get('apns');
        notification.topic = apnsConfig?.bundleId || 'com.vitalwatch.app';
      }

      // Set content available
      if (message.contentAvailable) {
        notification.contentAvailable = true;
      }

      // Set mutable content
      if (message.mutableContent) {
        notification.mutableContent = true;
      }

      // Set custom payload
      if (message.data) {
        notification.payload = message.data;
      }

      // Send notification
      const result = await this.apnProvider.send(notification, message.token);

      if (result.sent.length > 0) {
        this.logger.log(`APNS notification sent successfully to token: ${message.token}`);
        return { success: true };
      }

      if (result.failed.length > 0) {
        const failure = result.failed[0];
        this.logger.error(`APNS notification failed: ${failure.response?.reason}`, failure.error);

        // Check if we should retry
        if (this.shouldRetry(failure.response?.reason) && retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
          return this.sendNotification(message, retryCount + 1);
        }

        return {
          success: false,
          error: failure.response?.reason || failure.error?.message,
          errorCode: this.getErrorCode(failure.response?.reason),
        };
      }

      return { success: false, error: 'Unknown error', errorCode: 'UNKNOWN_ERROR' };
    } catch (error) {
      this.logger.error(`Failed to send APNS notification (attempt ${retryCount + 1})`, error);

      // Check if we should retry
      if (retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.sendNotification(message, retryCount + 1);
      }

      return {
        success: false,
        error: error.message,
        errorCode: 'SEND_ERROR',
      };
    }
  }

  async sendMultiple(messages: ApnsMessage[]): Promise<ApnsResponse[]> {
    if (!this.initialized) {
      return messages.map(() => ({
        success: false,
        error: 'APNS Provider not initialized',
        errorCode: 'NOT_INITIALIZED',
      }));
    }

    const results = await Promise.all(messages.map((message) => this.sendNotification(message)));
    return results;
  }

  async sendSilentNotification(
    token: string,
    data: ApnsDataPayload,
    topic?: string,
  ): Promise<ApnsResponse> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'APNS Provider not initialized',
        errorCode: 'NOT_INITIALIZED',
      };
    }

    try {
      const notification = new apn.Notification();

      // Silent notification
      notification.contentAvailable = true;
      notification.priority = 5; // Power considerations for silent notifications
      notification.pushType = 'background';
      notification.payload = data;

      // Set topic
      if (topic) {
        notification.topic = topic;
      } else {
        const apnsConfig = this.configService.get('apns');
        notification.topic = apnsConfig?.bundleId || 'com.vitalwatch.app';
      }

      // Set expiry to 24 hours
      notification.expiry = Math.floor(Date.now() / 1000) + 86400;

      const result = await this.apnProvider.send(notification, token);

      if (result.sent.length > 0) {
        this.logger.log(`APNS silent notification sent successfully to token: ${token}`);
        return { success: true };
      }

      if (result.failed.length > 0) {
        const failure = result.failed[0];
        this.logger.error(
          `APNS silent notification failed: ${failure.response?.reason}`,
          failure.error,
        );

        return {
          success: false,
          error: failure.response?.reason || failure.error?.message,
          errorCode: this.getErrorCode(failure.response?.reason),
        };
      }

      return { success: false, error: 'Unknown error', errorCode: 'UNKNOWN_ERROR' };
    } catch (error) {
      this.logger.error('Failed to send APNS silent notification', error);

      return {
        success: false,
        error: error.message,
        errorCode: 'SEND_ERROR',
      };
    }
  }

  private shouldRetry(reason?: string): boolean {
    // Retry on temporary errors
    const retryableReasons = [
      'ServiceUnavailable',
      'InternalServerError',
      'Shutdown',
      'TooManyRequests',
    ];

    return reason ? retryableReasons.includes(reason) : false;
  }

  private getErrorCode(reason?: string): string {
    if (!reason) {
      return 'UNKNOWN_ERROR';
    }

    const errorCodeMap: Record<string, string> = {
      BadDeviceToken: 'INVALID_TOKEN',
      Unregistered: 'INVALID_TOKEN',
      DeviceTokenNotForTopic: 'INVALID_TOPIC',
      BadCertificate: 'INVALID_CERTIFICATE',
      BadCertificateEnvironment: 'INVALID_ENVIRONMENT',
      ExpiredProviderToken: 'EXPIRED_PROVIDER_TOKEN',
      Forbidden: 'FORBIDDEN',
      InvalidProviderToken: 'INVALID_PROVIDER_TOKEN',
      MissingProviderToken: 'MISSING_PROVIDER_TOKEN',
      BadPath: 'BAD_PATH',
      MethodNotAllowed: 'METHOD_NOT_ALLOWED',
      TooManyRequests: 'TOO_MANY_REQUESTS',
      InternalServerError: 'INTERNAL_SERVER_ERROR',
      ServiceUnavailable: 'SERVICE_UNAVAILABLE',
      Shutdown: 'SHUTDOWN',
    };

    return errorCodeMap[reason] || reason;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async shutdown(): Promise<void> {
    if (this.initialized && this.apnProvider) {
      await this.apnProvider.shutdown();
      this.logger.log('APNS Provider shutdown successfully');
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
