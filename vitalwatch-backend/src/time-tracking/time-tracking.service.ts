import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeEntry, TimeEntryCategory, TimeEntryStatus } from './entities/time-entry.entity';

@Injectable()
export class TimeTrackingService {
  constructor(@InjectRepository(TimeEntry) private readonly repo: Repository<TimeEntry>) {}

  async startTimer(data: { patientId: string; userId: string; category: TimeEntryCategory; enrollmentId?: string }): Promise<TimeEntry> {
    const entry = this.repo.create({ ...data, startAt: new Date(), status: TimeEntryStatus.DRAFT });
    return this.repo.save(entry);
  }

  async stopTimer(id: string): Promise<TimeEntry> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Time entry not found');
    entry.endAt = new Date();
    entry.minutes = Math.round((entry.endAt.getTime() - entry.startAt.getTime()) / 60000);
    return this.repo.save(entry);
  }

  async findByPatient(patientId: string, startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
    const query = this.repo.createQueryBuilder('te').where('te.patientId = :patientId', { patientId });
    if (startDate) query.andWhere('te.startAt >= :startDate', { startDate });
    if (endDate) query.andWhere('te.startAt <= :endDate', { endDate });
    return query.orderBy('te.startAt', 'DESC').getMany();
  }

  async getTotalMinutes(patientId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.repo.createQueryBuilder('te')
      .select('SUM(te.minutes)', 'total')
      .where('te.patientId = :patientId', { patientId })
      .andWhere('te.startAt >= :startDate', { startDate })
      .andWhere('te.startAt <= :endDate', { endDate })
      .andWhere('te.billable = true')
      .getRawOne();
    return result?.total || 0;
  }

  async confirm(id: string): Promise<TimeEntry> {
    await this.repo.update(id, { status: TimeEntryStatus.CONFIRMED });
    return this.repo.findOne({ where: { id } });
  }
}
