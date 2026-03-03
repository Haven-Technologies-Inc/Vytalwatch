import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from './entities/appointment.entity';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  AppointmentQueryDto,
} from './dto/appointment.dto';
import { AuditService } from '../audit/audit.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    dto: CreateAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException(
        'Appointment must be scheduled in the future',
      );
    }

    // Overlap detection: prevent overlapping appointments for the same provider
    const durationMinutes = dto.durationMinutes || 30;
    const startTime = scheduledAt;
    const endTime = new Date(scheduledAt.getTime() + durationMinutes * 60000);

    const overlapping = await this.appointmentRepository
      .createQueryBuilder('apt')
      .where('apt.providerId = :providerId', { providerId: dto.providerId })
      .andWhere('apt.status NOT IN (:...statuses)', {
        statuses: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED],
      })
      .andWhere('apt.scheduledAt < :endTime', { endTime })
      .andWhere(
        'DATE_ADD(apt.scheduledAt, INTERVAL apt.durationMinutes MINUTE) > :startTime',
        { startTime },
      )
      .getCount();

    if (overlapping > 0) {
      throw new ConflictException(
        'Provider has an overlapping appointment at this time',
      );
    }

    const conflict = await this.checkConflict(
      dto.providerId,
      scheduledAt,
      dto.durationMinutes || 30,
    );
    if (conflict) {
      throw new BadRequestException(
        'Provider has a scheduling conflict at this time',
      );
    }

    const appointment = this.appointmentRepository.create({
      ...dto,
      scheduledAt,
      telehealthUrl:
        dto.type === AppointmentType.TELEHEALTH
          ? this.generateTelehealthUrl()
          : null,
    });

    const saved = await this.appointmentRepository.save(appointment);

    await this.auditService.log({
      action: 'APPOINTMENT_CREATED',
      userId,
      resourceType: 'appointment',
      resourceId: saved.id,
      details: {
        patientId: dto.patientId,
        providerId: dto.providerId,
        scheduledAt: dto.scheduledAt,
      },
    });

    return saved;
  }

  async findAll(
    query: AppointmentQueryDto,
  ): Promise<{ appointments: Appointment[]; total: number }> {
    const {
      patientId,
      providerId,
      status,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.appointmentRepository
      .createQueryBuilder('apt')
      .leftJoinAndSelect('apt.patient', 'patient')
      .leftJoinAndSelect('apt.provider', 'provider');

    if (patientId) qb.andWhere('apt.patientId = :patientId', { patientId });
    if (providerId) qb.andWhere('apt.providerId = :providerId', { providerId });
    if (status) qb.andWhere('apt.status = :status', { status });
    if (type) qb.andWhere('apt.type = :type', { type });
    if (startDate)
      qb.andWhere('apt.scheduledAt >= :startDate', {
        startDate: new Date(startDate),
      });
    if (endDate)
      qb.andWhere('apt.scheduledAt <= :endDate', {
        endDate: new Date(endDate),
      });

    qb.orderBy('apt.scheduledAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [appointments, total] = await qb.getManyAndCount();
    return { appointments, total };
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['patient', 'provider'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async findByPatient(patientId: string): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: { patientId },
      relations: ['provider'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async findUpcoming(patientId: string): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: {
        patientId,
        scheduledAt: MoreThanOrEqual(new Date()),
        status: AppointmentStatus.SCHEDULED,
      },
      relations: ['provider'],
      order: { scheduledAt: 'ASC' },
      take: 10,
    });
  }

  async update(
    id: string,
    dto: UpdateAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);
    Object.assign(appointment, dto);
    if (dto.scheduledAt) appointment.scheduledAt = new Date(dto.scheduledAt);

    const saved = await this.appointmentRepository.save(appointment);

    await this.auditService.log({
      action: 'APPOINTMENT_UPDATED',
      userId,
      resourceType: 'appointment',
      resourceId: id,
      details: dto,
    });

    return saved;
  }

  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);
    const newDate = new Date(dto.scheduledAt);

    if (newDate <= new Date()) {
      throw new BadRequestException(
        'New appointment time must be in the future',
      );
    }

    const conflict = await this.checkConflict(
      appointment.providerId,
      newDate,
      dto.durationMinutes || appointment.durationMinutes,
      id,
    );
    if (conflict) {
      throw new BadRequestException(
        'Provider has a scheduling conflict at this time',
      );
    }

    appointment.scheduledAt = newDate;
    if (dto.durationMinutes) appointment.durationMinutes = dto.durationMinutes;
    appointment.notes = dto.reason
      ? `Rescheduled: ${dto.reason}\n${appointment.notes || ''}`
      : appointment.notes;

    const saved = await this.appointmentRepository.save(appointment);

    await this.auditService.log({
      action: 'APPOINTMENT_RESCHEDULED',
      userId,
      resourceType: 'appointment',
      resourceId: id,
      details: { newDate: dto.scheduledAt, reason: dto.reason },
    });

    return saved;
  }

  async cancel(
    id: string,
    dto: CancelAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancelledBy = userId;
    appointment.cancellationReason = dto.reason;

    const saved = await this.appointmentRepository.save(appointment);

    await this.auditService.log({
      action: 'APPOINTMENT_CANCELLED',
      userId,
      resourceType: 'appointment',
      resourceId: id,
      details: { reason: dto.reason },
    });

    return saved;
  }

  async confirm(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.findOne(id);
    appointment.status = AppointmentStatus.CONFIRMED;
    return this.appointmentRepository.save(appointment);
  }

  async complete(
    id: string,
    notes: string,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id);
    appointment.status = AppointmentStatus.COMPLETED;
    if (notes) appointment.notes = notes;
    return this.appointmentRepository.save(appointment);
  }

  private async checkConflict(
    providerId: string,
    scheduledAt: Date,
    duration: number,
    excludeId?: string,
  ): Promise<boolean> {
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    const qb = this.appointmentRepository
      .createQueryBuilder('apt')
      .where('apt.providerId = :providerId', { providerId })
      .andWhere('apt.status NOT IN (:...statuses)', {
        statuses: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED],
      })
      .andWhere('apt.scheduledAt < :endTime', { endTime })
      .andWhere(
        'DATE_ADD(apt.scheduledAt, INTERVAL apt.durationMinutes MINUTE) > :startTime',
        { startTime: scheduledAt },
      );

    if (excludeId) qb.andWhere('apt.id != :excludeId', { excludeId });

    const count = await qb.getCount();
    return count > 0;
  }

  private generateTelehealthUrl(): string {
    return `https://meet.vVytalWatch.ai/${uuidv4()}`;
  }
}
