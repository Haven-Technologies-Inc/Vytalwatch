import { DevicePlatform } from '../entities/device-token.entity';

export enum NotificationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface NotificationTemplate {
  title: string;
  body: string;
  category: string;
  priority: NotificationPriority;
  data?: Record<string, any>;
  sound?: string;
  icon?: string;
  color?: string;
  deepLink?: string;
  imageUrl?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class NotificationTemplates {
  // Alert Notifications
  static criticalAlert(params: {
    alertType: string;
    message: string;
    alertId: string;
    patientName?: string;
  }): NotificationTemplate {
    return {
      title: `CRITICAL ALERT: ${params.alertType}`,
      body: params.patientName
        ? `${params.patientName} - ${params.message}`
        : params.message,
      category: 'alert',
      priority: NotificationPriority.CRITICAL,
      sound: 'critical_alert.wav',
      color: '#dc2626',
      deepLink: `/alerts/${params.alertId}`,
      data: {
        type: 'critical_alert',
        alertId: params.alertId,
        alertType: params.alertType,
        severity: 'critical',
      },
      actions: [
        { action: 'view', title: 'View Alert', icon: 'view' },
        { action: 'acknowledge', title: 'Acknowledge', icon: 'check' },
      ],
    };
  }

  static highAlert(params: {
    alertType: string;
    message: string;
    alertId: string;
    patientName?: string;
  }): NotificationTemplate {
    return {
      title: `High Priority Alert: ${params.alertType}`,
      body: params.patientName
        ? `${params.patientName} - ${params.message}`
        : params.message,
      category: 'alert',
      priority: NotificationPriority.HIGH,
      sound: 'high_alert.wav',
      color: '#f97316',
      deepLink: `/alerts/${params.alertId}`,
      data: {
        type: 'high_alert',
        alertId: params.alertId,
        alertType: params.alertType,
        severity: 'high',
      },
      actions: [
        { action: 'view', title: 'View', icon: 'view' },
        { action: 'dismiss', title: 'Dismiss', icon: 'close' },
      ],
    };
  }

  static mediumAlert(params: {
    alertType: string;
    message: string;
    alertId: string;
  }): NotificationTemplate {
    return {
      title: `Alert: ${params.alertType}`,
      body: params.message,
      category: 'alert',
      priority: NotificationPriority.MEDIUM,
      sound: 'default',
      color: '#eab308',
      deepLink: `/alerts/${params.alertId}`,
      data: {
        type: 'medium_alert',
        alertId: params.alertId,
        alertType: params.alertType,
        severity: 'medium',
      },
    };
  }

  static lowAlert(params: {
    alertType: string;
    message: string;
    alertId: string;
  }): NotificationTemplate {
    return {
      title: params.alertType,
      body: params.message,
      category: 'alert',
      priority: NotificationPriority.LOW,
      sound: 'subtle.wav',
      color: '#3b82f6',
      deepLink: `/alerts/${params.alertId}`,
      data: {
        type: 'low_alert',
        alertId: params.alertId,
        alertType: params.alertType,
        severity: 'low',
      },
    };
  }

  // Medication Reminders
  static medicationReminder(params: {
    medicationName: string;
    dosage: string;
    time: string;
    medicationId: string;
  }): NotificationTemplate {
    return {
      title: 'Medication Reminder',
      body: `Time to take ${params.medicationName} - ${params.dosage}`,
      category: 'reminder',
      priority: NotificationPriority.HIGH,
      sound: 'medication_reminder.wav',
      color: '#10b981',
      deepLink: `/medications/${params.medicationId}`,
      data: {
        type: 'medication_reminder',
        medicationId: params.medicationId,
        medicationName: params.medicationName,
        dosage: params.dosage,
        scheduledTime: params.time,
      },
      actions: [
        { action: 'taken', title: 'Mark as Taken', icon: 'check' },
        { action: 'snooze', title: 'Snooze', icon: 'clock' },
        { action: 'skip', title: 'Skip', icon: 'close' },
      ],
    };
  }

  static medicationRefillReminder(params: {
    medicationName: string;
    daysRemaining: number;
    medicationId: string;
  }): NotificationTemplate {
    return {
      title: 'Medication Refill Needed',
      body: `${params.medicationName} - ${params.daysRemaining} days remaining`,
      category: 'reminder',
      priority: NotificationPriority.MEDIUM,
      sound: 'default',
      color: '#f59e0b',
      deepLink: `/medications/${params.medicationId}/refill`,
      data: {
        type: 'medication_refill',
        medicationId: params.medicationId,
        daysRemaining: params.daysRemaining,
      },
      actions: [
        { action: 'order', title: 'Order Refill', icon: 'shopping' },
        { action: 'remind_later', title: 'Remind Later', icon: 'clock' },
      ],
    };
  }

  // Appointment Reminders
  static appointmentReminder(params: {
    appointmentType: string;
    providerName: string;
    date: string;
    time: string;
    appointmentId: string;
    minutesUntil?: number;
  }): NotificationTemplate {
    const timePrefix = params.minutesUntil
      ? params.minutesUntil < 60
        ? `In ${params.minutesUntil} minutes`
        : `In ${Math.floor(params.minutesUntil / 60)} hours`
      : 'Upcoming';

    return {
      title: `${timePrefix}: ${params.appointmentType}`,
      body: `${params.providerName} - ${params.date} at ${params.time}`,
      category: 'reminder',
      priority: params.minutesUntil && params.minutesUntil <= 60
        ? NotificationPriority.HIGH
        : NotificationPriority.MEDIUM,
      sound: 'default',
      color: '#8b5cf6',
      deepLink: `/appointments/${params.appointmentId}`,
      data: {
        type: 'appointment_reminder',
        appointmentId: params.appointmentId,
        appointmentType: params.appointmentType,
        date: params.date,
        time: params.time,
        minutesUntil: params.minutesUntil,
      },
      actions: [
        { action: 'view', title: 'View Details', icon: 'view' },
        { action: 'directions', title: 'Get Directions', icon: 'map' },
        { action: 'reschedule', title: 'Reschedule', icon: 'calendar' },
      ],
    };
  }

  static appointmentConfirmation(params: {
    appointmentType: string;
    providerName: string;
    date: string;
    time: string;
    appointmentId: string;
  }): NotificationTemplate {
    return {
      title: 'Appointment Confirmed',
      body: `${params.appointmentType} with ${params.providerName} on ${params.date} at ${params.time}`,
      category: 'system',
      priority: NotificationPriority.MEDIUM,
      sound: 'default',
      color: '#10b981',
      deepLink: `/appointments/${params.appointmentId}`,
      data: {
        type: 'appointment_confirmation',
        appointmentId: params.appointmentId,
      },
    };
  }

  static appointmentCancelled(params: {
    appointmentType: string;
    date: string;
    reason?: string;
  }): NotificationTemplate {
    return {
      title: 'Appointment Cancelled',
      body: params.reason
        ? `${params.appointmentType} on ${params.date} - ${params.reason}`
        : `${params.appointmentType} on ${params.date} has been cancelled`,
      category: 'system',
      priority: NotificationPriority.HIGH,
      sound: 'default',
      color: '#dc2626',
      deepLink: '/appointments',
      data: {
        type: 'appointment_cancelled',
      },
    };
  }

  // Task Reminders
  static taskReminder(params: {
    taskTitle: string;
    dueDate: string;
    taskId: string;
    priority?: string;
  }): NotificationTemplate {
    return {
      title: 'Task Reminder',
      body: `${params.taskTitle} - Due ${params.dueDate}`,
      category: 'reminder',
      priority: params.priority === 'high'
        ? NotificationPriority.HIGH
        : NotificationPriority.MEDIUM,
      sound: 'default',
      color: '#6366f1',
      deepLink: `/tasks/${params.taskId}`,
      data: {
        type: 'task_reminder',
        taskId: params.taskId,
        priority: params.priority,
      },
      actions: [
        { action: 'complete', title: 'Mark Complete', icon: 'check' },
        { action: 'view', title: 'View Task', icon: 'view' },
      ],
    };
  }

  static taskOverdue(params: {
    taskTitle: string;
    taskId: string;
  }): NotificationTemplate {
    return {
      title: 'Task Overdue',
      body: params.taskTitle,
      category: 'reminder',
      priority: NotificationPriority.HIGH,
      sound: 'default',
      color: '#dc2626',
      deepLink: `/tasks/${params.taskId}`,
      data: {
        type: 'task_overdue',
        taskId: params.taskId,
      },
    };
  }

  // Message Notifications
  static newMessage(params: {
    senderName: string;
    messagePreview: string;
    conversationId: string;
    senderId: string;
  }): NotificationTemplate {
    return {
      title: params.senderName,
      body: params.messagePreview,
      category: 'messaging',
      priority: NotificationPriority.MEDIUM,
      sound: 'message.wav',
      color: '#0066cc',
      deepLink: `/messages/${params.conversationId}`,
      data: {
        type: 'new_message',
        conversationId: params.conversationId,
        senderId: params.senderId,
      },
      actions: [
        { action: 'reply', title: 'Reply', icon: 'reply' },
        { action: 'view', title: 'View', icon: 'view' },
      ],
    };
  }

  static messageReply(params: {
    senderName: string;
    messagePreview: string;
    conversationId: string;
  }): NotificationTemplate {
    return {
      title: `${params.senderName} replied`,
      body: params.messagePreview,
      category: 'messaging',
      priority: NotificationPriority.MEDIUM,
      sound: 'message.wav',
      color: '#0066cc',
      deepLink: `/messages/${params.conversationId}`,
      data: {
        type: 'message_reply',
        conversationId: params.conversationId,
      },
    };
  }

  // Vital Readings
  static vitalReadingRecorded(params: {
    vitalType: string;
    value: string;
    status: 'normal' | 'warning' | 'abnormal';
    vitalId: string;
  }): NotificationTemplate {
    const statusColors = {
      normal: '#10b981',
      warning: '#f59e0b',
      abnormal: '#dc2626',
    };

    return {
      title: 'Vital Reading Recorded',
      body: `${params.vitalType}: ${params.value}`,
      category: 'vitals',
      priority: params.status === 'abnormal'
        ? NotificationPriority.HIGH
        : NotificationPriority.LOW,
      sound: params.status === 'abnormal' ? 'alert.wav' : 'subtle.wav',
      color: statusColors[params.status],
      deepLink: `/vitals/${params.vitalId}`,
      data: {
        type: 'vital_reading',
        vitalId: params.vitalId,
        vitalType: params.vitalType,
        status: params.status,
      },
    };
  }

  static dailyVitalReminder(): NotificationTemplate {
    return {
      title: 'Time to Record Your Vitals',
      body: 'Please record your daily vital signs',
      category: 'reminder',
      priority: NotificationPriority.MEDIUM,
      sound: 'default',
      color: '#0066cc',
      deepLink: '/vitals/record',
      data: {
        type: 'daily_vital_reminder',
      },
      actions: [
        { action: 'record', title: 'Record Now', icon: 'add' },
        { action: 'remind_later', title: 'Remind Later', icon: 'clock' },
      ],
    };
  }

  // System Announcements
  static systemAnnouncement(params: {
    title: string;
    message: string;
    announcementId: string;
    imageUrl?: string;
  }): NotificationTemplate {
    return {
      title: params.title,
      body: params.message,
      category: 'system',
      priority: NotificationPriority.LOW,
      sound: 'default',
      color: '#0066cc',
      imageUrl: params.imageUrl,
      deepLink: `/announcements/${params.announcementId}`,
      data: {
        type: 'system_announcement',
        announcementId: params.announcementId,
      },
    };
  }

  static accountSecurityAlert(params: {
    alertType: string;
    message: string;
    ipAddress?: string;
    location?: string;
  }): NotificationTemplate {
    return {
      title: `Security Alert: ${params.alertType}`,
      body: params.message,
      category: 'security',
      priority: NotificationPriority.HIGH,
      sound: 'alert.wav',
      color: '#dc2626',
      deepLink: '/settings/security',
      data: {
        type: 'security_alert',
        alertType: params.alertType,
        ipAddress: params.ipAddress,
        location: params.location,
      },
      actions: [
        { action: 'review', title: 'Review Activity', icon: 'shield' },
        { action: 'secure', title: 'Secure Account', icon: 'lock' },
      ],
    };
  }

  static appUpdateAvailable(params: {
    version: string;
    features: string;
  }): NotificationTemplate {
    return {
      title: 'App Update Available',
      body: `Version ${params.version} is now available with new features`,
      category: 'system',
      priority: NotificationPriority.LOW,
      sound: 'default',
      color: '#0066cc',
      data: {
        type: 'app_update',
        version: params.version,
        features: params.features,
      },
      actions: [
        { action: 'update', title: 'Update Now', icon: 'download' },
        { action: 'later', title: 'Later', icon: 'close' },
      ],
    };
  }

  // Billing Notifications
  static billDue(params: {
    amount: string;
    dueDate: string;
    billId: string;
  }): NotificationTemplate {
    return {
      title: 'Bill Due',
      body: `Amount due: ${params.amount} - Due ${params.dueDate}`,
      category: 'billing',
      priority: NotificationPriority.HIGH,
      sound: 'default',
      color: '#f59e0b',
      deepLink: `/billing/${params.billId}`,
      data: {
        type: 'bill_due',
        billId: params.billId,
        amount: params.amount,
      },
      actions: [
        { action: 'pay', title: 'Pay Now', icon: 'payment' },
        { action: 'view', title: 'View Details', icon: 'view' },
      ],
    };
  }

  static paymentReceived(params: {
    amount: string;
    transactionId: string;
  }): NotificationTemplate {
    return {
      title: 'Payment Received',
      body: `Payment of ${params.amount} has been processed successfully`,
      category: 'billing',
      priority: NotificationPriority.LOW,
      sound: 'default',
      color: '#10b981',
      deepLink: `/billing/transactions/${params.transactionId}`,
      data: {
        type: 'payment_received',
        transactionId: params.transactionId,
      },
    };
  }
}
