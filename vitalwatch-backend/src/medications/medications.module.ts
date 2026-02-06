import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import {
  Medication,
  MedicationSchedule,
  MedicationAdherence,
} from './entities/medication.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';

/**
 * Medications Module
 *
 * Provides comprehensive medication management for RPM platform including:
 * - Medication prescribing and management
 * - Automated scheduling based on frequency
 * - Adherence tracking and reporting
 * - Drug interaction checking
 * - Automated reminders and alerts
 * - Refill management
 * - HIPAA-compliant audit logging
 *
 * Key Features:
 * - Supports multiple medication types and routes
 * - Flexible scheduling (daily, BID, TID, QID, PRN, etc.)
 * - Real-time adherence monitoring
 * - Provider alerts for missed doses and side effects
 * - Integration with Tasks module for reminders
 * - Integration with Notifications for patient alerts
 * - Comprehensive audit trail for compliance
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Medication,
      MedicationSchedule,
      MedicationAdherence,
    ]),
    ScheduleModule.forRoot(),
    AuditModule,
    NotificationsModule,
    TasksModule,
  ],
  controllers: [MedicationsController],
  providers: [MedicationsService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
