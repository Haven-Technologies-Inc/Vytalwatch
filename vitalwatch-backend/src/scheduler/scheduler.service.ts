import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';

import { BillingService } from '../billing/billing.service';
import { AlertsService } from '../alerts/alerts.service';
import { ReportsService } from '../reports/reports.service';
import { AuditService } from '../audit/audit.service';
import { SmsService } from '../sms/sms.service';
import { AuthSecurityService } from '../auth/services/auth-security.service';
import { UsersService } from '../users/users.service';

import { Subscription, SubscriptionStatus } from '../billing/entities/subscription.entity';
import { Alert, AlertSeverity, AlertStatus, AlertType } from '../alerts/entities/alert.entity';
import { Device, DeviceStatus } from '../devices/entities/device.entity';
import { Medication, MedicationStatus } from '../medications/entities/medication.entity';
import { Report, ReportStatus } from '../reports/entities/report.entity';
import { User } from '../users/entities/user.entity';
import { BillingRecord, CPTCode } from '../billing/entities/billing-record.entity';

@Injectable()
export class SchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private isShuttingDown = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly billingService: BillingService,
    private readonly alertsService: AlertsService,
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
    private readonly smsService: SmsService,
    private readonly authSecurityService: AuthSecurityService,
    private readonly usersService: UsersService,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Medication)
    private readonly medicationRepository: Repository<Medication>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BillingRecord)
    private readonly billingRecordRepository: Repository<BillingRecord>,
  ) {}

  onModuleDestroy(): void {
    this.isShuttingDown = true;
  }

  // =========================================================================
  // (a) BILLING CYCLE - Daily at 2:00 AM
  // Checks for subscriptions due for renewal, generates monthly CPT billing
  // =========================================================================
  @Cron('0 2 * * *', { name: 'billing-cycle', timeZone: 'America/New_York' })
  async handleBillingCycle(): Promise<void> {
    if (this.isShuttingDown) return;
    const jobName = 'BillingCycle';
    this.logger.log(`[${jobName}] Starting daily billing cycle...`);
    const startTime = Date.now();

    try {
      // 1. Find subscriptions due for renewal (currentPeriodEnd is today or past)
      const now = new Date();
      const subscriptionsDue = await this.subscriptionRepository.find({
        where: {
          status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE]),
          currentPeriodEnd: LessThanOrEqual(now),
        },
      });

      this.logger.log(
        `[${jobName}] Found ${subscriptionsDue.length} subscriptions due for renewal`,
      );

      let renewalCount = 0;
      for (const subscription of subscriptionsDue) {
        try {
          // Stripe handles actual renewal via webhooks; this flags overdue ones
          if (subscription.status === SubscriptionStatus.ACTIVE) {
            subscription.status = SubscriptionStatus.PAST_DUE;
            await this.subscriptionRepository.save(subscription);
            renewalCount++;

            this.logger.warn(
              `[${jobName}] Subscription ${subscription.id} marked past_due - period ended ${subscription.currentPeriodEnd.toISOString()}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `[${jobName}] Failed to process subscription ${subscription.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      // 2. Generate monthly CPT billing records for eligible patients
      //    Find active devices that have met the 16-day reading threshold (99454)
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const activeDevices = await this.deviceRepository.find({
        where: { status: DeviceStatus.ACTIVE },
        relations: ['patient'],
      });

      let billingRecordsCreated = 0;
      for (const device of activeDevices) {
        try {
          if (!device.patientId || !device.patient) continue;

          // Check if a 99454 record already exists this month for this patient
          const existingRecord = await this.billingRecordRepository.findOne({
            where: {
              patientId: device.patientId,
              cptCode: CPTCode.DEVICE_SUPPLY,
              billingPeriodStart: MoreThanOrEqual(firstOfMonth),
              billingPeriodEnd: LessThanOrEqual(lastOfMonth),
            },
          });

          if (existingRecord) continue; // Already billed this month

          // Check if device has met reading threshold (16+ days)
          if (device.totalReadings >= 16) {
            const profile = await this.usersService.getPatientProfile(device.patientId);
            const providerId = profile?.assignedProviderId || device.patientId;
            await this.billingService.createBillingRecord({
              patientId: device.patientId,
              providerId,
              cptCode: CPTCode.DEVICE_SUPPLY,
              serviceDate: now,
              daysWithReadings: device.totalReadings,
              notes: 'Auto-generated by billing cycle scheduler',
              supportingData: {
                deviceTransmissions: device.totalReadings,
                interactionNotes: [`Device: ${device.id}`, `Period: ${firstOfMonth.toISOString()} - ${lastOfMonth.toISOString()}`],
              },
            });
            billingRecordsCreated++;
          }
        } catch (error) {
          this.logger.error(
            `[${jobName}] Failed to process billing for device ${device.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[${jobName}] Completed in ${elapsed}ms. Renewals flagged: ${renewalCount}, Billing records created: ${billingRecordsCreated}`,
      );
    } catch (error) {
      this.logger.error(
        `[${jobName}] Fatal error: ${error.message}`,
        error.stack,
      );
    }
  }

  // =========================================================================
  // (b) ALERT AGGREGATION - Every 15 minutes
  // Escalates unacknowledged critical alerts older than 30 minutes
  // =========================================================================
  @Cron('*/15 * * * *', { name: 'alert-aggregation' })
  async handleAlertAggregation(): Promise<void> {
    if (this.isShuttingDown) return;
    const jobName = 'AlertAggregation';
    this.logger.log(`[${jobName}] Checking for unacknowledged critical alerts...`);
    const startTime = Date.now();

    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find critical alerts that are still active (not acknowledged) and older than 30 minutes
      const staleCriticalAlerts = await this.alertRepository
        .createQueryBuilder('alert')
        .where('alert.status = :status', { status: AlertStatus.ACTIVE })
        .andWhere('alert.severity = :severity', { severity: AlertSeverity.CRITICAL })
        .andWhere('alert.createdAt <= :cutoff', { cutoff: thirtyMinutesAgo })
        .leftJoinAndSelect('alert.patient', 'patient')
        .getMany();

      this.logger.log(
        `[${jobName}] Found ${staleCriticalAlerts.length} unacknowledged critical alerts older than 30 minutes`,
      );

      let escalatedCount = 0;
      for (const alert of staleCriticalAlerts) {
        try {
          // Only re-escalate if not already escalated in the last 30 minutes
          if (alert.escalatedAt && alert.escalatedAt > thirtyMinutesAgo) {
            continue;
          }

          // Re-send notification for this alert
          await this.alertsService.escalate(
            alert.id,
            'SYSTEM',
            'Auto-escalated: unacknowledged critical alert older than 30 minutes',
          );
          escalatedCount++;

          this.logger.warn(
            `[${jobName}] Escalated alert ${alert.id} for patient ${alert.patientId}`,
          );
        } catch (error) {
          this.logger.error(
            `[${jobName}] Failed to escalate alert ${alert.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[${jobName}] Completed in ${elapsed}ms. Escalated: ${escalatedCount}/${staleCriticalAlerts.length}`,
      );
    } catch (error) {
      this.logger.error(
        `[${jobName}] Fatal error: ${error.message}`,
        error.stack,
      );
    }
  }

  // =========================================================================
  // (c) MEDICATION REMINDERS - Every hour
  // Finds medications with upcoming schedule windows and sends SMS reminders
  // =========================================================================
  @Cron(CronExpression.EVERY_HOUR, { name: 'medication-reminders' })
  async handleMedicationReminders(): Promise<void> {
    if (this.isShuttingDown) return;
    const jobName = 'MedicationReminders';
    this.logger.log(`[${jobName}] Checking for upcoming medication schedules...`);
    const startTime = Date.now();

    try {
      // Find all active medications
      const activeMedications = await this.medicationRepository.find({
        where: { status: MedicationStatus.ACTIVE },
        relations: ['prescriber'],
      });

      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const nextHour = ((now.getHours() + 1) % 24).toString().padStart(2, '0');

      let remindersSent = 0;
      let errorsCount = 0;

      for (const medication of activeMedications) {
        try {
          // Check if this medication has a schedule entry within the next hour
          if (!medication.schedule || !Array.isArray(medication.schedule)) {
            continue;
          }

          const upcomingDoses = medication.schedule.filter((entry) => {
            if (!entry.time) return false;
            const scheduleHour = entry.time.split(':')[0];
            return scheduleHour === currentHour || scheduleHour === nextHour;
          });

          if (upcomingDoses.length === 0) continue;

          // Get patient info to send SMS
          const patient = await this.usersService.findById(medication.patientId);
          if (!patient || !patient.phone) continue;

          for (const dose of upcomingDoses) {
            try {
              await this.smsService.sendMedicationReminder(
                { phone: patient.phone, firstName: patient.firstName, lastName: patient.lastName },
                { name: medication.name, dosage: medication.dosage, time: dose.time },
              );
              remindersSent++;
            } catch (smsError) {
              errorsCount++;
              this.logger.error(
                `[${jobName}] Failed to send reminder for medication ${medication.id} to patient ${medication.patientId}: ${smsError.message}`,
              );
            }
          }
        } catch (error) {
          errorsCount++;
          this.logger.error(
            `[${jobName}] Error processing medication ${medication.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[${jobName}] Completed in ${elapsed}ms. Reminders sent: ${remindersSent}, Errors: ${errorsCount}`,
      );
    } catch (error) {
      this.logger.error(
        `[${jobName}] Fatal error: ${error.message}`,
        error.stack,
      );
    }
  }

  // =========================================================================
  // (d) REPORT GENERATION - Daily at 6:00 AM
  // Processes scheduled reports that are due
  // =========================================================================
  @Cron('0 6 * * *', { name: 'report-generation', timeZone: 'America/New_York' })
  async handleReportGeneration(): Promise<void> {
    if (this.isShuttingDown) return;
    const jobName = 'ReportGeneration';
    this.logger.log(`[${jobName}] Processing scheduled reports...`);
    const startTime = Date.now();

    try {
      // Find reports that are in PENDING status (scheduled but not yet generated)
      const pendingReports = await this.reportRepository.find({
        where: { status: ReportStatus.PENDING },
        order: { createdAt: 'ASC' },
      });

      this.logger.log(
        `[${jobName}] Found ${pendingReports.length} pending reports to process`,
      );

      let processedCount = 0;
      let failedCount = 0;

      for (const report of pendingReports) {
        try {
          // Mark as generating
          await this.reportRepository.update(report.id, {
            status: ReportStatus.GENERATING,
          });

          // Generate the report using the existing service
          // The generate method handles async generation internally
          await this.reportsService.generate(
            {
              type: report.type,
              title: report.title,
              parameters: report.parameters,
              format: report.format,
            },
            {
              sub: report.createdById,
              id: report.createdById,
              organizationId: report.organizationId,
              role: 'system' as any,
              email: '',
            },
          );

          processedCount++;
          this.logger.log(
            `[${jobName}] Report ${report.id} (${report.type}) submitted for generation`,
          );
        } catch (error) {
          failedCount++;
          await this.reportRepository.update(report.id, {
            status: ReportStatus.FAILED,
            error: error.message,
          });
          this.logger.error(
            `[${jobName}] Failed to generate report ${report.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[${jobName}] Completed in ${elapsed}ms. Processed: ${processedCount}, Failed: ${failedCount}`,
      );
    } catch (error) {
      this.logger.error(
        `[${jobName}] Fatal error: ${error.message}`,
        error.stack,
      );
    }
  }

  // =========================================================================
  // (e) DATA CLEANUP - Daily at 3:00 AM
  // Cleans up expired sessions, old audit logs beyond 6 years, expired tokens
  // =========================================================================
  @Cron('0 3 * * *', { name: 'data-cleanup', timeZone: 'America/New_York' })
  async handleDataCleanup(): Promise<void> {
    if (this.isShuttingDown) return;
    const jobName = 'DataCleanup';
    this.logger.log(`[${jobName}] Starting data cleanup...`);
    const startTime = Date.now();

    try {
      // 1. Clean up expired verification/reset tokens
      const now = new Date();
      const expiredTokensResult = await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ resetToken: null as any, resetTokenExpiresAt: null as any })
        .where('resetTokenExpiresAt IS NOT NULL')
        .andWhere('resetTokenExpiresAt < :now', { now })
        .execute();

      this.logger.log(
        `[${jobName}] Cleared ${expiredTokensResult.affected || 0} expired reset tokens`,
      );

      // 2. Clean up old audit log entries beyond HIPAA retention (6 years = 2190 days)
      const retentionDays = this.configService.get<number>('audit.retentionDays') || 2190;
      const auditDeletedCount = await this.auditService.cleanup(retentionDays);
      this.logger.log(
        `[${jobName}] Cleaned up ${auditDeletedCount} audit log entries older than ${retentionDays} days`,
      );

      // 3. Clean up expired sessions
      //    Clear lastLoginAt for users inactive beyond the session timeout
      const sessionTimeoutMinutes = this.configService.get<number>('session.timeoutMinutes') || 15;
      const sessionCutoff = new Date(now.getTime() - sessionTimeoutMinutes * 60 * 1000 * 96);
      // Only clear extremely old sessions (96x timeout = ~1 day for 15min timeout)
      // This is a conservative approach; actual session validation happens in real-time guards
      const staleSessionsResult = await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ lastLoginAt: null as any })
        .where('lastLoginAt IS NOT NULL')
        .andWhere('lastLoginAt < :cutoff', { cutoff: sessionCutoff })
        .execute();

      this.logger.log(
        `[${jobName}] Cleared ${staleSessionsResult.affected || 0} stale session records`,
      );

      // 4. Clean up resolved alerts older than 90 days
      const alertCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oldAlertsResult = await this.alertRepository
        .createQueryBuilder()
        .delete()
        .from(Alert)
        .where('status = :status', { status: AlertStatus.RESOLVED })
        .andWhere('resolvedAt < :cutoff', { cutoff: alertCutoff })
        .execute();

      this.logger.log(
        `[${jobName}] Deleted ${oldAlertsResult.affected || 0} resolved alerts older than 90 days`,
      );

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[${jobName}] Completed in ${elapsed}ms`,
      );
    } catch (error) {
      this.logger.error(
        `[${jobName}] Fatal error: ${error.message}`,
        error.stack,
      );
    }
  }

  // =========================================================================
  // (f) DEVICE HEALTH CHECK - Every 30 minutes
  // Checks for devices that haven't reported data in 24+ hours and creates alerts
  // =========================================================================
  @Cron('*/30 * * * *', { name: 'device-health-check' })
  async handleDeviceHealthCheck(): Promise<void> {
    if (this.isShuttingDown) return;
    const jobName = 'DeviceHealthCheck';
    this.logger.log(`[${jobName}] Checking device health...`);
    const startTime = Date.now();

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find active devices that haven't synced in 24+ hours
      const staleDevices = await this.deviceRepository
        .createQueryBuilder('device')
        .where('device.status = :status', { status: DeviceStatus.ACTIVE })
        .andWhere('device.patientId IS NOT NULL')
        .andWhere(
          '(device.lastSyncAt IS NULL OR device.lastSyncAt < :cutoff)',
          { cutoff: twentyFourHoursAgo },
        )
        .leftJoinAndSelect('device.patient', 'patient')
        .getMany();

      this.logger.log(
        `[${jobName}] Found ${staleDevices.length} devices with no data in 24+ hours`,
      );

      let alertsCreated = 0;
      for (const device of staleDevices) {
        try {
          // Check if an active device-offline alert already exists for this device
          // Since the Alert entity does not have a deviceId column, we check metadata
          const existingAlert = await this.alertRepository
            .createQueryBuilder('alert')
            .where('alert.patientId = :patientId', { patientId: device.patientId })
            .andWhere('alert.type = :type', { type: AlertType.DEVICE_OFFLINE })
            .andWhere('alert.status = :status', { status: AlertStatus.ACTIVE })
            .andWhere("alert.metadata->>'deviceId' = :deviceId", { deviceId: device.id })
            .getOne();

          if (existingAlert) {
            // Alert already exists, skip to avoid duplicates
            continue;
          }

          const lastSync = device.lastSyncAt
            ? device.lastSyncAt.toISOString()
            : 'never';

          await this.alertsService.create({
            patientId: device.patientId,
            type: AlertType.DEVICE_OFFLINE,
            severity: AlertSeverity.MEDIUM,
            title: `Device Offline: ${device.name || device.serialNumber}`,
            message: `Device ${device.name || device.serialNumber} (${device.type}) has not reported data since ${lastSync}. Please check the device connection.`,
            metadata: {
              deviceId: device.id,
              deviceType: device.type,
              serialNumber: device.serialNumber,
              lastSyncAt: lastSync,
              autoGenerated: true,
            },
          });

          // Mark device as disconnected
          await this.deviceRepository.update(device.id, {
            status: DeviceStatus.DISCONNECTED,
          });

          alertsCreated++;
        } catch (error) {
          this.logger.error(
            `[${jobName}] Failed to create alert for device ${device.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[${jobName}] Completed in ${elapsed}ms. Alerts created: ${alertsCreated}`,
      );
    } catch (error) {
      this.logger.error(
        `[${jobName}] Fatal error: ${error.message}`,
        error.stack,
      );
    }
  }

  // =========================================================================
  // (g) TOKEN BLACKLIST CLEANUP - Every hour
  // Monitors Redis-backed auth security data and logs stats.
  // Redis TTL handles automatic expiry of blacklisted tokens, lockouts, and
  // login attempts. This job provides observability and auditing.
  // Replaces the former setInterval in the legacy in-memory auth-security.service.ts.
  // =========================================================================
  @Cron(CronExpression.EVERY_HOUR, { name: 'token-blacklist-cleanup' })
  async handleTokenBlacklistCleanup(): Promise<void> {
    if (this.isShuttingDown) return;
    const jobName = 'TokenBlacklistCleanup';
    this.logger.log(`[${jobName}] Running auth security health check...`);
    const startTime = Date.now();

    try {
      // Fetch current stats from the Redis-backed AuthSecurityService
      const stats = await this.authSecurityService.getSecurityStats();

      // Log current state for monitoring and alerting
      this.logger.log(
        `[${jobName}] Security stats - ` +
        `Locked accounts: ${stats.lockedAccounts}, ` +
        `Blacklisted tokens: ${stats.blacklistedTokens}`,
      );

      // Warn if there are an unusually high number of locked accounts
      if (stats.lockedAccounts > 50) {
        this.logger.warn(
          `[${jobName}] High number of locked accounts detected: ${stats.lockedAccounts}. ` +
          `Possible brute-force attack in progress.`,
        );
      }

      // Warn if blacklist is growing excessively (potential token leak or abuse)
      if (stats.blacklistedTokens > 10000) {
        this.logger.warn(
          `[${jobName}] Large token blacklist detected: ${stats.blacklistedTokens}. ` +
          `Redis TTL should be handling expiry - investigate if keys are persisting.`,
        );
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(`[${jobName}] Completed in ${elapsed}ms`);
    } catch (error) {
      this.logger.error(
        `[${jobName}] Fatal error: ${error.message}`,
        error.stack,
      );
    }
  }
}
