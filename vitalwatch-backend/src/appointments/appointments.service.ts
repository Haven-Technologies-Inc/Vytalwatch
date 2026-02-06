import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Appointment, AppointmentStatus, AppointmentType, RecurrencePattern } from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CompleteAppointmentDto } from './dto/complete-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { GetAvailableSlotsDto } from './dto/available-slots.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface AppointmentStatistics {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  noShowRate: number;
  completionRate: number;
  averageDuration: number;
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    @InjectQueue('appointments')
    private readonly appointmentQueue: Queue,
  ) {}

  async create(createDto: CreateAppointmentDto, userId: string): Promise<Appointment> {
    // Validate patient and provider exist
    const [patient, provider] = await Promise.all([
      this.usersService.findById(createDto.patientId),
      this.usersService.findById(createDto.providerId),
    ]);

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Check for scheduling conflicts
    const hasConflict = await this.checkSchedulingConflict(
      createDto.providerId,
      createDto.scheduledAt,
      createDto.duration || 30,
    );

    if (hasConflict) {
      throw new ConflictException('Provider already has an appointment scheduled at this time');
    }

    // Calculate end time
    const endTime = new Date(createDto.scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + (createDto.duration || 30));

    // Create appointment
    const appointment = this.appointmentRepository.create({
      ...createDto,
      endTime,
      createdBy: userId,
      status: AppointmentStatus.SCHEDULED,
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Schedule reminders
    await this.scheduleReminders(savedAppointment);

    // Send confirmation notification
    await this.sendAppointmentNotification(savedAppointment, 'scheduled');

    // Audit log
    await this.auditService.log({
      action: 'APPOINTMENT_CREATED',
      userId,
      resourceType: 'appointment',
      resourceId: savedAppointment.id,
      details: {
        patientId: createDto.patientId,
        providerId: createDto.providerId,
        scheduledAt: createDto.scheduledAt,
        type: createDto.type,
      },
    });

    // Handle recurring appointments
    if (createDto.isRecurring && createDto.recurrencePattern !== RecurrencePattern.NONE) {
      await this.createRecurringInstances(savedAppointment, createDto);
    }

    return savedAppointment;
  }

  async findById(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['patient', 'provider', 'creator'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async findAll(queryDto: QueryAppointmentsDto): Promise<{ appointments: Appointment[]; total: number }> {
    const {
      patientId,
      providerId,
      type,
      status,
      startDate,
      endDate,
      isRecurring,
      isConfirmed,
      page = 1,
      limit = 20,
    } = queryDto;

    const queryBuilder = this.appointmentRepository.createQueryBuilder('appointment');

    if (patientId) {
      queryBuilder.andWhere('appointment.patientId = :patientId', { patientId });
    }

    if (providerId) {
      queryBuilder.andWhere('appointment.providerId = :providerId', { providerId });
    }

    if (type) {
      queryBuilder.andWhere('appointment.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('appointment.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('appointment.scheduledAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('appointment.scheduledAt <= :endDate', { endDate });
    }

    if (isRecurring !== undefined) {
      queryBuilder.andWhere('appointment.isRecurring = :isRecurring', { isRecurring });
    }

    if (isConfirmed !== undefined) {
      queryBuilder.andWhere('appointment.isConfirmed = :isConfirmed', { isConfirmed });
    }

    queryBuilder
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.provider', 'provider')
      .orderBy('appointment.scheduledAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [appointments, total] = await queryBuilder.getManyAndCount();

    return { appointments, total };
  }

  async getCalendar(
    providerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: {
        providerId,
        scheduledAt: Between(startDate, endDate),
        status: In([
          AppointmentStatus.SCHEDULED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.IN_PROGRESS,
        ]),
      },
      relations: ['patient'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async getAvailableSlots(dto: GetAvailableSlotsDto): Promise<TimeSlot[]> {
    const { providerId, startDate, endDate, duration = 30 } = dto;

    // Get all appointments for the provider in the date range
    const appointments = await this.appointmentRepository.find({
      where: {
        providerId,
        scheduledAt: Between(startDate, endDate),
        status: In([
          AppointmentStatus.SCHEDULED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.IN_PROGRESS,
        ]),
      },
      order: { scheduledAt: 'ASC' },
    });

    // Generate time slots (e.g., 9 AM to 5 PM, every duration minutes)
    const slots: TimeSlot[] = [];
    const current = new Date(startDate);
    current.setHours(9, 0, 0, 0); // Start at 9 AM

    while (current < endDate) {
      const slotEnd = new Date(current);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Skip if outside working hours (9 AM - 5 PM)
      if (current.getHours() >= 9 && slotEnd.getHours() <= 17) {
        const isAvailable = !this.isSlotConflicting(current, slotEnd, appointments);

        slots.push({
          start: new Date(current),
          end: new Date(slotEnd),
          available: isAvailable,
        });
      }

      current.setMinutes(current.getMinutes() + duration);
    }

    return slots;
  }

  private isSlotConflicting(
    slotStart: Date,
    slotEnd: Date,
    appointments: Appointment[],
  ): boolean {
    return appointments.some((apt) => {
      const aptEnd = apt.endTime || new Date(apt.scheduledAt.getTime() + apt.duration * 60000);
      return (
        (slotStart >= apt.scheduledAt && slotStart < aptEnd) ||
        (slotEnd > apt.scheduledAt && slotEnd <= aptEnd) ||
        (slotStart <= apt.scheduledAt && slotEnd >= aptEnd)
      );
    });
  }

  async update(id: string, updateDto: UpdateAppointmentDto, userId: string): Promise<Appointment> {
    const appointment = await this.findById(id);

    // Check if rescheduling
    if (updateDto.scheduledAt && updateDto.scheduledAt.getTime() !== appointment.scheduledAt.getTime()) {
      const hasConflict = await this.checkSchedulingConflict(
        appointment.providerId,
        updateDto.scheduledAt,
        updateDto.duration || appointment.duration,
        id,
      );

      if (hasConflict) {
        throw new ConflictException('Provider already has an appointment scheduled at this time');
      }

      // Recalculate end time
      if (updateDto.scheduledAt || updateDto.duration) {
        const endTime = new Date(updateDto.scheduledAt || appointment.scheduledAt);
        endTime.setMinutes(endTime.getMinutes() + (updateDto.duration || appointment.duration));
        appointment.endTime = endTime;
      }
    }

    Object.assign(appointment, updateDto);
    appointment.lastModifiedBy = userId;

    const updated = await this.appointmentRepository.save(appointment);

    await this.auditService.log({
      action: 'APPOINTMENT_UPDATED',
      userId,
      resourceType: 'appointment',
      resourceId: id,
      details: updateDto,
    });

    return updated;
  }

  async confirm(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.findById(id);

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled appointments can be confirmed');
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    appointment.isConfirmed = true;
    appointment.confirmedAt = new Date();
    appointment.confirmedBy = userId;

    const updated = await this.appointmentRepository.save(appointment);

    await this.sendAppointmentNotification(updated, 'confirmed');

    await this.auditService.log({
      action: 'APPOINTMENT_CONFIRMED',
      userId,
      resourceType: 'appointment',
      resourceId: id,
    });

    return updated;
  }

  async cancel(id: string, cancelDto: CancelAppointmentDto, userId: string): Promise<Appointment> {
    const appointment = await this.findById(id);

    if ([AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED].includes(appointment.status)) {
      throw new BadRequestException('Cannot cancel a completed or already cancelled appointment');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = userId;
    appointment.cancellationReason = cancelDto.reason;

    const updated = await this.appointmentRepository.save(appointment);

    // Remove scheduled reminders
    await this.cancelReminders(id);

    await this.sendAppointmentNotification(updated, 'cancelled');

    await this.auditService.log({
      action: 'APPOINTMENT_CANCELLED',
      userId,
      resourceType: 'appointment',
      resourceId: id,
      details: { reason: cancelDto.reason },
    });

    return updated;
  }

  async reschedule(
    id: string,
    rescheduleDto: RescheduleAppointmentDto,
    userId: string,
  ): Promise<Appointment> {
    const appointment = await this.findById(id);

    if ([AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED].includes(appointment.status)) {
      throw new BadRequestException('Cannot reschedule a completed or cancelled appointment');
    }

    // Check for conflicts at new time
    const hasConflict = await this.checkSchedulingConflict(
      appointment.providerId,
      rescheduleDto.newScheduledAt,
      rescheduleDto.newDuration || appointment.duration,
      id,
    );

    if (hasConflict) {
      throw new ConflictException('Provider already has an appointment scheduled at this time');
    }

    // Store old time for audit
    const oldScheduledAt = appointment.scheduledAt;

    // Update appointment
    appointment.scheduledAt = rescheduleDto.newScheduledAt;
    if (rescheduleDto.newDuration) {
      appointment.duration = rescheduleDto.newDuration;
    }
    if (rescheduleDto.location) {
      appointment.location = rescheduleDto.location;
    }
    if (rescheduleDto.meetingUrl) {
      appointment.meetingUrl = rescheduleDto.meetingUrl;
    }

    const endTime = new Date(appointment.scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + appointment.duration);
    appointment.endTime = endTime;

    appointment.lastModifiedBy = userId;
    appointment.status = AppointmentStatus.SCHEDULED;
    appointment.isConfirmed = false;

    // Reset reminder flags
    appointment.reminder24HourSent = false;
    appointment.reminder1HourSent = false;

    const updated = await this.appointmentRepository.save(appointment);

    // Reschedule reminders
    await this.cancelReminders(id);
    await this.scheduleReminders(updated);

    await this.sendAppointmentNotification(updated, 'rescheduled');

    await this.auditService.log({
      action: 'APPOINTMENT_RESCHEDULED',
      userId,
      resourceType: 'appointment',
      resourceId: id,
      details: {
        oldTime: oldScheduledAt,
        newTime: rescheduleDto.newScheduledAt,
        reason: rescheduleDto.reason,
      },
    });

    return updated;
  }

  async complete(id: string, completeDto: CompleteAppointmentDto, userId: string): Promise<Appointment> {
    const appointment = await this.findById(id);

    if (![AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS].includes(appointment.status)) {
      throw new BadRequestException('Only scheduled, confirmed, or in-progress appointments can be completed');
    }

    appointment.status = AppointmentStatus.COMPLETED;
    appointment.completedAt = new Date();
    appointment.completedBy = userId;
    appointment.clinicalNotes = completeDto.clinicalNotes;
    appointment.diagnosis = completeDto.diagnosis;
    appointment.treatmentPlan = completeDto.treatmentPlan;
    appointment.prescriptions = completeDto.prescriptions;
    appointment.followUpInstructions = completeDto.followUpInstructions;

    const updated = await this.appointmentRepository.save(appointment);

    await this.sendAppointmentNotification(updated, 'completed');

    await this.auditService.log({
      action: 'APPOINTMENT_COMPLETED',
      userId,
      resourceType: 'appointment',
      resourceId: id,
    });

    return updated;
  }

  async markNoShow(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.findById(id);

    if (![AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED].includes(appointment.status)) {
      throw new BadRequestException('Only scheduled or confirmed appointments can be marked as no-show');
    }

    appointment.status = AppointmentStatus.NO_SHOW;
    appointment.lastModifiedBy = userId;

    const updated = await this.appointmentRepository.save(appointment);

    await this.auditService.log({
      action: 'APPOINTMENT_NO_SHOW',
      userId,
      resourceType: 'appointment',
      resourceId: id,
    });

    return updated;
  }

  async getStatistics(providerId?: string, startDate?: Date, endDate?: Date): Promise<AppointmentStatistics> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder('appointment');

    if (providerId) {
      queryBuilder.andWhere('appointment.providerId = :providerId', { providerId });
    }

    if (startDate) {
      queryBuilder.andWhere('appointment.scheduledAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('appointment.scheduledAt <= :endDate', { endDate });
    }

    const appointments = await queryBuilder.getMany();

    const total = appointments.length;
    const scheduled = appointments.filter((a) => a.status === AppointmentStatus.SCHEDULED).length;
    const confirmed = appointments.filter((a) => a.status === AppointmentStatus.CONFIRMED).length;
    const completed = appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
    const cancelled = appointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
    const noShow = appointments.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;

    const totalCompleted = completed + noShow;
    const noShowRate = totalCompleted > 0 ? (noShow / totalCompleted) * 100 : 0;
    const completionRate = totalCompleted > 0 ? (completed / totalCompleted) * 100 : 0;

    const completedAppointments = appointments.filter((a) => a.status === AppointmentStatus.COMPLETED);
    const averageDuration =
      completedAppointments.length > 0
        ? completedAppointments.reduce((sum, a) => sum + a.duration, 0) / completedAppointments.length
        : 0;

    return {
      total,
      scheduled,
      confirmed,
      completed,
      cancelled,
      noShow,
      noShowRate: Math.round(noShowRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      averageDuration: Math.round(averageDuration),
    };
  }

  private async checkSchedulingConflict(
    providerId: string,
    scheduledAt: Date,
    duration: number,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const endTime = new Date(scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + duration);

    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .where('appointment.providerId = :providerId', { providerId })
      .andWhere('appointment.status IN (:...statuses)', {
        statuses: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      })
      .andWhere(
        '(appointment.scheduledAt < :endTime AND appointment.endTime > :scheduledAt)',
        { scheduledAt, endTime },
      );

    if (excludeAppointmentId) {
      queryBuilder.andWhere('appointment.id != :excludeAppointmentId', { excludeAppointmentId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  private async scheduleReminders(appointment: Appointment): Promise<void> {
    try {
      const scheduledTime = new Date(appointment.scheduledAt);

      // Schedule 24-hour reminder
      const reminder24h = new Date(scheduledTime);
      reminder24h.setHours(reminder24h.getHours() - 24);

      if (reminder24h > new Date()) {
        await this.appointmentQueue.add(
          'send-reminder',
          {
            appointmentId: appointment.id,
            reminderType: '24hour',
          },
          {
            delay: reminder24h.getTime() - Date.now(),
            jobId: `${appointment.id}-24h`,
          },
        );
      }

      // Schedule 1-hour reminder
      const reminder1h = new Date(scheduledTime);
      reminder1h.setHours(reminder1h.getHours() - 1);

      if (reminder1h > new Date()) {
        await this.appointmentQueue.add(
          'send-reminder',
          {
            appointmentId: appointment.id,
            reminderType: '1hour',
          },
          {
            delay: reminder1h.getTime() - Date.now(),
            jobId: `${appointment.id}-1h`,
          },
        );
      }

      this.logger.log(`Scheduled reminders for appointment ${appointment.id}`);
    } catch (error) {
      this.logger.error(`Failed to schedule reminders for appointment ${appointment.id}`, error);
    }
  }

  private async cancelReminders(appointmentId: string): Promise<void> {
    try {
      await Promise.all([
        this.appointmentQueue.removeJobs(`${appointmentId}-24h`),
        this.appointmentQueue.removeJobs(`${appointmentId}-1h`),
      ]);

      this.logger.log(`Cancelled reminders for appointment ${appointmentId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel reminders for appointment ${appointmentId}`, error);
    }
  }

  async sendReminder(appointmentId: string, reminderType: '24hour' | '1hour'): Promise<void> {
    try {
      const appointment = await this.findById(appointmentId);

      // Check if reminder already sent
      if (
        (reminderType === '24hour' && appointment.reminder24HourSent) ||
        (reminderType === '1hour' && appointment.reminder1HourSent)
      ) {
        return;
      }

      const patient = await this.usersService.findById(appointment.patientId);
      if (!patient) return;

      const timeUntil = reminderType === '24hour' ? '24 hours' : '1 hour';
      const formattedDate = appointment.scheduledAt.toLocaleString();

      // Send email reminder
      await this.notificationsService.sendEmail({
        to: patient.email,
        subject: `Appointment Reminder - ${timeUntil}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Appointment Reminder</h2>
            <p>Hi ${patient.firstName},</p>
            <p>This is a reminder that you have an appointment in ${timeUntil}.</p>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Date & Time:</strong> ${formattedDate}</p>
              <p><strong>Type:</strong> ${appointment.type}</p>
              ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
              ${appointment.meetingUrl ? `<p><strong>Meeting URL:</strong> <a href="${appointment.meetingUrl}">${appointment.meetingUrl}</a></p>` : ''}
            </div>
            <p>Best regards,<br>The VitalWatch AI Team</p>
          </div>
        `,
      });

      // Update reminder sent status
      if (reminderType === '24hour') {
        appointment.reminder24HourSent = true;
        appointment.reminder24HourSentAt = new Date();
      } else {
        appointment.reminder1HourSent = true;
        appointment.reminder1HourSentAt = new Date();
      }

      await this.appointmentRepository.save(appointment);

      this.logger.log(`Sent ${reminderType} reminder for appointment ${appointmentId}`);
    } catch (error) {
      this.logger.error(`Failed to send ${reminderType} reminder for appointment ${appointmentId}`, error);
    }
  }

  private async sendAppointmentNotification(
    appointment: Appointment,
    action: 'scheduled' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed',
  ): Promise<void> {
    try {
      const [patient, provider] = await Promise.all([
        this.usersService.findById(appointment.patientId),
        this.usersService.findById(appointment.providerId),
      ]);

      if (!patient || !provider) return;

      const formattedDate = appointment.scheduledAt.toLocaleString();

      let subject = '';
      let message = '';

      switch (action) {
        case 'scheduled':
          subject = 'Appointment Scheduled';
          message = `Your appointment has been scheduled for ${formattedDate}`;
          break;
        case 'confirmed':
          subject = 'Appointment Confirmed';
          message = `Your appointment on ${formattedDate} has been confirmed`;
          break;
        case 'cancelled':
          subject = 'Appointment Cancelled';
          message = `Your appointment on ${formattedDate} has been cancelled`;
          break;
        case 'rescheduled':
          subject = 'Appointment Rescheduled';
          message = `Your appointment has been rescheduled to ${formattedDate}`;
          break;
        case 'completed':
          subject = 'Appointment Completed';
          message = `Your appointment on ${formattedDate} has been completed`;
          break;
      }

      await this.notificationsService.sendEmail({
        to: patient.email,
        subject: `VitalWatch RPM - ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">${subject}</h2>
            <p>Hi ${patient.firstName},</p>
            <p>${message}</p>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Provider:</strong> ${provider.firstName} ${provider.lastName}</p>
              <p><strong>Type:</strong> ${appointment.type}</p>
              ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
              ${appointment.meetingUrl ? `<p><strong>Meeting URL:</strong> <a href="${appointment.meetingUrl}">${appointment.meetingUrl}</a></p>` : ''}
            </div>
            <p>Best regards,<br>The VitalWatch AI Team</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send appointment notification`, error);
    }
  }

  private async createRecurringInstances(
    parentAppointment: Appointment,
    createDto: CreateAppointmentDto,
  ): Promise<void> {
    try {
      const { recurrencePattern, recurrenceInterval = 1, recurrenceDaysOfWeek, recurrenceEndDate } = createDto;

      if (!recurrenceEndDate) {
        this.logger.warn('No recurrence end date specified, skipping recurring instances');
        return;
      }

      const instances: Partial<Appointment>[] = [];
      let currentDate = new Date(createDto.scheduledAt);

      while (currentDate < recurrenceEndDate && instances.length < 52) { // Max 52 instances (1 year weekly)
        // Calculate next occurrence based on pattern
        switch (recurrencePattern) {
          case RecurrencePattern.DAILY:
            currentDate.setDate(currentDate.getDate() + recurrenceInterval);
            break;
          case RecurrencePattern.WEEKLY:
            currentDate.setDate(currentDate.getDate() + (7 * recurrenceInterval));
            break;
          case RecurrencePattern.BIWEEKLY:
            currentDate.setDate(currentDate.getDate() + 14);
            break;
          case RecurrencePattern.MONTHLY:
            currentDate.setMonth(currentDate.getMonth() + recurrenceInterval);
            break;
          default:
            return;
        }

        if (currentDate >= recurrenceEndDate) break;

        // Check if this day is allowed (for weekly patterns)
        if (recurrenceDaysOfWeek && recurrenceDaysOfWeek.length > 0) {
          const dayOfWeek = currentDate.getDay();
          if (!recurrenceDaysOfWeek.includes(dayOfWeek)) {
            continue;
          }
        }

        // Check for conflicts
        const hasConflict = await this.checkSchedulingConflict(
          createDto.providerId,
          currentDate,
          createDto.duration || 30,
        );

        if (!hasConflict) {
          const endTime = new Date(currentDate);
          endTime.setMinutes(endTime.getMinutes() + (createDto.duration || 30));

          instances.push({
            ...createDto,
            scheduledAt: new Date(currentDate),
            endTime,
            parentAppointmentId: parentAppointment.id,
            isRecurring: false, // Individual instances are not recurring
            recurrencePattern: RecurrencePattern.NONE,
            createdBy: parentAppointment.createdBy,
          });
        }
      }

      if (instances.length > 0) {
        const created = await this.appointmentRepository.save(instances);
        this.logger.log(`Created ${created.length} recurring appointment instances`);

        // Schedule reminders for each instance
        for (const instance of created) {
          await this.scheduleReminders(instance as Appointment);
        }
      }
    } catch (error) {
      this.logger.error('Failed to create recurring appointment instances', error);
    }
  }

  async getUpcomingAppointments(userId: string, limit: number = 5): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: [
        {
          patientId: userId,
          scheduledAt: MoreThanOrEqual(new Date()),
          status: In([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
        },
        {
          providerId: userId,
          scheduledAt: MoreThanOrEqual(new Date()),
          status: In([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
        },
      ],
      order: { scheduledAt: 'ASC' },
      take: limit,
      relations: ['patient', 'provider'],
    });
  }

  async deleteAppointment(id: string, userId: string): Promise<void> {
    const appointment = await this.findById(id);

    if (appointment.status !== AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Only cancelled appointments can be deleted');
    }

    await this.appointmentRepository.remove(appointment);

    await this.auditService.log({
      action: 'APPOINTMENT_DELETED',
      userId,
      resourceType: 'appointment',
      resourceId: id,
    });
  }
}
