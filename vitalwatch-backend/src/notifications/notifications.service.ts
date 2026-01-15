import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Twilio } from 'twilio';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationCategory,
} from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendSmsOptions {
  to: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: Twilio;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly configService: ConfigService,
  ) {
    this.initializeEmailTransporter();
    this.initializeTwilioClient();
  }

  private initializeEmailTransporter(): void {
    const smtpConfig = this.configService.get('smtp');

    if (smtpConfig?.host) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });
    }
  }

  private initializeTwilioClient(): void {
    const twilioConfig = this.configService.get('twilio');

    if (twilioConfig?.accountSid && twilioConfig?.authToken) {
      this.twilioClient = new Twilio(
        twilioConfig.accountSid,
        twilioConfig.authToken,
      );
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      if (!this.emailTransporter) {
        this.logger.warn('Email transporter not configured');
        return false;
      }

      const smtpConfig = this.configService.get('smtp');

      await this.emailTransporter.sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      return false;
    }
  }

  async sendSms(options: SendSmsOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      if (!this.twilioClient) {
        this.logger.warn('Twilio client not configured');
        return { success: false };
      }

      const twilioConfig = this.configService.get('twilio');

      const message = await this.twilioClient.messages.create({
        body: options.body,
        to: options.to,
        from: twilioConfig.phoneNumber,
      });

      this.logger.log(`SMS sent to ${options.to}, SID: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${options.to}`, error);
      return { success: false };
    }
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

    const success = await this.sendEmail({
      to: user.email,
      subject: 'Verify Your VitalWatch AI Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">Welcome to VitalWatch AI!</h2>
          <p>Hi ${user.firstName},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Verify Email</a>
          <p>Or copy and paste this link: ${verificationUrl}</p>
          <p>This link expires in 24 hours.</p>
          <p>Best regards,<br>The VitalWatch AI Team</p>
        </div>
      `,
    });

    await this.updateNotificationStatus(
      notification.id,
      success ? NotificationStatus.SENT : NotificationStatus.FAILED,
    );
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

    const success = await this.sendEmail({
      to: user.email,
      subject: 'Reset Your VitalWatch AI Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066cc;">Password Reset Request</h2>
          <p>Hi ${user.firstName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
          <p>Or copy and paste this link: ${resetUrl}</p>
          <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>The VitalWatch AI Team</p>
        </div>
      `,
    });

    await this.updateNotificationStatus(
      notification.id,
      success ? NotificationStatus.SENT : NotificationStatus.FAILED,
    );
  }

  async sendAlertNotification(
    user: User,
    alert: { id: string; type: string; severity: string; message: string },
  ): Promise<void> {
    // Send email notification
    const emailNotification = await this.createNotification({
      userId: user.id,
      type: NotificationType.EMAIL,
      category: NotificationCategory.ALERT,
      title: `Health Alert: ${alert.type}`,
      body: alert.message,
      recipient: user.email,
      data: { alertId: alert.id, severity: alert.severity },
    });

    const emailSuccess = await this.sendEmail({
      to: user.email,
      subject: `[${alert.severity.toUpperCase()}] Health Alert - ${alert.type}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#f97316' : '#eab308'}; color: white; padding: 16px; border-radius: 4px 4px 0 0;">
            <h2 style="margin: 0;">Health Alert</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
            <p><strong>Alert Type:</strong> ${alert.type}</p>
            <p><strong>Severity:</strong> ${alert.severity}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            <a href="${this.configService.get('app.frontendUrl')}/alerts/${alert.id}" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">View Alert</a>
          </div>
        </div>
      `,
    });

    await this.updateNotificationStatus(
      emailNotification.id,
      emailSuccess ? NotificationStatus.SENT : NotificationStatus.FAILED,
    );

    // Send SMS notification for critical/high alerts
    if (user.phone && ['critical', 'high'].includes(alert.severity)) {
      const smsNotification = await this.createNotification({
        userId: user.id,
        type: NotificationType.SMS,
        category: NotificationCategory.ALERT,
        title: `Alert: ${alert.type}`,
        body: `VitalWatch Alert [${alert.severity.toUpperCase()}]: ${alert.message}`,
        recipient: user.phone,
        data: { alertId: alert.id },
      });

      const smsResult = await this.sendSms({
        to: user.phone,
        body: `VitalWatch Alert [${alert.severity.toUpperCase()}]: ${alert.message}. View: ${this.configService.get('app.frontendUrl')}/alerts/${alert.id}`,
      });

      await this.updateNotificationStatus(
        smsNotification.id,
        smsResult.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        smsResult.messageId,
      );
    }
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
}
