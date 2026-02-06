import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DeviceToken,
  DevicePlatform,
  TokenStatus,
} from './entities/device-token.entity';
import { FcmProvider } from './providers/fcm.provider';
import { ApnsProvider } from './providers/apns.provider';
import { WebPushProvider } from './providers/web-push.provider';
import {
  NotificationTemplate,
  NotificationPriority,
} from './templates/notification-templates';
import {
  Notification,
  NotificationType,
  NotificationStatus,
} from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';

export interface PushNotificationPayload {
  title: string;
  body: string;
  category?: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  sound?: string;
  icon?: string;
  color?: string;
  deepLink?: string;
  imageUrl?: string;
  badge?: number;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface SendResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  payload: PushNotificationPayload;
  scheduledFor: Date;
  sent: boolean;
}

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private readonly rateLimits: Map<string, number[]> = new Map(); // userId -> timestamps
  private readonly maxNotificationsPerHour = 50;

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly fcmProvider: FcmProvider,
    private readonly apnsProvider: ApnsProvider,
    private readonly webPushProvider: WebPushProvider,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Register a device token for push notifications
   */
  async registerDevice(
    userId: string,
    token: string,
    platform: DevicePlatform,
    deviceInfo?: any,
    preferences?: any,
  ): Promise<DeviceToken> {
    try {
      // Check if token already exists
      let deviceToken = await this.deviceTokenRepository.findOne({
        where: { token },
      });

      if (deviceToken) {
        // Update existing token
        deviceToken.userId = userId;
        deviceToken.platform = platform;
        deviceToken.deviceInfo = deviceInfo || deviceToken.deviceInfo;
        deviceToken.preferences = preferences || deviceToken.preferences;
        deviceToken.enabled = true;
        deviceToken.status = TokenStatus.ACTIVE;
        deviceToken.failureCount = 0;
        deviceToken.lastUsedAt = new Date();

        this.logger.log(`Updated device token for user ${userId}`);
      } else {
        // Create new token
        deviceToken = this.deviceTokenRepository.create({
          userId,
          token,
          platform,
          deviceInfo,
          preferences,
          enabled: true,
          status: TokenStatus.ACTIVE,
          lastUsedAt: new Date(),
        });

        this.logger.log(`Registered new device token for user ${userId}`);
      }

      const savedToken = await this.deviceTokenRepository.save(deviceToken);

      // Subscribe to user's topics
      await this.subscribeDeviceToUserTopics(savedToken);

      // Emit event
      this.eventEmitter.emit('device.registered', {
        userId,
        deviceId: savedToken.id,
        platform,
      });

      return savedToken;
    } catch (error) {
      this.logger.error(`Failed to register device token for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterDevice(userId: string, deviceId: string): Promise<void> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: { id: deviceId, userId },
    });

    if (!deviceToken) {
      throw new NotFoundException('Device not found');
    }

    await this.deviceTokenRepository.remove(deviceToken);

    this.logger.log(`Unregistered device ${deviceId} for user ${userId}`);

    // Emit event
    this.eventEmitter.emit('device.unregistered', {
      userId,
      deviceId,
      platform: deviceToken.platform,
    });
  }

  /**
   * Send notification to a specific user
   */
  async sendNotification(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<SendResult> {
    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      this.logger.warn(`Rate limit exceeded for user ${userId}`);
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['Rate limit exceeded'],
      };
    }

    // Get active devices for user
    const devices = await this.getActiveDevices(userId);

    if (devices.length === 0) {
      this.logger.warn(`No active devices found for user ${userId}`);
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['No active devices found'],
      };
    }

    // Filter devices based on preferences
    const eligibleDevices = devices.filter((device) =>
      device.shouldReceiveNotification(
        payload.category || 'general',
        payload.priority || NotificationPriority.MEDIUM,
      ),
    );

    if (eligibleDevices.length === 0) {
      this.logger.log(`No eligible devices for user ${userId} due to preferences`);
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['No eligible devices due to user preferences'],
      };
    }

    // Create notification record
    const notification = await this.createNotificationRecord(userId, payload);

    // Send to devices
    const results = await Promise.all(
      eligibleDevices.map((device) => this.sendToDevice(device, payload)),
    );

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;
    const errors = results.filter((r) => !r.success).map((r) => r.error || 'Unknown error');

    // Update notification status
    if (sentCount > 0) {
      await this.notificationsService.updateNotificationStatus(
        notification.id,
        NotificationStatus.SENT,
      );
    } else {
      await this.notificationsService.updateNotificationStatus(
        notification.id,
        NotificationStatus.FAILED,
        undefined,
        errors.join(', '),
      );
    }

    // Track analytics
    this.trackNotificationSent(userId, payload, sentCount, failedCount);

    this.logger.log(
      `Sent notification to user ${userId}: ${sentCount} successful, ${failedCount} failed`,
    );

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      errors: failedCount > 0 ? errors : undefined,
    };
  }

  /**
   * Send notification to multiple users
   */
  async sendToMultiple(
    userIds: string[],
    payload: PushNotificationPayload,
  ): Promise<SendResult> {
    const results = await Promise.all(
      userIds.map((userId) => this.sendNotification(userId, payload)),
    );

    const totalSent = results.reduce((sum, r) => sum + r.sentCount, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failedCount, 0);
    const allErrors = results.flatMap((r) => r.errors || []);

    this.logger.log(
      `Batch notification sent to ${userIds.length} users: ${totalSent} successful, ${totalFailed} failed`,
    );

    return {
      success: totalSent > 0,
      sentCount: totalSent,
      failedCount: totalFailed,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(topic: string, payload: PushNotificationPayload): Promise<SendResult> {
    try {
      // Send via FCM (supports topic messaging)
      if (this.fcmProvider.isInitialized()) {
        const result = await this.fcmProvider.sendToTopic(topic, {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon,
            color: payload.color,
            sound: payload.sound,
            imageUrl: payload.imageUrl,
          },
          data: this.serializeData(payload.data),
        });

        if (result.success) {
          this.logger.log(`Topic notification sent to ${topic}`);
          return {
            success: true,
            sentCount: 1,
            failedCount: 0,
          };
        } else {
          this.logger.error(`Failed to send topic notification to ${topic}`, result.error);
          return {
            success: false,
            sentCount: 0,
            failedCount: 1,
            errors: [result.error || 'Unknown error'],
          };
        }
      }

      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: ['FCM provider not initialized'],
      };
    } catch (error) {
      this.logger.error(`Failed to send topic notification to ${topic}`, error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [error.message],
      };
    }
  }

  /**
   * Schedule a notification for later delivery
   */
  async scheduleNotification(
    userId: string,
    payload: PushNotificationPayload,
    scheduledFor: Date,
  ): Promise<ScheduledNotification> {
    if (scheduledFor <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const id = `${userId}-${Date.now()}`;
    const scheduled: ScheduledNotification = {
      id,
      userId,
      payload,
      scheduledFor,
      sent: false,
    };

    this.scheduledNotifications.set(id, scheduled);

    this.logger.log(`Scheduled notification ${id} for user ${userId} at ${scheduledFor}`);

    return scheduled;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduled(notificationId: string): Promise<void> {
    if (!this.scheduledNotifications.has(notificationId)) {
      throw new NotFoundException('Scheduled notification not found');
    }

    this.scheduledNotifications.delete(notificationId);
    this.logger.log(`Cancelled scheduled notification ${notificationId}`);
  }

  /**
   * Get user's devices
   */
  async getUserDevices(
    userId: string,
    platform?: DevicePlatform,
    enabledOnly = true,
  ): Promise<DeviceToken[]> {
    const where: any = { userId };

    if (platform) {
      where.platform = platform;
    }

    if (enabledOnly) {
      where.enabled = true;
      where.status = TokenStatus.ACTIVE;
    }

    return this.deviceTokenRepository.find({ where });
  }

  /**
   * Update device preferences
   */
  async updateDevicePreferences(
    userId: string,
    deviceId: string,
    enabled?: boolean,
    preferences?: any,
  ): Promise<DeviceToken> {
    const device = await this.deviceTokenRepository.findOne({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (enabled !== undefined) {
      device.enabled = enabled;
    }

    if (preferences) {
      device.preferences = { ...device.preferences, ...preferences };
    }

    await this.deviceTokenRepository.save(device);

    this.logger.log(`Updated preferences for device ${deviceId}`);

    return device;
  }

  /**
   * Update badge count for iOS devices
   */
  async updateBadgeCount(userId: string, badgeCount: number): Promise<void> {
    const iosDevices = await this.deviceTokenRepository.find({
      where: {
        userId,
        platform: DevicePlatform.IOS,
        enabled: true,
        status: TokenStatus.ACTIVE,
      },
    });

    for (const device of iosDevices) {
      device.badgeCount = badgeCount;
    }

    await this.deviceTokenRepository.save(iosDevices);

    this.logger.log(`Updated badge count to ${badgeCount} for user ${userId}`);
  }

  /**
   * Increment badge count for iOS devices
   */
  async incrementBadge(userId: string, increment = 1): Promise<void> {
    const iosDevices = await this.deviceTokenRepository.find({
      where: {
        userId,
        platform: DevicePlatform.IOS,
        enabled: true,
        status: TokenStatus.ACTIVE,
      },
    });

    for (const device of iosDevices) {
      device.badgeCount += increment;
    }

    await this.deviceTokenRepository.save(iosDevices);

    this.logger.log(`Incremented badge count by ${increment} for user ${userId}`);
  }

  /**
   * Reset badge count for iOS devices
   */
  async resetBadge(userId: string): Promise<void> {
    await this.updateBadgeCount(userId, 0);
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      category?: string;
      priority?: NotificationPriority;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { page = 1, limit = 20, category, priority, startDate, endDate } = options || {};

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.type = :type', { type: NotificationType.PUSH });

    if (category) {
      queryBuilder.andWhere('notification.category = :category', { category });
    }

    if (priority) {
      queryBuilder.andWhere("notification.data->>'priority' = :priority", { priority });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('notification.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('notification.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('notification.createdAt <= :endDate', { endDate });
    }

    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return { notifications, total };
  }

  /**
   * Send notification to a device
   */
  private async sendToDevice(
    device: DeviceToken,
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let result: any;

      switch (device.platform) {
        case DevicePlatform.ANDROID:
        case DevicePlatform.IOS:
          // Use FCM for both Android and iOS (unless APNS is specifically needed)
          if (this.fcmProvider.isInitialized()) {
            result = await this.fcmProvider.sendNotification({
              token: device.token,
              notification: {
                title: payload.title,
                body: payload.body,
                icon: payload.icon,
                color: payload.color,
                sound: payload.sound,
                imageUrl: payload.imageUrl,
              },
              data: this.serializeData({
                ...payload.data,
                deepLink: payload.deepLink,
                category: payload.category,
                priority: payload.priority,
              }),
            });
          } else if (device.platform === DevicePlatform.IOS && this.apnsProvider.isInitialized()) {
            // Fallback to APNS for iOS
            result = await this.apnsProvider.sendNotification({
              token: device.token,
              notification: {
                title: payload.title,
                body: payload.body,
                badge: payload.badge !== undefined ? payload.badge : device.badgeCount + 1,
                sound: payload.sound,
                category: payload.category,
              },
              data: {
                ...payload.data,
                deepLink: payload.deepLink,
              },
            });
          } else {
            return { success: false, error: 'No provider initialized' };
          }
          break;

        case DevicePlatform.WEB:
          if (this.webPushProvider.isInitialized()) {
            const subscription = this.webPushProvider.parseSubscriptionFromToken(device.token);
            if (!subscription) {
              return { success: false, error: 'Invalid web push subscription' };
            }

            result = await this.webPushProvider.sendNotification({
              subscription,
              payload: {
                title: payload.title,
                body: payload.body,
                icon: payload.icon,
                badge: payload.icon,
                image: payload.imageUrl,
                tag: payload.category,
                data: {
                  ...payload.data,
                  deepLink: payload.deepLink,
                },
                actions: payload.actions,
              },
            });
          } else {
            return { success: false, error: 'Web Push provider not initialized' };
          }
          break;

        default:
          return { success: false, error: 'Unsupported platform' };
      }

      if (result.success) {
        device.recordSuccess();
        await this.deviceTokenRepository.save(device);
        return { success: true };
      } else {
        device.recordFailure(result.error || 'Unknown error');
        await this.deviceTokenRepository.save(device);
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error(`Failed to send to device ${device.id}`, error);
      device.recordFailure(error.message);
      await this.deviceTokenRepository.save(device);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active devices for a user
   */
  private async getActiveDevices(userId: string): Promise<DeviceToken[]> {
    return this.deviceTokenRepository.find({
      where: {
        userId,
        enabled: true,
        status: TokenStatus.ACTIVE,
      },
    });
  }

  /**
   * Create notification record
   */
  private async createNotificationRecord(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<Notification> {
    return this.notificationsService.createNotification({
      userId,
      type: NotificationType.PUSH,
      category: payload.category as any,
      title: payload.title,
      body: payload.body,
      data: {
        ...payload.data,
        priority: payload.priority,
        deepLink: payload.deepLink,
        imageUrl: payload.imageUrl,
      },
    });
  }

  /**
   * Serialize data to string format for FCM
   */
  private serializeData(data?: Record<string, any>): Record<string, string> | undefined {
    if (!data) return undefined;

    const serialized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        serialized[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }

    return serialized;
  }

  /**
   * Check rate limit for user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour in milliseconds

    // Get user's timestamps
    let timestamps = this.rateLimits.get(userId) || [];

    // Remove old timestamps
    timestamps = timestamps.filter((ts) => ts > oneHourAgo);

    // Check limit
    if (timestamps.length >= this.maxNotificationsPerHour) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);
    this.rateLimits.set(userId, timestamps);

    return true;
  }

  /**
   * Track notification analytics
   */
  private trackNotificationSent(
    userId: string,
    payload: PushNotificationPayload,
    sentCount: number,
    failedCount: number,
  ): void {
    this.eventEmitter.emit('notification.sent', {
      userId,
      category: payload.category,
      priority: payload.priority,
      sentCount,
      failedCount,
      timestamp: new Date(),
    });
  }

  /**
   * Subscribe device to user topics
   */
  private async subscribeDeviceToUserTopics(device: DeviceToken): Promise<void> {
    if (!this.fcmProvider.isInitialized()) {
      return;
    }

    try {
      // Subscribe to user-specific topic
      await this.fcmProvider.subscribeToTopic([device.token], `user-${device.userId}`);

      // Subscribe to platform-specific topic
      await this.fcmProvider.subscribeToTopic([device.token], `platform-${device.platform}`);

      this.logger.log(`Subscribed device ${device.id} to user topics`);
    } catch (error) {
      this.logger.error(`Failed to subscribe device ${device.id} to topics`, error);
    }
  }

  /**
   * Process scheduled notifications (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();

    for (const [id, scheduled] of this.scheduledNotifications.entries()) {
      if (!scheduled.sent && scheduled.scheduledFor <= now) {
        try {
          await this.sendNotification(scheduled.userId, scheduled.payload);
          scheduled.sent = true;
          this.scheduledNotifications.delete(id);
          this.logger.log(`Sent scheduled notification ${id}`);
        } catch (error) {
          this.logger.error(`Failed to send scheduled notification ${id}`, error);
        }
      }
    }
  }

  /**
   * Clean up expired tokens (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.deviceTokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      this.logger.log(`Cleaned up ${result.affected} expired device tokens`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error);
    }
  }

  /**
   * Clean up invalid tokens (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupInvalidTokens(): Promise<void> {
    try {
      // Remove tokens with more than 10 consecutive failures
      const result = await this.deviceTokenRepository
        .createQueryBuilder()
        .delete()
        .where('failureCount >= :count', { count: 10 })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} invalid device tokens`);
    } catch (error) {
      this.logger.error('Failed to cleanup invalid tokens', error);
    }
  }

  /**
   * Send notification from template
   */
  async sendFromTemplate(userId: string, template: NotificationTemplate): Promise<SendResult> {
    return this.sendNotification(userId, {
      title: template.title,
      body: template.body,
      category: template.category,
      priority: template.priority,
      data: template.data,
      sound: template.sound,
      icon: template.icon,
      color: template.color,
      deepLink: template.deepLink,
      imageUrl: template.imageUrl,
      actions: template.actions,
    });
  }
}
