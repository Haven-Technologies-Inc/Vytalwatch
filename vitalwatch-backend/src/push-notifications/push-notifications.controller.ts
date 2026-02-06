import {
  Controller,
  Post,
  Delete,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PushNotificationsService } from './push-notifications.service';
import { WebPushProvider } from './providers/web-push.provider';
import {
  RegisterDeviceDto,
  UnregisterDeviceDto,
  SendNotificationDto,
  SendBatchNotificationDto,
  SendTopicNotificationDto,
  ScheduleNotificationDto,
  TestNotificationDto,
  UpdateDevicePreferencesDto,
  UpdateBadgeCountDto,
  IncrementBadgeDto,
  GetHistoryQueryDto,
  GetDevicesQueryDto,
} from './dto/push-notification.dto';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushNotificationsController {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
    private readonly webPushProvider: WebPushProvider,
  ) {}

  /**
   * Register device for push notifications
   * POST /push/register
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerDevice(@Request() req, @Body() registerDeviceDto: RegisterDeviceDto) {
    const userId = req.user.userId;

    const device = await this.pushNotificationsService.registerDevice(
      userId,
      registerDeviceDto.token,
      registerDeviceDto.platform,
      registerDeviceDto.deviceInfo,
      registerDeviceDto.preferences,
    );

    return {
      success: true,
      message: 'Device registered successfully',
      device: {
        id: device.id,
        platform: device.platform,
        enabled: device.enabled,
        createdAt: device.createdAt,
      },
    };
  }

  /**
   * Unregister device
   * DELETE /push/unregister/:deviceId
   */
  @Delete('unregister/:deviceId')
  @HttpCode(HttpStatus.OK)
  async unregisterDevice(@Request() req, @Param('deviceId') deviceId: string) {
    const userId = req.user.userId;

    await this.pushNotificationsService.unregisterDevice(userId, deviceId);

    return {
      success: true,
      message: 'Device unregistered successfully',
    };
  }

  /**
   * Send push notification (admin only)
   * POST /push/send
   */
  @Post('send')
  @UseGuards(RolesGuard)
  @Roles('admin', 'doctor', 'nurse')
  @HttpCode(HttpStatus.OK)
  async sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
    const result = await this.pushNotificationsService.sendNotification(
      sendNotificationDto.userId,
      {
        title: sendNotificationDto.title,
        body: sendNotificationDto.body,
        category: sendNotificationDto.category,
        priority: sendNotificationDto.priority,
        data: sendNotificationDto.data,
        sound: sendNotificationDto.sound,
        icon: sendNotificationDto.icon,
        color: sendNotificationDto.color,
        deepLink: sendNotificationDto.deepLink,
        imageUrl: sendNotificationDto.imageUrl,
        actions: sendNotificationDto.actions,
        badge: sendNotificationDto.badge,
      },
    );

    return {
      success: result.success,
      message: result.success
        ? `Notification sent to ${result.sentCount} device(s)`
        : 'Failed to send notification',
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      errors: result.errors,
    };
  }

  /**
   * Send batch notification (admin only)
   * POST /push/send-batch
   */
  @Post('send-batch')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async sendBatchNotification(@Body() sendBatchDto: SendBatchNotificationDto) {
    const result = await this.pushNotificationsService.sendToMultiple(sendBatchDto.userIds, {
      title: sendBatchDto.title,
      body: sendBatchDto.body,
      category: sendBatchDto.category,
      priority: sendBatchDto.priority,
      data: sendBatchDto.data,
      sound: sendBatchDto.sound,
      icon: sendBatchDto.icon,
      color: sendBatchDto.color,
      deepLink: sendBatchDto.deepLink,
      imageUrl: sendBatchDto.imageUrl,
    });

    return {
      success: result.success,
      message: `Notification sent to ${result.sentCount} device(s)`,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      errors: result.errors,
    };
  }

  /**
   * Send topic notification (admin only)
   * POST /push/send-topic
   */
  @Post('send-topic')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async sendTopicNotification(@Body() sendTopicDto: SendTopicNotificationDto) {
    const result = await this.pushNotificationsService.sendToTopic(sendTopicDto.topic, {
      title: sendTopicDto.title,
      body: sendTopicDto.body,
      category: sendTopicDto.category,
      priority: sendTopicDto.priority,
      data: sendTopicDto.data,
      sound: sendTopicDto.sound,
      icon: sendTopicDto.icon,
      color: sendTopicDto.color,
      deepLink: sendTopicDto.deepLink,
      imageUrl: sendTopicDto.imageUrl,
    });

    return {
      success: result.success,
      message: result.success
        ? `Notification sent to topic: ${sendTopicDto.topic}`
        : 'Failed to send notification',
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      errors: result.errors,
    };
  }

  /**
   * Schedule notification (admin only)
   * POST /push/schedule
   */
  @Post('schedule')
  @UseGuards(RolesGuard)
  @Roles('admin', 'doctor', 'nurse')
  @HttpCode(HttpStatus.OK)
  async scheduleNotification(@Body() scheduleDto: ScheduleNotificationDto) {
    const scheduledFor = new Date(scheduleDto.scheduledFor);

    if (isNaN(scheduledFor.getTime())) {
      throw new BadRequestException('Invalid scheduledFor date');
    }

    const scheduled = await this.pushNotificationsService.scheduleNotification(
      scheduleDto.userId,
      {
        title: scheduleDto.title,
        body: scheduleDto.body,
        category: scheduleDto.category,
        priority: scheduleDto.priority,
        data: scheduleDto.data,
        sound: scheduleDto.sound,
        icon: scheduleDto.icon,
        color: scheduleDto.color,
        deepLink: scheduleDto.deepLink,
        imageUrl: scheduleDto.imageUrl,
      },
      scheduledFor,
    );

    return {
      success: true,
      message: 'Notification scheduled successfully',
      scheduled: {
        id: scheduled.id,
        scheduledFor: scheduled.scheduledFor,
      },
    };
  }

  /**
   * Cancel scheduled notification (admin only)
   * DELETE /push/schedule/:notificationId
   */
  @Delete('schedule/:notificationId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'doctor', 'nurse')
  @HttpCode(HttpStatus.OK)
  async cancelScheduled(@Param('notificationId') notificationId: string) {
    await this.pushNotificationsService.cancelScheduled(notificationId);

    return {
      success: true,
      message: 'Scheduled notification cancelled',
    };
  }

  /**
   * Send test notification
   * POST /push/test
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testNotification(@Request() req, @Body() testDto: TestNotificationDto) {
    const userId = req.user.userId;

    const result = await this.pushNotificationsService.sendNotification(userId, {
      title: testDto.title,
      body: testDto.body,
      data: testDto.data,
      category: 'test',
    });

    return {
      success: result.success,
      message: result.success
        ? `Test notification sent to ${result.sentCount} device(s)`
        : 'Failed to send test notification',
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      errors: result.errors,
    };
  }

  /**
   * Get user's devices
   * GET /push/devices
   */
  @Get('devices')
  async getDevices(@Request() req, @Query() query: GetDevicesQueryDto) {
    const userId = req.user.userId;

    const devices = await this.pushNotificationsService.getUserDevices(
      userId,
      query.platform,
      query.enabledOnly !== false,
    );

    return {
      success: true,
      devices: devices.map((device) => ({
        id: device.id,
        platform: device.platform,
        enabled: device.enabled,
        status: device.status,
        deviceInfo: device.deviceInfo,
        lastUsedAt: device.lastUsedAt,
        createdAt: device.createdAt,
      })),
    };
  }

  /**
   * Update device preferences
   * PATCH /push/devices/:deviceId
   */
  @Patch('devices/:deviceId')
  @HttpCode(HttpStatus.OK)
  async updateDevicePreferences(
    @Request() req,
    @Param('deviceId') deviceId: string,
    @Body() updateDto: UpdateDevicePreferencesDto,
  ) {
    const userId = req.user.userId;

    const device = await this.pushNotificationsService.updateDevicePreferences(
      userId,
      deviceId,
      updateDto.enabled,
      updateDto.preferences,
    );

    return {
      success: true,
      message: 'Device preferences updated successfully',
      device: {
        id: device.id,
        enabled: device.enabled,
        preferences: device.preferences,
      },
    };
  }

  /**
   * Enable device
   * PATCH /push/devices/:deviceId/enable
   */
  @Patch('devices/:deviceId/enable')
  @HttpCode(HttpStatus.OK)
  async enableDevice(@Request() req, @Param('deviceId') deviceId: string) {
    const userId = req.user.userId;

    await this.pushNotificationsService.updateDevicePreferences(userId, deviceId, true);

    return {
      success: true,
      message: 'Device enabled successfully',
    };
  }

  /**
   * Disable device
   * PATCH /push/devices/:deviceId/disable
   */
  @Patch('devices/:deviceId/disable')
  @HttpCode(HttpStatus.OK)
  async disableDevice(@Request() req, @Param('deviceId') deviceId: string) {
    const userId = req.user.userId;

    await this.pushNotificationsService.updateDevicePreferences(userId, deviceId, false);

    return {
      success: true,
      message: 'Device disabled successfully',
    };
  }

  /**
   * Update badge count (iOS)
   * PATCH /push/badge
   */
  @Patch('badge')
  @HttpCode(HttpStatus.OK)
  async updateBadgeCount(@Request() req, @Body() updateBadgeDto: UpdateBadgeCountDto) {
    const userId = req.user.userId;

    await this.pushNotificationsService.updateBadgeCount(userId, updateBadgeDto.badgeCount);

    return {
      success: true,
      message: 'Badge count updated successfully',
    };
  }

  /**
   * Increment badge count (iOS)
   * POST /push/badge/increment
   */
  @Post('badge/increment')
  @HttpCode(HttpStatus.OK)
  async incrementBadge(@Request() req, @Body() incrementDto: IncrementBadgeDto) {
    const userId = req.user.userId;

    await this.pushNotificationsService.incrementBadge(
      userId,
      incrementDto.increment || 1,
    );

    return {
      success: true,
      message: 'Badge count incremented successfully',
    };
  }

  /**
   * Reset badge count (iOS)
   * POST /push/badge/reset
   */
  @Post('badge/reset')
  @HttpCode(HttpStatus.OK)
  async resetBadge(@Request() req) {
    const userId = req.user.userId;

    await this.pushNotificationsService.resetBadge(userId);

    return {
      success: true,
      message: 'Badge count reset successfully',
    };
  }

  /**
   * Get notification history
   * GET /push/history
   */
  @Get('history')
  async getHistory(@Request() req, @Query() query: GetHistoryQueryDto) {
    const userId = req.user.userId;

    const { notifications, total } = await this.pushNotificationsService.getNotificationHistory(
      userId,
      {
        page: query.page || 1,
        limit: query.limit || 20,
        category: query.category,
        priority: query.priority,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
    );

    return {
      success: true,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        category: notification.category,
        status: notification.status,
        data: notification.data,
        sentAt: notification.sentAt,
        createdAt: notification.createdAt,
      })),
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  /**
   * Get Web Push public key
   * GET /push/vapid-public-key
   */
  @Get('vapid-public-key')
  async getVapidPublicKey() {
    const publicKey = this.webPushProvider.getPublicKey();

    if (!publicKey) {
      throw new BadRequestException('Web Push not configured');
    }

    return {
      success: true,
      publicKey,
    };
  }

  /**
   * Health check
   * GET /push/health
   */
  @Get('health')
  async healthCheck() {
    return {
      success: true,
      providers: {
        fcm: true, // Check if initialized
        apns: true,
        webPush: this.webPushProvider.isInitialized(),
      },
    };
  }
}
