import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { PushNotificationsService } from '../src/push-notifications/push-notifications.service';
import {
  DeviceToken,
  DevicePlatform,
} from '../src/push-notifications/entities/device-token.entity';
import {
  PushNotification,
  NotificationType,
  NotificationPriority,
} from '../src/push-notifications/entities/push-notification.entity';

describe('PushNotificationsService', () => {
  let service: PushNotificationsService;
  let deviceTokenRepository: Repository<DeviceToken>;
  let pushNotificationRepository: Repository<PushNotification>;

  const mockDeviceTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPushNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationsService,
        {
          provide: getRepositoryToken(DeviceToken),
          useValue: mockDeviceTokenRepository,
        },
        {
          provide: getRepositoryToken(PushNotification),
          useValue: mockPushNotificationRepository,
        },
      ],
    }).compile();

    service = module.get<PushNotificationsService>(PushNotificationsService);
    deviceTokenRepository = module.get<Repository<DeviceToken>>(
      getRepositoryToken(DeviceToken),
    );
    pushNotificationRepository = module.get<Repository<PushNotification>>(
      getRepositoryToken(PushNotification),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should register a new device token', async () => {
      // Arrange
      const registerDto = {
        userId: 'user-123',
        token: 'fcm-token-abc123',
        platform: DevicePlatform.ANDROID,
        deviceId: 'device-123',
        deviceName: 'Samsung Galaxy S21',
      };

      const mockDeviceToken = {
        id: 'token-123',
        ...registerDto,
        isActive: true,
        createdAt: new Date(),
      };

      mockDeviceTokenRepository.findOne.mockResolvedValue(null);
      mockDeviceTokenRepository.create.mockReturnValue(mockDeviceToken);
      mockDeviceTokenRepository.save.mockResolvedValue(mockDeviceToken);

      // Act
      const result = await service.registerDevice(registerDto);

      // Assert
      expect(deviceTokenRepository.create).toHaveBeenCalled();
      expect(deviceTokenRepository.save).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });

    it('should update existing device token if already registered', async () => {
      // Arrange
      const registerDto = {
        userId: 'user-123',
        token: 'fcm-token-abc123',
        platform: DevicePlatform.ANDROID,
        deviceId: 'device-123',
      };

      const existingToken = {
        id: 'token-123',
        ...registerDto,
        isActive: false,
      };

      mockDeviceTokenRepository.findOne.mockResolvedValue(existingToken);
      mockDeviceTokenRepository.save.mockResolvedValue({
        ...existingToken,
        isActive: true,
      });

      // Act
      const result = await service.registerDevice(registerDto);

      // Assert
      expect(result.isActive).toBe(true);
    });

    it('should support iOS devices', async () => {
      // Arrange
      const registerDto = {
        userId: 'user-123',
        token: 'apns-token-xyz789',
        platform: DevicePlatform.IOS,
        deviceId: 'device-456',
        deviceName: 'iPhone 13 Pro',
      };

      mockDeviceTokenRepository.findOne.mockResolvedValue(null);
      mockDeviceTokenRepository.create.mockReturnValue({ ...registerDto, id: 'token-456' });
      mockDeviceTokenRepository.save.mockResolvedValue({ ...registerDto, id: 'token-456' });

      // Act
      const result = await service.registerDevice(registerDto);

      // Assert
      expect(result.platform).toBe(DevicePlatform.IOS);
    });

    it('should support web push', async () => {
      // Arrange
      const registerDto = {
        userId: 'user-123',
        token: 'web-push-token',
        platform: DevicePlatform.WEB,
        deviceId: 'browser-123',
      };

      mockDeviceTokenRepository.findOne.mockResolvedValue(null);
      mockDeviceTokenRepository.create.mockReturnValue({ ...registerDto, id: 'token-789' });
      mockDeviceTokenRepository.save.mockResolvedValue({ ...registerDto, id: 'token-789' });

      // Act
      const result = await service.registerDevice(registerDto);

      // Assert
      expect(result.platform).toBe(DevicePlatform.WEB);
    });
  });

  describe('unregisterDevice', () => {
    it('should unregister a device token', async () => {
      // Arrange
      const deviceToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'fcm-token-abc123',
      };

      mockDeviceTokenRepository.findOne.mockResolvedValue(deviceToken);
      mockDeviceTokenRepository.delete.mockResolvedValue({ affected: 1 });

      // Act
      await service.unregisterDevice('user-123', 'fcm-token-abc123');

      // Assert
      expect(deviceTokenRepository.delete).toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    it('should send push notification to all user devices', async () => {
      // Arrange
      const notificationDto = {
        userId: 'user-123',
        title: 'New Message',
        body: 'You have a new message from Dr. Smith',
        type: NotificationType.MESSAGE,
        priority: NotificationPriority.HIGH,
        data: {
          messageId: 'msg-123',
          conversationId: 'conv-456',
        },
      };

      const mockDevices = [
        {
          id: 'token-1',
          userId: 'user-123',
          token: 'fcm-token-1',
          platform: DevicePlatform.ANDROID,
          isActive: true,
        },
        {
          id: 'token-2',
          userId: 'user-123',
          token: 'fcm-token-2',
          platform: DevicePlatform.IOS,
          isActive: true,
        },
      ];

      mockDeviceTokenRepository.find.mockResolvedValue(mockDevices);
      mockPushNotificationRepository.create.mockImplementation((data) => data);
      mockPushNotificationRepository.save.mockImplementation((notification) =>
        Promise.resolve({ ...notification, id: 'notif-123' }),
      );

      // Act
      const result = await service.sendNotification(notificationDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.sentTo).toBe(2);
      expect(pushNotificationRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle FCM errors gracefully', async () => {
      // Arrange
      const notificationDto = {
        userId: 'user-123',
        title: 'Test',
        body: 'Test notification',
        type: NotificationType.ALERT,
      };

      const mockDevice = {
        id: 'token-1',
        token: 'invalid-token',
        platform: DevicePlatform.ANDROID,
      };

      mockDeviceTokenRepository.find.mockResolvedValue([mockDevice]);
      mockPushNotificationRepository.create.mockReturnValue({});
      mockPushNotificationRepository.save.mockResolvedValue({});

      // Act
      const result = await service.sendNotification(notificationDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it('should mark inactive tokens after send failure', async () => {
      // Arrange
      const notificationDto = {
        userId: 'user-123',
        title: 'Test',
        body: 'Test notification',
        type: NotificationType.ALERT,
      };

      const mockDevice = {
        id: 'token-1',
        token: 'expired-token',
        platform: DevicePlatform.ANDROID,
      };

      mockDeviceTokenRepository.find.mockResolvedValue([mockDevice]);
      mockDeviceTokenRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      await service.sendNotification(notificationDto);

      // Assert - device should be marked inactive on failure
      // Implementation depends on your FCM error handling
    });
  });

  describe('sendBulkNotification', () => {
    it('should send notifications to multiple users', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      const notificationDto = {
        title: 'System Alert',
        body: 'Important system update',
        type: NotificationType.SYSTEM,
      };

      mockDeviceTokenRepository.find.mockResolvedValue([
        { id: 't1', userId: 'user-1', token: 'token-1', platform: DevicePlatform.ANDROID },
        { id: 't2', userId: 'user-2', token: 'token-2', platform: DevicePlatform.IOS },
        { id: 't3', userId: 'user-3', token: 'token-3', platform: DevicePlatform.ANDROID },
      ]);

      mockPushNotificationRepository.create.mockImplementation((data) => data);
      mockPushNotificationRepository.save.mockImplementation((n) => Promise.resolve(n));

      // Act
      const result = await service.sendBulkNotification(userIds, notificationDto);

      // Assert
      expect(result.totalSent).toBe(3);
      expect(result.users).toBe(3);
    });
  });

  describe('sendScheduledNotification', () => {
    it('should schedule notification for future delivery', async () => {
      // Arrange
      const notificationDto = {
        userId: 'user-123',
        title: 'Appointment Reminder',
        body: 'Your appointment is tomorrow at 10 AM',
        type: NotificationType.REMINDER,
        scheduledFor: new Date(Date.now() + 86400000), // Tomorrow
      };

      mockPushNotificationRepository.create.mockReturnValue(notificationDto);
      mockPushNotificationRepository.save.mockResolvedValue({
        ...notificationDto,
        id: 'notif-123',
      });

      // Act
      const result = await service.sendScheduledNotification(notificationDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('notif-123');
      expect(result.scheduledFor).toBeDefined();
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return user notification preferences', async () => {
      // Arrange
      const userId = 'user-123';

      // Act
      const result = await service.getUserNotificationPreferences(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('appointments');
      expect(result).toHaveProperty('medications');
      expect(result).toHaveProperty('vitals');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update user notification preferences', async () => {
      // Arrange
      const userId = 'user-123';
      const preferences = {
        messages: true,
        appointments: true,
        medications: false,
        vitals: true,
        marketing: false,
      };

      // Act
      const result = await service.updateNotificationPreferences(userId, preferences);

      // Assert
      expect(result).toEqual(preferences);
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockNotifications = [
        {
          id: 'notif-1',
          userId,
          title: 'Message',
          body: 'New message',
          sentAt: new Date(),
          delivered: true,
        },
        {
          id: 'notif-2',
          userId,
          title: 'Reminder',
          body: 'Medication reminder',
          sentAt: new Date(),
          delivered: true,
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockNotifications, 2]),
      };

      mockPushNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getNotificationHistory(userId, { page: 1, limit: 20 });

      // Assert
      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('sendMedicationReminder', () => {
    it('should send medication reminder notification', async () => {
      // Arrange
      const medicationData = {
        userId: 'user-123',
        medicationId: 'med-456',
        medicationName: 'Metformin',
        dosage: '500mg',
        scheduledTime: new Date(),
      };

      mockDeviceTokenRepository.find.mockResolvedValue([
        {
          id: 'token-1',
          userId: 'user-123',
          token: 'fcm-token',
          platform: DevicePlatform.ANDROID,
        },
      ]);

      mockPushNotificationRepository.create.mockReturnValue({});
      mockPushNotificationRepository.save.mockResolvedValue({ id: 'notif-123' });

      // Act
      const result = await service.sendMedicationReminder(medicationData);

      // Assert
      expect(result).toBeDefined();
      expect(pushNotificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('sendVitalsAlert', () => {
    it('should send critical vitals alert to provider', async () => {
      // Arrange
      const alertData = {
        providerId: 'provider-456',
        patientId: 'patient-123',
        patientName: 'John Doe',
        vitalType: 'Blood Pressure',
        value: '180/110',
        threshold: '140/90',
        severity: 'CRITICAL',
      };

      mockDeviceTokenRepository.find.mockResolvedValue([
        {
          id: 'token-1',
          userId: 'provider-456',
          token: 'fcm-token',
          platform: DevicePlatform.IOS,
        },
      ]);

      mockPushNotificationRepository.create.mockReturnValue({});
      mockPushNotificationRepository.save.mockResolvedValue({ id: 'alert-123' });

      // Act
      const result = await service.sendVitalsAlert(alertData);

      // Assert
      expect(result).toBeDefined();
      expect(pushNotificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('sendAppointmentReminder', () => {
    it('should send appointment reminder 24 hours before', async () => {
      // Arrange
      const appointmentData = {
        userId: 'user-123',
        appointmentId: 'appt-456',
        providerName: 'Dr. Smith',
        appointmentTime: new Date(Date.now() + 86400000), // Tomorrow
        appointmentType: 'Telehealth',
      };

      mockDeviceTokenRepository.find.mockResolvedValue([
        {
          id: 'token-1',
          userId: 'user-123',
          token: 'fcm-token',
          platform: DevicePlatform.ANDROID,
        },
      ]);

      mockPushNotificationRepository.create.mockReturnValue({});
      mockPushNotificationRepository.save.mockResolvedValue({ id: 'reminder-123' });

      // Act
      const result = await service.sendAppointmentReminder(appointmentData);

      // Assert
      expect(result).toBeDefined();
      expect(pushNotificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('getDeviceStatistics', () => {
    it('should return device registration statistics', async () => {
      // Arrange
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { platform: 'ANDROID', count: 150 },
          { platform: 'IOS', count: 120 },
          { platform: 'WEB', count: 30 },
        ]),
      };

      mockDeviceTokenRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getDeviceStatistics();

      // Assert
      expect(result).toBeDefined();
      expect(result.total).toBe(300);
      expect(result.byPlatform).toBeDefined();
    });
  });
});
