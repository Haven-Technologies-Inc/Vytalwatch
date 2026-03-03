import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medication, MedicationLog, MedicationStatus } from './entities/medication.entity';
import { CreateMedicationDto, UpdateMedicationDto, MarkTakenDto, MedicationQueryDto } from './dto/medication.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectRepository(Medication)
    private readonly medicationRepository: Repository<Medication>,
    @InjectRepository(MedicationLog)
    private readonly logRepository: Repository<MedicationLog>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateMedicationDto, userId: string): Promise<Medication> {
    const medication = this.medicationRepository.create({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      refillDate: dto.refillDate ? new Date(dto.refillDate) : null,
    });

    const saved = await this.medicationRepository.save(medication);

    await this.auditService.log({
      action: 'MEDICATION_CREATED',
      userId,
      resourceType: 'medication',
      resourceId: saved.id,
      details: { patientId: dto.patientId, name: dto.name },
    });

    return saved;
  }

  async findAll(query: MedicationQueryDto): Promise<{ medications: Medication[]; total: number }> {
    const { patientId, status, page = 1, limit = 20 } = query;

    const qb = this.medicationRepository.createQueryBuilder('med')
      .leftJoinAndSelect('med.prescriber', 'prescriber');

    if (patientId) qb.andWhere('med.patientId = :patientId', { patientId });
    if (status) qb.andWhere('med.status = :status', { status });

    qb.orderBy('med.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [medications, total] = await qb.getManyAndCount();
    return { medications, total };
  }

  async findOne(id: string): Promise<Medication> {
    const medication = await this.medicationRepository.findOne({
      where: { id },
      relations: ['prescriber'],
    });
    if (!medication) throw new NotFoundException('Medication not found');
    return medication;
  }

  async findByPatient(patientId: string, status?: MedicationStatus): Promise<Medication[]> {
    const where: any = { patientId };
    if (status) where.status = status;

    return this.medicationRepository.find({
      where,
      relations: ['prescriber'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(patientId: string): Promise<Medication[]> {
    return this.findByPatient(patientId, MedicationStatus.ACTIVE);
  }

  async update(id: string, dto: UpdateMedicationDto, userId: string): Promise<Medication> {
    const medication = await this.findOne(id);
    Object.assign(medication, dto);
    if (dto.endDate) medication.endDate = new Date(dto.endDate);
    if (dto.refillDate) medication.refillDate = new Date(dto.refillDate);

    const saved = await this.medicationRepository.save(medication);

    await this.auditService.log({
      action: 'MEDICATION_UPDATED',
      userId,
      resourceType: 'medication',
      resourceId: id,
      details: dto,
    });

    return saved;
  }

  async markTaken(id: string, dto: MarkTakenDto, userId: string): Promise<MedicationLog> {
    const medication = await this.findOne(id);

    const log = this.logRepository.create({
      medicationId: id,
      patientId: medication.patientId,
      scheduledAt: new Date(),
      takenAt: dto.takenAt ? new Date(dto.takenAt) : new Date(),
      taken: true,
      notes: dto.notes,
    });

    const saved = await this.logRepository.save(log);

    await this.auditService.log({
      action: 'MEDICATION_TAKEN',
      userId,
      resourceType: 'medication',
      resourceId: id,
      details: { takenAt: saved.takenAt },
    });

    return saved;
  }

  async skip(id: string, reason: string, userId: string): Promise<MedicationLog> {
    const medication = await this.findOne(id);

    const log = this.logRepository.create({
      medicationId: id,
      patientId: medication.patientId,
      scheduledAt: new Date(),
      skipped: true,
      notes: reason,
    });

    return this.logRepository.save(log);
  }

  async requestRefill(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    const medication = await this.findOne(id);

    await this.auditService.log({
      action: 'MEDICATION_REFILL_REQUESTED',
      userId,
      resourceType: 'medication',
      resourceId: id,
      details: { pharmacy: medication.pharmacy, rxNumber: medication.rxNumber },
    });

    return { success: true, message: 'Refill request submitted' };
  }

  async discontinue(id: string, reason: string, userId: string): Promise<Medication> {
    const medication = await this.findOne(id);
    medication.status = MedicationStatus.DISCONTINUED;
    medication.notes = `Discontinued: ${reason}\n${medication.notes || ''}`;

    await this.auditService.log({
      action: 'MEDICATION_DISCONTINUED',
      userId,
      resourceType: 'medication',
      resourceId: id,
      details: { reason },
    });

    return this.medicationRepository.save(medication);
  }

  async remove(id: string, userId: string): Promise<Medication> {
    const medication = await this.findOne(id);

    // Soft-delete: set status to 'discontinued' and record deletedAt timestamp
    medication.status = MedicationStatus.DISCONTINUED;
    medication.deletedAt = new Date();

    const saved = await this.medicationRepository.save(medication);

    await this.auditService.log({
      action: 'MEDICATION_DELETED',
      userId,
      resourceType: 'medication',
      resourceId: id,
      details: { softDeleted: true, patientId: medication.patientId, name: medication.name },
    });

    return saved;
  }

  async getAdherence(patientId: string, days: number = 30): Promise<{ rate: number; taken: number; total: number }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.logRepository.find({
      where: { patientId },
    });

    const taken = logs.filter(l => l.taken).length;
    const total = logs.length || 1;

    return {
      rate: Math.round((taken / total) * 100),
      taken,
      total,
    };
  }

  async getTodaySchedule(patientId: string): Promise<{ medication: Medication; scheduledTime: string; taken: boolean }[]> {
    const medications = await this.findActive(patientId);
    const schedule: { medication: Medication; scheduledTime: string; taken: boolean }[] = [];

    for (const med of medications) {
      if (med.schedule && Array.isArray(med.schedule)) {
        for (const s of med.schedule) {
          schedule.push({
            medication: med,
            scheduledTime: s.time,
            taken: s.taken || false,
          });
        }
      }
    }

    return schedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }
}
