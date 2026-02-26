import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User } from '../users/entities/user.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { Device } from '../devices/entities/device.entity';
import { VitalReading } from '../vitals/entities/vital-reading.entity';
import { RPMAnalyticsService } from './rpm-analytics.service';
import { RPMAnalyticsController } from './rpm-analytics.controller';
import { Claim } from '../claims/entities/claim.entity';
import { Task } from '../tasks/entities/task.entity';
import { TimeEntry } from '../time-tracking/entities/time-entry.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Alert, Device, VitalReading, Claim, Task, TimeEntry, Enrollment])],
  controllers: [AnalyticsController, RPMAnalyticsController],
  providers: [AnalyticsService, RPMAnalyticsService],
  exports: [AnalyticsService, RPMAnalyticsService],
})
export class AnalyticsModule {}
