import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PushNotificationsController } from './push-notifications.controller';
import { PushNotificationsService } from './push-notifications.service';
import { FcmProvider } from './providers/fcm.provider';
import { ApnsProvider } from './providers/apns.provider';
import { WebPushProvider } from './providers/web-push.provider';
import { DeviceToken } from './entities/device-token.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationCreatedListener } from './listeners/notification-created.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceToken, Notification]),
    ConfigModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [PushNotificationsController],
  providers: [
    PushNotificationsService,
    FcmProvider,
    ApnsProvider,
    WebPushProvider,
    NotificationCreatedListener,
  ],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
