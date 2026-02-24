import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationCategory,
} from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  alertTypes: string[];
}

export interface SendNotificationOptions {
  user: User;
  category: NotificationCategory;
  title: string;
  message: string;
  data?: Record<string, any>;
  forceEmail?: boolean;
  forceSms?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  private getUserPreferences(user: User): NotificationPreferences {
    const defaults: NotificationPreferences = {
      email: true,
      sms: true,
      push: true,
      alertTypes: ['critical', 'high', 'medium', 'low'],
    };

    if (!user.notificationPreferences) {
      return defaults;
    }

    return {
      email: user.notificationPreferences.email ?? defaults.email,
      sms: user.notificationPreferences.sms ?? defaults.sms,
      push: user.notificationPreferences.push ?? defaults.push,
      alertTypes: user.notificationPreferences.alertTypes ?? defaults.alertTypes,
    };
  }

  private shouldSendNotification(
    preferences: NotificationPreferences,
    channel: 'email' | 'sms' | 'push',
    severity?: string,
  ): boolean {
    if (!preferences[channel]) return false;
    if (severity && !preferences.alertTypes.includes(severity)) return false;
    return true;
  }

  async sendNotification(options: SendNotificationOptions): Promise<{ email?: boolean; sms?: boolean }> {
    const { user, category, title, message, data, forceEmail, forceSms, severity } = options;
    const preferences = this.getUserPreferences(user);
    const results: { email?: boolean; sms?: boolean } = {};

    // Send email if user prefers it or forced
    if (forceEmail || this.shouldSendNotification(preferences, 'email', severity)) {
      const emailNotification = await this.createNotification({
        userId: user.id,
        type: NotificationType.EMAIL,
        category,
        title,
        body: message,
        recipient: user.email,
        data,
      });

      try {
        await this.emailService.send({
          to: user.email,
          subject: title,
          html: `<p>Hi ${user.firstName || ''},</p><p>${message}</p>`,
        });
        await this.updateNotificationStatus(emailNotification.id, NotificationStatus.SENT);
        results.email = true;
      } catch (error) {
        this.logger.error(`Failed to send email notification to ${user.email}`, error);
        await this.updateNotificationStatus(emailNotification.id, NotificationStatus.FAILED, undefined, error.message);
        results.email = false;
      }
    }

    // Send SMS if user prefers it, has phone, or forced
    if (user.phone && (forceSms || this.shouldSendNotification(preferences, 'sms', severity))) {
      const smsNotification = await this.createNotification({
        userId: user.id,
        type: NotificationType.SMS,
        category,
        title,
        body: message,
        recipient: user.phone,
        data,
      });

      const smsResult = await this.smsService.send(user.phone, `VytalWatch: ${message}`);
      await this.updateNotificationStatus(
        smsNotification.id,
        smsResult.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        smsResult.messageId,
        smsResult.error,
      );
      results.sms = smsResult.success;
    }

    // Always create in-app notification
    await this.createNotification({
      userId: user.id,
      type: NotificationType.IN_APP,
      category,
      title,
      body: message,
      data,
    });

    return results;
  }

