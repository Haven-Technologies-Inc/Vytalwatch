import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

// Database
import { DatabaseModule } from './database/database.module';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VitalsModule } from './vitals/vitals.module';
import { AlertsModule } from './alerts/alerts.module';
import { DevicesModule } from './devices/devices.module';
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { AIModule } from './ai/ai.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Database
    DatabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    VitalsModule,
    AlertsModule,
    DevicesModule,
    BillingModule,
    NotificationsModule,
    AuditModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
