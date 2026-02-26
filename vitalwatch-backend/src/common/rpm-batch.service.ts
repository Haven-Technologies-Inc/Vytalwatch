import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';
import { Task, TaskType, TaskPriority, TaskStatus } from '../tasks/entities/task.entity';
import { Claim, ClaimStatus } from '../claims/entities/claim.entity';

@Injectable()
export class RPMBatchService {
  private readonly logger = new Logger(RPMBatchService.name);

  constructor(
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(Claim) private claimRepo: Repository<Claim>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateDailyTasks() {
    this.logger.log('Running daily task generation...');
    const enrollments = await this.enrollRepo.find({ where: { status: EnrollmentStatus.ACTIVE } });
    let created = 0;
    for (const e of enrollments) {
      const periodEnd = new Date(e.currentBillingPeriodEnd);
      const daysLeft = Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 5 && daysLeft > 0) {
        await this.taskRepo.save(this.taskRepo.create({
          type: TaskType.BILLING_REVIEW, priority: TaskPriority.HIGH, status: TaskStatus.PENDING,
          patientId: e.patientId, clinicId: e.clinicId,
          title: 'Period ending in ' + daysLeft + ' days - Review billing readiness',
          dueAt: periodEnd,
        }));
        created++;
      }
    }
    this.logger.log('Created ' + created + ' billing review tasks');
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async advanceBillingPeriods() {
    this.logger.log('Advancing billing periods...');
    const now = new Date();
    const expired = await this.enrollRepo.find({ where: { status: EnrollmentStatus.ACTIVE, currentBillingPeriodEnd: LessThan(now) } });
    for (const e of expired) {
      const newStart = new Date(e.currentBillingPeriodEnd);
      const newEnd = new Date(newStart); newEnd.setDate(newEnd.getDate() + 30);
      await this.enrollRepo.update(e.id, { currentBillingPeriodStart: newStart, currentBillingPeriodEnd: newEnd });
    }
    this.logger.log('Advanced ' + expired.length + ' enrollment periods');
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async buildPendingClaims() {
    this.logger.log('Building pending claims...');
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const enrollments = await this.enrollRepo.find({
      where: { status: EnrollmentStatus.ACTIVE, currentBillingPeriodEnd: Between(yesterday, new Date()) },
    });
    for (const e of enrollments) {
      const existing = await this.claimRepo.findOne({ where: { enrollmentId: e.id, periodEnd: e.currentBillingPeriodEnd } });
      if (!existing) {
        await this.claimRepo.save(this.claimRepo.create({
          patientId: e.patientId, enrollmentId: e.id, clinicId: e.clinicId,
          periodStart: e.currentBillingPeriodStart, periodEnd: e.currentBillingPeriodEnd,
          programType: e.programType, status: ClaimStatus.DRAFT,
        }));
      }
    }
    this.logger.log('Processed ' + enrollments.length + ' enrollments for claims');
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkComplianceAlerts() {
    this.logger.log('Checking compliance alerts...');
    const enrollments = await this.enrollRepo.find({ where: { status: EnrollmentStatus.ACTIVE } });
    let alerts = 0;
    for (const e of enrollments) {
      const periodStart = new Date(e.currentBillingPeriodStart);
      const daysSinceStart = Math.ceil((Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceStart >= 20) {
        const existing = await this.taskRepo.findOne({ where: { patientId: e.patientId, type: TaskType.COMPLIANCE_CHECK, status: TaskStatus.PENDING } });
        if (!existing) {
          await this.taskRepo.save(this.taskRepo.create({
            type: TaskType.COMPLIANCE_CHECK, priority: TaskPriority.MEDIUM, status: TaskStatus.PENDING,
            patientId: e.patientId, clinicId: e.clinicId,
            title: 'Compliance check - Verify reading days and time',
          }));
          alerts++;
        }
      }
    }
    this.logger.log('Created ' + alerts + ' compliance check tasks');
  }
}
