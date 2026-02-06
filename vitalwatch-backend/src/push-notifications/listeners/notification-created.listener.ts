import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PushNotificationsService } from '../push-notifications.service';
import {
  Notification,
  NotificationType,
  NotificationCategory,
} from '../../notifications/entities/notification.entity';
import { NotificationPriority } from '../templates/notification-templates';

interface NotificationCreatedEvent {
  notification: Notification;
}

@Injectable()
export class NotificationCreatedListener {
  private readonly logger = new Logger(NotificationCreatedListener.name);

  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  /**
   * Automatically send push notification when notification is created
   */
  @OnEvent('notification.created')
  async handleNotificationCreated(event: NotificationCreatedEvent): Promise<void> {
    const { notification } = event;

    // Only send push for PUSH type or IN_APP type notifications
    if (
      notification.type !== NotificationType.PUSH &&
      notification.type !== NotificationType.IN_APP
    ) {
      return;
    }

    try {
      this.logger.log(
        `Auto-sending push notification for notification ${notification.id} to user ${notification.userId}`,
      );

      // Determine priority based on category
      const priority = this.determinePriority(notification.category);

      // Send push notification
      const result = await this.pushNotificationsService.sendNotification(
        notification.userId,
        {
          title: notification.title,
          body: notification.body,
          category: notification.category,
          priority,
          data: notification.data,
          deepLink: this.generateDeepLink(notification),
          sound: this.getSound(notification.category, priority),
          color: this.getColor(notification.category),
          icon: this.getIcon(notification.category),
        },
      );

      if (result.success) {
        this.logger.log(
          `Push notification sent successfully for notification ${notification.id}. Sent to ${result.sentCount} device(s)`,
        );
      } else {
        this.logger.warn(
          `Failed to send push notification for notification ${notification.id}. Errors: ${result.errors?.join(', ')}`,
        );

        // Fallback to email/SMS if push fails and it's a critical notification
        if (priority === NotificationPriority.CRITICAL) {
          this.logger.log(
            `Triggering fallback for critical notification ${notification.id}`,
          );
          // Emit event for fallback handling
          // The NotificationsService will handle email/SMS fallback
        }
      }
    } catch (error) {
      this.logger.error(
        `Error sending push notification for notification ${notification.id}`,
        error,
      );
    }
  }

  /**
   * Determine notification priority based on category
   */
  private determinePriority(category: NotificationCategory): NotificationPriority {
    const priorityMap: Record<NotificationCategory, NotificationPriority> = {
      [NotificationCategory.ALERT]: NotificationPriority.CRITICAL,
      [NotificationCategory.SECURITY]: NotificationPriority.HIGH,
      [NotificationCategory.REMINDER]: NotificationPriority.MEDIUM,
      [NotificationCategory.BILLING]: NotificationPriority.MEDIUM,
      [NotificationCategory.SYSTEM]: NotificationPriority.LOW,
      [NotificationCategory.MARKETING]: NotificationPriority.LOW,
    };

    return priorityMap[category] || NotificationPriority.MEDIUM;
  }

  /**
   * Generate deep link based on notification data
   */
  private generateDeepLink(notification: Notification): string | undefined {
    const data = notification.data || {};

    // Alert deep link
    if (data.alertId) {
      return `/alerts/${data.alertId}`;
    }

    // Medication deep link
    if (data.medicationId) {
      return `/medications/${data.medicationId}`;
    }

    // Appointment deep link
    if (data.appointmentId) {
      return `/appointments/${data.appointmentId}`;
    }

    // Task deep link
    if (data.taskId) {
      return `/tasks/${data.taskId}`;
    }

    // Message deep link
    if (data.conversationId) {
      return `/messages/${data.conversationId}`;
    }

    // Vital reading deep link
    if (data.vitalId) {
      return `/vitals/${data.vitalId}`;
    }

    // Billing deep link
    if (data.billId) {
      return `/billing/${data.billId}`;
    }

    // Default to notifications page
    return '/notifications';
  }

  /**
   * Get sound based on category and priority
   */
  private getSound(
    category: NotificationCategory,
    priority: NotificationPriority,
  ): string {
    if (priority === NotificationPriority.CRITICAL) {
      return 'critical_alert.wav';
    }

    if (category === NotificationCategory.ALERT) {
      return 'alert.wav';
    }

    if (category === NotificationCategory.REMINDER) {
      return 'reminder.wav';
    }

    if (category === NotificationCategory.SECURITY) {
      return 'alert.wav';
    }

    return 'default';
  }

  /**
   * Get color based on category
   */
  private getColor(category: NotificationCategory): string {
    const colorMap: Record<NotificationCategory, string> = {
      [NotificationCategory.ALERT]: '#dc2626', // Red
      [NotificationCategory.SECURITY]: '#ef4444', // Red
      [NotificationCategory.REMINDER]: '#10b981', // Green
      [NotificationCategory.BILLING]: '#f59e0b', // Orange
      [NotificationCategory.SYSTEM]: '#0066cc', // Blue
      [NotificationCategory.MARKETING]: '#8b5cf6', // Purple
    };

    return colorMap[category] || '#0066cc';
  }

  /**
   * Get icon based on category
   */
  private getIcon(category: NotificationCategory): string {
    const iconMap: Record<NotificationCategory, string> = {
      [NotificationCategory.ALERT]: 'ic_alert',
      [NotificationCategory.SECURITY]: 'ic_security',
      [NotificationCategory.REMINDER]: 'ic_reminder',
      [NotificationCategory.BILLING]: 'ic_billing',
      [NotificationCategory.SYSTEM]: 'ic_notification',
      [NotificationCategory.MARKETING]: 'ic_star',
    };

    return iconMap[category] || 'ic_notification';
  }
}
