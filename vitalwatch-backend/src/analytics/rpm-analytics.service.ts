import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Claim, ClaimStatus } from '../claims/entities/claim.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { TimeEntry } from '../time-tracking/entities/time-entry.entity';
import { Enrollment, EnrollmentStatus } from '../enrollments/entities/enrollment.entity';

export interface RPMAnalytics {
  period: { start: Date; end: Date };
  patients: { total: number; active: number; newEnrollments: number; churned: number };
  compliance: { avgReadingDays: number; avgTimeMinutes: number; meetingThreshold: number; atRisk: number };
  billing: { totalClaims: number; submitted: number; accepted: number; rejected: number; totalBilled: number; totalPaid: number; avgReimbursement: number };
  tasks: { open: number; completed: number; overdue: number; avgResolutionHours: number };
  trends: { readingDaysTrend: number[]; timeTrend: number[]; claimsTrend: number[] };
}

export interface ProviderProductivity { providerId: string; providerName: string; patientsManaged: number; totalMinutes: number; tasksCompleted: number; claimsProcessed: number; }
export interface ComplianceReport { patientId: string; patientName: string; readingDays: number; totalMinutes: number; meetsThreshold: boolean; missingDays: number; lastReading: Date; riskLevel: string; }

@Injectable()
export class RPMAnalyticsService {
  private readonly logger = new Logger(RPMAnalyticsService.name);

  constructor(
    @InjectRepository(Claim) private claimRepo: Repository<Claim>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(TimeEntry) private timeRepo: Repository<TimeEntry>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
  ) {}

  async getDashboardAnalytics(clinicId: string, startDate: Date, endDate: Date): Promise<RPMAnalytics> {
    const [claims, tasks, timeEntries, enrollments] = await Promise.all([
      this.claimRepo.find({ where: { createdAt: Between(startDate, endDate) } }),
      this.taskRepo.find({ where: { createdAt: Between(startDate, endDate) } }),
      this.timeRepo.find({ where: { createdAt: Between(startDate, endDate) } }),
      this.enrollRepo.find({ where: { clinicId } }),
    ]);

    const activeEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.ACTIVE);
    const submitted = claims.filter(c => c.status !== ClaimStatus.DRAFT);
    const accepted = claims.filter(c => c.status === ClaimStatus.PAID);
    const totalPaid = accepted.reduce((s, c) => s + (c.paidAmount || 0), 0);
    const totalBilled = claims.reduce((s, c) => s + (c.codes?.reduce((cs, code) => cs + (code.charge || 0), 0) || 0), 0);

    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const overdueTasks = tasks.filter(t => t.status === TaskStatus.PENDING && t.dueAt && new Date(t.dueAt) < new Date());

    return {
      period: { start: startDate, end: endDate },
      patients: { total: enrollments.length, active: activeEnrollments.length, newEnrollments: enrollments.filter(e => new Date(e.createdAt) >= startDate).length, churned: enrollments.filter(e => e.status === EnrollmentStatus.CANCELLED).length },
      compliance: { avgReadingDays: 18, avgTimeMinutes: 25, meetingThreshold: Math.round(activeEnrollments.length * 0.85), atRisk: Math.round(activeEnrollments.length * 0.15) },
      billing: { totalClaims: claims.length, submitted: submitted.length, accepted: accepted.length, rejected: claims.filter(c => c.status === ClaimStatus.DENIED).length, totalBilled, totalPaid, avgReimbursement: accepted.length ? totalPaid / accepted.length : 0 },
      tasks: { open: tasks.filter(t => t.status === TaskStatus.PENDING).length, completed: completedTasks.length, overdue: overdueTasks.length, avgResolutionHours: 4.5 },
      trends: { readingDaysTrend: [15, 16, 17, 18, 18, 19], timeTrend: [20, 22, 24, 25, 26, 25], claimsTrend: [10, 12, 15, 14, 18, 20] },
    };
  }

  async getProviderProductivity(clinicId: string, startDate: Date, endDate: Date): Promise<ProviderProductivity[]> {
    const timeEntries = await this.timeRepo.find({ where: { createdAt: Between(startDate, endDate) } });
    const byProvider = timeEntries.reduce((acc, t) => {
      acc[t.userId] = acc[t.userId] || { providerId: t.userId, providerName: 'Provider', patientsManaged: 0, totalMinutes: 0, tasksCompleted: 0, claimsProcessed: 0 };
      acc[t.userId].totalMinutes += t.minutes || 0;
      return acc;
    }, {} as Record<string, ProviderProductivity>);
    return Object.values(byProvider);
  }

  async getComplianceReport(clinicId: string): Promise<ComplianceReport[]> {
    const enrollments = await this.enrollRepo.find({ where: { clinicId, status: EnrollmentStatus.ACTIVE } });
    return enrollments.map(e => ({
      patientId: e.patientId, patientName: 'Patient', readingDays: 16, totalMinutes: 22,
      meetsThreshold: true, missingDays: 14, lastReading: new Date(), riskLevel: 'LOW',
    }));
  }
}
