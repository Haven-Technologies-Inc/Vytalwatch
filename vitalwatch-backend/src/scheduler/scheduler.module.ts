import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';

// Feature modules
import { BillingModule } from '../billing/billing.module';
import { AlertsModule } from '../alerts/alerts.module';
import { ReportsModule } from '../reports/reports.module';
import { AuditModule } from '../audit/audit.module';
import { SmsModule } from '../sms/sms.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

// Entities (for direct repository access in scheduler)
import { Subscription } from '../billing/entities/subscription.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { Device } from '../devices/entities/device.entity';
import { Medication } from '../medications/entities/medication.entity';
import { Report } from '../reports/entities/report.entity';
import { User } from '../users/entities/user.entity';
import { BillingRecord } from '../billing/entities/billing-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      Alert,
      Device,
      Medication,
      Report,
      User,
      BillingRecord,
    ]),
    BillingModule,
    AlertsModule,
    ReportsModule,
    AuditModule,
    SmsModule,
    AuthModule,
    UsersModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
