# Push Notifications Usage Examples

Complete examples demonstrating how to use the push notifications system in various scenarios.

## Table of Contents
1. [Basic Usage](#basic-usage)
2. [Using Templates](#using-templates)
3. [Alert Notifications](#alert-notifications)
4. [Medication Reminders](#medication-reminders)
5. [Appointment Reminders](#appointment-reminders)
6. [Scheduled Notifications](#scheduled-notifications)
7. [Batch Notifications](#batch-notifications)
8. [Badge Management](#badge-management)
9. [Device Management](#device-management)
10. [Integration Examples](#integration-examples)

## Basic Usage

### Inject the Service

```typescript
import { Injectable } from '@nestjs/common';
import { PushNotificationsService } from './push-notifications/push-notifications.service';
import { NotificationPriority } from './push-notifications/templates/notification-templates';

@Injectable()
export class YourService {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}
}
```

### Send Simple Notification

```typescript
async sendSimpleNotification(userId: string) {
  const result = await this.pushNotificationsService.sendNotification(userId, {
    title: 'Hello!',
    body: 'This is a simple notification',
    category: 'general',
    priority: NotificationPriority.MEDIUM,
  });

  console.log(`Sent to ${result.sentCount} devices`);
}
```

## Using Templates

### Critical Alert

```typescript
import { NotificationTemplates } from './push-notifications/templates/notification-templates';

async sendCriticalAlert(userId: string, patientName: string) {
  const template = NotificationTemplates.criticalAlert({
    alertType: 'Blood Pressure',
    message: 'Blood pressure reading is critically high: 180/120 mmHg',
    alertId: 'alert-uuid-123',
    patientName,
  });

  const result = await this.pushNotificationsService.sendFromTemplate(userId, template);

  return result;
}
```

### Medication Reminder

```typescript
async sendMedicationReminder(userId: string, medication: any) {
  const template = NotificationTemplates.medicationReminder({
    medicationName: medication.name,
    dosage: medication.dosage,
    time: medication.scheduledTime,
    medicationId: medication.id,
  });

  await this.pushNotificationsService.sendFromTemplate(userId, template);
}
```

### Appointment Reminder

```typescript
async sendAppointmentReminder(userId: string, appointment: any) {
  const now = new Date();
  const appointmentTime = new Date(appointment.scheduledAt);
  const minutesUntil = Math.floor((appointmentTime.getTime() - now.getTime()) / 60000);

  const template = NotificationTemplates.appointmentReminder({
    appointmentType: appointment.type,
    providerName: appointment.providerName,
    date: appointmentTime.toLocaleDateString(),
    time: appointmentTime.toLocaleTimeString(),
    appointmentId: appointment.id,
    minutesUntil,
  });

  await this.pushNotificationsService.sendFromTemplate(userId, template);
}
```

## Alert Notifications

### High Priority Alert with Actions

```typescript
async sendHighPriorityAlert(userId: string) {
  const result = await this.pushNotificationsService.sendNotification(userId, {
    title: 'Abnormal Heart Rate Detected',
    body: 'Heart rate: 140 bpm. Please check your device.',
    category: 'alert',
    priority: NotificationPriority.HIGH,
    data: {
      vitalType: 'heart_rate',
      value: 140,
      alertId: 'alert-123',
    },
    deepLink: '/vitals/heart-rate',
    sound: 'alert.wav',
    color: '#f97316',
    actions: [
      { action: 'view', title: 'View Details', icon: 'view' },
      { action: 'dismiss', title: 'Dismiss', icon: 'close' },
    ],
  });

  return result;
}
```

### Different Severity Levels

```typescript
async sendAlertBySeverity(userId: string, severity: string, message: string) {
  let template;

  switch (severity) {
    case 'critical':
      template = NotificationTemplates.criticalAlert({
        alertType: 'Health Alert',
        message,
        alertId: 'alert-123',
      });
      break;

    case 'high':
      template = NotificationTemplates.highAlert({
        alertType: 'Health Alert',
        message,
        alertId: 'alert-123',
      });
      break;

    case 'medium':
      template = NotificationTemplates.mediumAlert({
        alertType: 'Health Alert',
        message,
        alertId: 'alert-123',
      });
      break;

    case 'low':
      template = NotificationTemplates.lowAlert({
        alertType: 'Health Alert',
        message,
        alertId: 'alert-123',
      });
      break;
  }

  return this.pushNotificationsService.sendFromTemplate(userId, template);
}
```

## Medication Reminders

### Daily Medication Reminder

```typescript
async scheduleDailyMedicationReminders(userId: string, medications: any[]) {
  for (const medication of medications) {
    const scheduledTime = new Date(medication.scheduledTime);

    const template = NotificationTemplates.medicationReminder({
      medicationName: medication.name,
      dosage: medication.dosage,
      time: scheduledTime.toLocaleTimeString(),
      medicationId: medication.id,
    });

    await this.pushNotificationsService.scheduleNotification(
      userId,
      {
        title: template.title,
        body: template.body,
        category: template.category,
        priority: template.priority,
        data: template.data,
        deepLink: template.deepLink,
        sound: template.sound,
        actions: template.actions,
      },
      scheduledTime,
    );
  }
}
```

### Refill Reminder

```typescript
async sendRefillReminder(userId: string, medication: any) {
  const daysRemaining = Math.floor(
    (new Date(medication.refillDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const template = NotificationTemplates.medicationRefillReminder({
    medicationName: medication.name,
    daysRemaining,
    medicationId: medication.id,
  });

  await this.pushNotificationsService.sendFromTemplate(userId, template);
}
```

## Appointment Reminders

### Send Multiple Reminders

```typescript
async scheduleAppointmentReminders(userId: string, appointment: any) {
  const appointmentTime = new Date(appointment.scheduledAt);

  // 24 hours before
  const reminder24h = new Date(appointmentTime);
  reminder24h.setHours(appointmentTime.getHours() - 24);

  if (reminder24h > new Date()) {
    await this.scheduleAppointmentNotification(userId, appointment, reminder24h, 1440);
  }

  // 2 hours before
  const reminder2h = new Date(appointmentTime);
  reminder2h.setHours(appointmentTime.getHours() - 2);

  if (reminder2h > new Date()) {
    await this.scheduleAppointmentNotification(userId, appointment, reminder2h, 120);
  }

  // 30 minutes before
  const reminder30m = new Date(appointmentTime);
  reminder30m.setMinutes(appointmentTime.getMinutes() - 30);

  if (reminder30m > new Date()) {
    await this.scheduleAppointmentNotification(userId, appointment, reminder30m, 30);
  }
}

private async scheduleAppointmentNotification(
  userId: string,
  appointment: any,
  scheduledFor: Date,
  minutesUntil: number,
) {
  const template = NotificationTemplates.appointmentReminder({
    appointmentType: appointment.type,
    providerName: appointment.providerName,
    date: appointment.scheduledAt.toLocaleDateString(),
    time: appointment.scheduledAt.toLocaleTimeString(),
    appointmentId: appointment.id,
    minutesUntil,
  });

  await this.pushNotificationsService.scheduleNotification(
    userId,
    {
      title: template.title,
      body: template.body,
      category: template.category,
      priority: template.priority,
      data: template.data,
      deepLink: template.deepLink,
      sound: template.sound,
      actions: template.actions,
    },
    scheduledFor,
  );
}
```

## Scheduled Notifications

### Schedule for Specific Time

```typescript
async scheduleForTomorrow9AM(userId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const scheduled = await this.pushNotificationsService.scheduleNotification(
    userId,
    {
      title: 'Daily Health Check',
      body: 'Time for your daily vital signs recording',
      category: 'reminder',
      priority: NotificationPriority.MEDIUM,
      deepLink: '/vitals/record',
    },
    tomorrow,
  );

  console.log(`Scheduled notification ${scheduled.id} for ${tomorrow}`);
  return scheduled;
}
```

### Schedule with Cancellation

```typescript
async scheduleWithCancellation(userId: string, appointmentId: string) {
  const scheduledFor = new Date();
  scheduledFor.setHours(scheduledFor.getHours() + 2);

  const scheduled = await this.pushNotificationsService.scheduleNotification(
    userId,
    {
      title: 'Appointment Reminder',
      body: 'Your appointment is in 2 hours',
      category: 'reminder',
      data: { appointmentId },
    },
    scheduledFor,
  );

  // Store scheduled.id to cancel later if appointment is cancelled
  await this.storeScheduledNotificationId(appointmentId, scheduled.id);

  return scheduled;
}

async cancelAppointmentNotifications(appointmentId: string) {
  const notificationId = await this.getScheduledNotificationId(appointmentId);

  if (notificationId) {
    await this.pushNotificationsService.cancelScheduled(notificationId);
  }
}
```

## Batch Notifications

### Send to Multiple Users

```typescript
async sendToAllPatients(message: string) {
  const patients = await this.patientsRepository.find();
  const patientIds = patients.map(p => p.userId);

  const result = await this.pushNotificationsService.sendToMultiple(
    patientIds,
    {
      title: 'Important Announcement',
      body: message,
      category: 'system',
      priority: NotificationPriority.MEDIUM,
    },
  );

  console.log(`Sent to ${result.sentCount} out of ${patientIds.length} patients`);
  return result;
}
```

### Send to Specific User Group

```typescript
async sendToHighRiskPatients(message: string) {
  const highRiskPatients = await this.patientsRepository.find({
    where: { riskLevel: 'high' },
  });

  const userIds = highRiskPatients.map(p => p.userId);

  const result = await this.pushNotificationsService.sendToMultiple(
    userIds,
    {
      title: 'Important Health Notice',
      body: message,
      category: 'alert',
      priority: NotificationPriority.HIGH,
      deepLink: '/alerts',
    },
  );

  return result;
}
```

### Topic-Based Broadcast

```typescript
async broadcastToAllUsers(announcement: string) {
  const result = await this.pushNotificationsService.sendToTopic(
    'all-users',
    {
      title: 'System Announcement',
      body: announcement,
      category: 'system',
      priority: NotificationPriority.LOW,
    },
  );

  return result;
}

async sendToAndroidUsers(message: string) {
  const result = await this.pushNotificationsService.sendToTopic(
    'platform-android',
    {
      title: 'Android Update Available',
      body: message,
      category: 'system',
    },
  );

  return result;
}
```

## Badge Management

### Increment Badge on New Notification

```typescript
async sendWithBadgeIncrement(userId: string, notification: any) {
  // Send notification
  await this.pushNotificationsService.sendNotification(userId, {
    title: notification.title,
    body: notification.body,
    category: notification.category,
  });

  // Increment badge count for iOS devices
  await this.pushNotificationsService.incrementBadge(userId, 1);
}
```

### Reset Badge on App Open

```typescript
async handleAppOpened(userId: string) {
  // User opened app, reset badge
  await this.pushNotificationsService.resetBadge(userId);
}
```

### Set Specific Badge Count

```typescript
async updateBadgeToUnreadCount(userId: string) {
  const unreadCount = await this.getUnreadNotificationsCount(userId);

  await this.pushNotificationsService.updateBadgeCount(userId, unreadCount);
}
```

## Device Management

### Handle Device Registration

```typescript
@Post('register-device')
async registerDevice(@Request() req, @Body() body: any) {
  const userId = req.user.userId;

  const device = await this.pushNotificationsService.registerDevice(
    userId,
    body.token,
    body.platform,
    {
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      model: body.model,
      osVersion: body.osVersion,
      appVersion: body.appVersion,
    },
    {
      soundEnabled: true,
      vibrationEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      quietHoursTimezone: body.timezone,
    },
  );

  return { success: true, deviceId: device.id };
}
```

### Update User Preferences

```typescript
async updateNotificationPreferences(userId: string, deviceId: string, preferences: any) {
  const device = await this.pushNotificationsService.updateDevicePreferences(
    userId,
    deviceId,
    undefined, // Don't change enabled status
    {
      soundEnabled: preferences.soundEnabled,
      vibrationEnabled: preferences.vibrationEnabled,
      mutedCategories: preferences.mutedCategories,
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      quietHoursTimezone: preferences.timezone,
    },
  );

  return device;
}
```

### Disable Notifications for Device

```typescript
async disableDeviceNotifications(userId: string, deviceId: string) {
  await this.pushNotificationsService.updateDevicePreferences(
    userId,
    deviceId,
    false, // Disable
  );
}
```

## Integration Examples

### Alerts Service Integration

```typescript
@Injectable()
export class AlertsService {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  async createAlert(userId: string, alertData: any) {
    // Create alert in database
    const alert = await this.alertsRepository.save({
      userId,
      ...alertData,
    });

    // Send push notification immediately
    const template = NotificationTemplates.criticalAlert({
      alertType: alert.type,
      message: alert.message,
      alertId: alert.id,
    });

    await this.pushNotificationsService.sendFromTemplate(userId, template);

    return alert;
  }
}
```

### Medications Service Integration

```typescript
@Injectable()
export class MedicationsService {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  async scheduleMedicationReminders(userId: string, medication: any) {
    // Schedule daily reminders
    for (const scheduledTime of medication.scheduledTimes) {
      const [hours, minutes] = scheduledTime.split(':');

      const reminderTime = new Date();
      reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // If time has passed today, schedule for tomorrow
      if (reminderTime < new Date()) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      const template = NotificationTemplates.medicationReminder({
        medicationName: medication.name,
        dosage: medication.dosage,
        time: scheduledTime,
        medicationId: medication.id,
      });

      await this.pushNotificationsService.scheduleNotification(
        userId,
        {
          title: template.title,
          body: template.body,
          category: template.category,
          priority: template.priority,
          data: template.data,
          deepLink: template.deepLink,
          sound: template.sound,
          actions: template.actions,
        },
        reminderTime,
      );
    }
  }
}
```

### Messaging Service Integration

```typescript
@Injectable()
export class MessagingService {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  async sendMessage(senderId: string, recipientId: string, message: string) {
    // Save message to database
    const savedMessage = await this.messagesRepository.save({
      senderId,
      recipientId,
      content: message,
    });

    // Get sender info
    const sender = await this.usersRepository.findOne({ where: { id: senderId } });

    // Send push notification to recipient
    const template = NotificationTemplates.newMessage({
      senderName: `${sender.firstName} ${sender.lastName}`,
      messagePreview: message.substring(0, 100),
      conversationId: savedMessage.conversationId,
      senderId,
    });

    await this.pushNotificationsService.sendFromTemplate(recipientId, template);

    return savedMessage;
  }
}
```

## Error Handling

### Handle Send Failures

```typescript
async sendWithRetry(userId: string, notification: any, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.pushNotificationsService.sendNotification(
        userId,
        notification,
      );

      if (result.success) {
        return result;
      }

      lastError = result.errors;

      // Wait before retrying (exponential backoff)
      await this.delay(1000 * Math.pow(2, attempt - 1));
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError}`);
}

private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Graceful Degradation

```typescript
async sendNotificationWithFallback(userId: string, notification: any) {
  // Try push notification first
  const result = await this.pushNotificationsService.sendNotification(
    userId,
    notification,
  );

  if (!result.success) {
    // Fallback to email if push fails
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (user.email) {
      await this.notificationsService.sendEmail({
        to: user.email,
        subject: notification.title,
        html: notification.body,
      });
    }

    // Fallback to SMS for critical notifications
    if (notification.priority === NotificationPriority.CRITICAL && user.phone) {
      await this.notificationsService.sendSms({
        to: user.phone,
        body: `${notification.title}: ${notification.body}`,
      });
    }
  }

  return result;
}
```

## Testing

### Mock Service for Testing

```typescript
// test/mocks/push-notifications.mock.ts
export const mockPushNotificationsService = {
  sendNotification: jest.fn().mockResolvedValue({
    success: true,
    sentCount: 1,
    failedCount: 0,
  }),

  sendFromTemplate: jest.fn().mockResolvedValue({
    success: true,
    sentCount: 1,
    failedCount: 0,
  }),

  scheduleNotification: jest.fn().mockResolvedValue({
    id: 'scheduled-123',
    userId: 'user-123',
    scheduledFor: new Date(),
    sent: false,
  }),

  registerDevice: jest.fn().mockResolvedValue({
    id: 'device-123',
    enabled: true,
  }),
};
```

### Unit Test Example

```typescript
describe('AlertsService', () => {
  let service: AlertsService;
  let pushNotificationsService: PushNotificationsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PushNotificationsService,
          useValue: mockPushNotificationsService,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    pushNotificationsService = module.get<PushNotificationsService>(
      PushNotificationsService,
    );
  });

  it('should send push notification when creating alert', async () => {
    const userId = 'user-123';
    const alertData = {
      type: 'Blood Pressure',
      message: 'High blood pressure detected',
      severity: 'critical',
    };

    await service.createAlert(userId, alertData);

    expect(pushNotificationsService.sendFromTemplate).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        title: expect.stringContaining('CRITICAL'),
        priority: NotificationPriority.CRITICAL,
      }),
    );
  });
});
```

These examples cover the most common use cases. For more advanced scenarios, refer to the README.md and API documentation.
