import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User } from '../users/entities/user.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { Device } from '../devices/entities/device.entity';
import { VitalReading } from '../vitals/entities/vital-reading.entity';
import { Medication } from '../medications/entities/medication.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { BillingRecord } from '../billing/entities/billing-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Alert,
      Device,
      VitalReading,
      Medication,
      Appointment,
      Subscription,
      BillingRecord,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
