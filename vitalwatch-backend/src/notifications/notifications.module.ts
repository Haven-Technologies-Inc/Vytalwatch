import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    ConfigModule,
    EmailModule,
    SmsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
