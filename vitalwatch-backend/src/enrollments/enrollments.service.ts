import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, EnrollmentStatus, ProgramType } from './entities/enrollment.entity';

@Injectable()
export class EnrollmentsService {
  constructor(@InjectRepository(Enrollment) private readonly repo: Repository<Enrollment>) {}

  async create(data: Partial<Enrollment>): Promise<Enrollment> {
    const startDate = data.startDate || new Date();
    const periodEnd = new Date(startDate);
    periodEnd.setDate(periodEnd.getDate() + 30);
    const enrollment = this.repo.create({
      ...data,
      startDate,
      currentBillingPeriodStart: startDate,
      currentBillingPeriodEnd: periodEnd,
    });
    return this.repo.save(enrollment);
  }

  async findAll(filters?: { clinicId?: string; patientId?: string; status?: EnrollmentStatus }): Promise<Enrollment[]> {
    const query = this.repo.createQueryBuilder('e');
    if (filters?.clinicId) query.andWhere('e.clinicId = :clinicId', { clinicId: filters.clinicId });
    if (filters?.patientId) query.andWhere('e.patientId = :patientId', { patientId: filters.patientId });
    if (filters?.status) query.andWhere('e.status = :status', { status: filters.status });
    return query.orderBy('e.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Enrollment> {
    const enrollment = await this.repo.findOne({ where: { id } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  async update(id: string, data: Partial<Enrollment>): Promise<Enrollment> {
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async completeSetup(id: string, noteId: string): Promise<Enrollment> {
    return this.update(id, { setupCompleted: true, setupCompletedAt: new Date(), setupNoteId: noteId });
  }

  async advanceBillingPeriod(id: string): Promise<Enrollment> {
    const enrollment = await this.findOne(id);
    const newStart = new Date(enrollment.currentBillingPeriodEnd);
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + 30);
    return this.update(id, { currentBillingPeriodStart: newStart, currentBillingPeriodEnd: newEnd });
  }
}