  async sendEmailVerification(user: User): Promise<void> {
    const verificationUrl = `${this.configService.get('app.frontendUrl')}/auth/verify?token=${user.verificationToken}`;

    const notification = await this.createNotification({
      userId: user.id,
      type: NotificationType.EMAIL,
      category: NotificationCategory.SECURITY,
      title: 'Verify Your Email',
      body: `Please verify your email address by clicking the link below.`,
      recipient: user.email,
      data: { verificationUrl },
    });

    try {
      await this.emailService.sendEmailVerification(
        { email: user.email, firstName: user.firstName },
        user.verificationToken,
      );
      await this.updateNotificationStatus(notification.id, NotificationStatus.SENT);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${user.email}`, error);
      await this.updateNotificationStatus(notification.id, NotificationStatus.FAILED, undefined, error.message);
    }
  }

  async sendMagicLinkEmail(user: User, magicToken: string): Promise<void> {
    const magicLinkUrl = `${this.configService.get('app.frontendUrl')}/auth/magic-link?token=${magicToken}`;

    const notification = await this.createNotification({
      userId: user.id,
      type: NotificationType.EMAIL,
      category: NotificationCategory.SECURITY,
      title: 'Sign In Link',
      body: `Click the link to sign in to your account.`,
      recipient: user.email,
      data: { magicLinkUrl },
    });

    try {
      await this.emailService.sendMagicLink(
        { email: user.email, firstName: user.firstName },
        magicToken,
      );
      await this.updateNotificationStatus(notification.id, NotificationStatus.SENT);
    } catch (error) {
      this.logger.error(`Failed to send magic link email to ${user.email}`, error);
      await this.updateNotificationStatus(notification.id, NotificationStatus.FAILED, undefined, error.message);
    }
  }

  async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get('app.frontendUrl')}/auth/reset-password?token=${resetToken}`;

    const notification = await this.createNotification({
      userId: user.id,
      type: NotificationType.EMAIL,
      category: NotificationCategory.SECURITY,
      title: 'Password Reset Request',
      body: `A password reset was requested for your account.`,
      recipient: user.email,
      data: { resetUrl },
    });

    try {
      await this.emailService.sendPasswordReset(
        { email: user.email, firstName: user.firstName },
        resetToken,
      );
      await this.updateNotificationStatus(notification.id, NotificationStatus.SENT);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${user.email}`, error);
      await this.updateNotificationStatus(notification.id, NotificationStatus.FAILED, undefined, error.message);
    }
  }

  async sendAlertNotification(
    user: User,
    alert: { id: string; type: string; severity: string; message: string },
  ): Promise<{ email?: boolean; sms?: boolean }> {
    const preferences = this.getUserPreferences(user);
    const results: { email?: boolean; sms?: boolean } = {};

    // Send email notification if user prefers it
    if (this.shouldSendNotification(preferences, 'email', alert.severity)) {
      const emailNotification = await this.createNotification({
        userId: user.id,
        type: NotificationType.EMAIL,
        category: NotificationCategory.ALERT,
        title: `Health Alert: ${alert.type}`,
        body: alert.message,
        recipient: user.email,
        data: { alertId: alert.id, severity: alert.severity },
      });

      try {
        await this.emailService.sendHealthAlert(
          { email: user.email, firstName: user.firstName },
          { id: alert.id, type: alert.type, severity: alert.severity as 'info' | 'warning' | 'critical', message: alert.message },
        );
        await this.updateNotificationStatus(emailNotification.id, NotificationStatus.SENT);
        results.email = true;
      } catch (error) {
        this.logger.error(`Failed to send alert email to ${user.email}`, error);
        await this.updateNotificationStatus(emailNotification.id, NotificationStatus.FAILED, undefined, error.message);
        results.email = false;
      }
    }

    // Send SMS notification if user prefers it and has phone
    if (user.phone && this.shouldSendNotification(preferences, 'sms', alert.severity)) {
      const smsNotification = await this.createNotification({
        userId: user.id,
        type: NotificationType.SMS,
        category: NotificationCategory.ALERT,
        title: `Alert: ${alert.type}`,
        body: `VytalWatch Alert [${alert.severity.toUpperCase()}]: ${alert.message}`,
        recipient: user.phone,
        data: { alertId: alert.id },
      });

      const smsResult = await this.smsService.sendHealthAlert(
        { phone: user.phone, firstName: user.firstName },
        { type: alert.type, severity: alert.severity, message: alert.message },
      );

      await this.updateNotificationStatus(
        smsNotification.id,
        smsResult.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        smsResult.messageId,
        smsResult.error,
      );
      results.sms = smsResult.success;
    }

    // Always create in-app notification
    await this.createNotification({
      userId: user.id,
      type: NotificationType.IN_APP,
      category: NotificationCategory.ALERT,
      title: `Health Alert: ${alert.type}`,
      body: alert.message,
      data: { alertId: alert.id, severity: alert.severity },
    });

    return results;
  }

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    body: string;
    recipient?: string;
    data?: Record<string, any>;
  }): Promise<Notification> {
    const notification = this.notificationRepository.create(data);
    return this.notificationRepository.save(notification);
  }

  async updateNotificationStatus(
    id: string,
    status: NotificationStatus,
    externalId?: string,
    errorMessage?: string,
  ): Promise<void> {
    const update: Partial<Notification> = { status };

    if (externalId) update.externalId = externalId;
    if (errorMessage) update.errorMessage = errorMessage;
    if (status === NotificationStatus.SENT) update.sentAt = new Date();
    if (status === NotificationStatus.DELIVERED) update.deliveredAt = new Date();

    await this.notificationRepository.update(id, update);
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationRepository.update(id, {
      status: NotificationStatus.READ,
      readAt: new Date(),
    });
  }

  async getUserNotifications(
    userId: string,
    options?: { page?: number; limit?: number; unreadOnly?: boolean },
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { page = 1, limit = 20, unreadOnly = false } = options || {};

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.type = :type', { type: NotificationType.IN_APP });

    if (unreadOnly) {
      queryBuilder.andWhere('notification.status != :status', { status: NotificationStatus.READ });
    }

    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return { notifications, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId,
        type: NotificationType.IN_APP,
        status: NotificationStatus.PENDING,
      },
    });
  }

  async sendSmsVerificationCode(phone: string, code: string): Promise<void> {
    await this.smsService.send(
      phone,
      `Your VytalWatch AI verification code is: ${code}. This code expires in 10 minutes.`
    );
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    body: string;
    recipient?: string;
    data?: Record<string, any>;
  }): Promise<Notification> {
    return this.createNotification(data);
  }
}
