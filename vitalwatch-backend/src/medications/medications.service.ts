import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual, Like } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import {
  Medication,
  MedicationSchedule,
  MedicationAdherence,
  AdherenceStatus,
  Frequency,
} from './entities/medication.entity';
import {
  CreateMedicationDto,
  UpdateMedicationDto,
  DiscontinueMedicationDto,
  RecordDoseDto,
  MedicationQueryDto,
  AdherenceQueryDto,
  CreateScheduleDto,
} from './dto/medication.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationCategory } from '../notifications/entities/notification.entity';
import { TasksService } from '../tasks/tasks.service';
import { TaskType, TaskPriority } from '../tasks/entities/task.entity';

/**
 * Service for managing medications, schedules, and adherence tracking
 */
@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  // Known medication interactions database (simplified - in production, use a comprehensive drug database)
  private readonly knownInteractions: Record<string, string[]> = {
    'warfarin': ['aspirin', 'ibuprofen', 'vitamin k'],
    'metformin': ['alcohol', 'contrast dye'],
    'lisinopril': ['potassium supplements', 'nsaids'],
    'simvastatin': ['grapefruit juice', 'gemfibrozil'],
    'levothyroxine': ['calcium', 'iron', 'antacids'],
  };

  constructor(
    @InjectRepository(Medication)
    private readonly medicationRepository: Repository<Medication>,
    @InjectRepository(MedicationSchedule)
    private readonly scheduleRepository: Repository<MedicationSchedule>,
    @InjectRepository(MedicationAdherence)
    private readonly adherenceRepository: Repository<MedicationAdherence>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * Create a new medication prescription
   */
  async create(createMedicationDto: CreateMedicationDto): Promise<Medication> {
    // Check for potential drug interactions
    const interactions = await this.checkInteractions(
      createMedicationDto.patientId,
      createMedicationDto.name,
    );

    if (interactions.length > 0) {
      this.logger.warn(
        `Potential drug interactions detected for ${createMedicationDto.name}: ${interactions.join(', ')}`,
      );
    }

    const medication = this.medicationRepository.create({
      ...createMedicationDto,
      isActive: true,
      status: 'active',
      refillsUsed: 0,
      interactions: interactions,
    });

    const saved = await this.medicationRepository.save(medication);

    // Create initial schedules if times provided
    if (createMedicationDto.scheduleTimesOfDay && createMedicationDto.scheduleTimesOfDay.length > 0) {
      await this.generateSchedules(
        saved.id,
        saved.patientId,
        saved.frequency,
        createMedicationDto.scheduleTimesOfDay,
        saved.startDate,
        saved.endDate,
      );
    }

    // Create medication reminder task
    if (saved.reminderEnabled) {
      await this.createMedicationReminderTask(saved);
    }

    // Audit log
    await this.auditService.log({
      action: 'MEDICATION_PRESCRIBED',
      userId: createMedicationDto.prescribedBy,
      resourceType: 'medication',
      resourceId: saved.id,
      details: {
        patientId: saved.patientId,
        medicationName: saved.name,
        dosage: saved.dosage,
        frequency: saved.frequency,
        interactions: interactions,
      },
    });

    // Send notification to patient
    await this.sendMedicationNotification(
      saved.patientId,
      'new_medication',
      `New medication prescribed: ${saved.name}`,
      `Your provider has prescribed ${saved.name} (${saved.dosage}). Please review the instructions and schedule.`,
      { medicationId: saved.id },
    );

    this.logger.log(`Medication prescribed: ${saved.name} for patient ${saved.patientId}`);

    return saved;
  }

  /**
   * Find medication by ID
   */
  async findById(id: string): Promise<Medication | null> {
    return this.medicationRepository.findOne({
      where: { id },
      relations: ['patient', 'prescriber', 'schedules', 'adherenceRecords'],
    });
  }

  /**
   * Find all medications with filtering
   */
  async findAll(query: MedicationQueryDto): Promise<{ medications: Medication[]; total: number }> {
    const {
      patientId,
      prescribedBy,
      status,
      isActive,
      type,
      frequency,
      search,
      page = 1,
      limit = 20,
    } = query;

    const queryBuilder = this.medicationRepository.createQueryBuilder('medication');

    if (patientId) {
      queryBuilder.andWhere('medication.patientId = :patientId', { patientId });
    }

    if (prescribedBy) {
      queryBuilder.andWhere('medication.prescribedBy = :prescribedBy', { prescribedBy });
    }

    if (status) {
      queryBuilder.andWhere('medication.status = :status', { status });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('medication.isActive = :isActive', { isActive });
    }

    if (type) {
      queryBuilder.andWhere('medication.type = :type', { type });
    }

    if (frequency) {
      queryBuilder.andWhere('medication.frequency = :frequency', { frequency });
    }

    if (search) {
      queryBuilder.andWhere(
        '(medication.name ILIKE :search OR medication.genericName ILIKE :search OR medication.brandName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .leftJoinAndSelect('medication.patient', 'patient')
      .leftJoinAndSelect('medication.prescriber', 'prescriber')
      .orderBy('medication.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [medications, total] = await queryBuilder.getManyAndCount();

    return { medications, total };
  }

  /**
   * Update a medication
   */
  async update(
    id: string,
    userId: string,
    updateMedicationDto: UpdateMedicationDto,
  ): Promise<Medication> {
    const medication = await this.findById(id);
    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const originalData = { ...medication };

    Object.assign(medication, updateMedicationDto);
    const updated = await this.medicationRepository.save(medication);

    // Audit log
    await this.auditService.log({
      action: 'MEDICATION_UPDATED',
      userId,
      resourceType: 'medication',
      resourceId: id,
      details: {
        changes: updateMedicationDto,
        originalData: {
          dosage: originalData.dosage,
          frequency: originalData.frequency,
          isActive: originalData.isActive,
        },
      },
    });

    // If frequency or timing changed, regenerate schedules
    if (updateMedicationDto.frequency && updateMedicationDto.frequency !== originalData.frequency) {
      await this.regenerateSchedules(updated);
    }

    return updated;
  }

  /**
   * Discontinue a medication
   */
  async discontinue(
    id: string,
    discontinueDto: DiscontinueMedicationDto,
  ): Promise<Medication> {
    const medication = await this.findById(id);
    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    medication.isActive = false;
    medication.status = 'discontinued';
    medication.discontinuedDate = discontinueDto.discontinuedDate || new Date();
    medication.discontinuedBy = discontinueDto.discontinuedBy;
    medication.discontinuedReason = discontinueDto.reason;

    const updated = await this.medicationRepository.save(medication);

    // Cancel future schedules
    await this.scheduleRepository.update(
      {
        medicationId: id,
        scheduledTime: MoreThanOrEqual(new Date()),
        isCompleted: false,
      },
      { isCompleted: true },
    );

    // Audit log
    await this.auditService.log({
      action: 'MEDICATION_DISCONTINUED',
      userId: discontinueDto.discontinuedBy,
      resourceType: 'medication',
      resourceId: id,
      details: {
        reason: discontinueDto.reason,
        medicationName: medication.name,
      },
    });

    // Notify patient
    await this.sendMedicationNotification(
      medication.patientId,
      'medication_discontinued',
      `Medication discontinued: ${medication.name}`,
      `Your medication ${medication.name} has been discontinued. Reason: ${discontinueDto.reason}`,
      { medicationId: id },
    );

    this.logger.log(`Medication discontinued: ${medication.name} (${id})`);

    return updated;
  }

  /**
   * Delete a medication (soft delete by discontinuing)
   */
  async delete(id: string, userId: string): Promise<void> {
    await this.discontinue(id, {
      discontinuedBy: userId,
      reason: 'Record deleted by provider',
      discontinuedDate: new Date(),
    });
  }

  /**
   * Record a dose (taken, missed, or skipped)
   */
  async recordDose(
    medicationId: string,
    recordDoseDto: RecordDoseDto,
  ): Promise<MedicationAdherence> {
    const medication = await this.findById(medicationId);
    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    // Find the related schedule if provided
    let schedule: MedicationSchedule | null = null;
    if (recordDoseDto.scheduleId) {
      schedule = await this.scheduleRepository.findOne({
        where: { id: recordDoseDto.scheduleId },
      });
    }

    const adherenceRecord = this.adherenceRepository.create({
      medicationId,
      patientId: medication.patientId,
      scheduleId: recordDoseDto.scheduleId,
      status: recordDoseDto.status,
      recordedAt: new Date(),
      takenAt: recordDoseDto.takenAt || new Date(),
      dosageTaken: recordDoseDto.dosageTaken || medication.dosage,
      recordMethod: recordDoseDto.recordMethod || 'manual',
      recordedBy: recordDoseDto.recordedBy || medication.patientId,
      notes: recordDoseDto.notes,
      reason: recordDoseDto.reason,
      hadSideEffects: recordDoseDto.hadSideEffects || false,
      reportedSideEffects: recordDoseDto.reportedSideEffects,
      location: recordDoseDto.location,
      metadata: recordDoseDto.metadata,
      scheduledTime: schedule?.scheduledTime,
    });

    const saved = await this.adherenceRepository.save(adherenceRecord);

    // Update schedule if exists
    if (schedule && recordDoseDto.status === AdherenceStatus.TAKEN) {
      schedule.isCompleted = true;
      schedule.completedAt = new Date();
      await this.scheduleRepository.save(schedule);
    }

    // Audit log
    await this.auditService.log({
      action: 'MEDICATION_DOSE_RECORDED',
      userId: recordDoseDto.recordedBy || medication.patientId,
      resourceType: 'medication_adherence',
      resourceId: saved.id,
      details: {
        medicationId,
        medicationName: medication.name,
        status: recordDoseDto.status,
        hadSideEffects: recordDoseDto.hadSideEffects,
      },
    });

    // If side effects reported, create alert
    if (recordDoseDto.hadSideEffects && recordDoseDto.reportedSideEffects?.length > 0) {
      await this.createSideEffectAlert(medication, recordDoseDto.reportedSideEffects);
    }

    // If dose missed, send notification to provider
    if (recordDoseDto.status === AdherenceStatus.MISSED) {
      await this.notifyProviderOfMissedDose(medication, saved);
    }

    return saved;
  }

  /**
   * Record a missed dose (automated)
   */
  async recordMissedDose(scheduleId: string): Promise<MedicationAdherence> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ['medication'],
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return this.recordDose(schedule.medicationId, {
      status: AdherenceStatus.MISSED,
      scheduleId: scheduleId,
      recordMethod: 'automatic',
      notes: 'Automatically recorded as missed',
    });
  }

  /**
   * Get adherence rate for a medication or patient
   */
  async getAdherenceRate(
    medicationId?: string,
    patientId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    skippedDoses: number;
    adherenceRate: number;
    lateDoses: number;
  }> {
    if (!medicationId && !patientId) {
      throw new BadRequestException('Either medicationId or patientId must be provided');
    }

    const queryBuilder = this.adherenceRepository.createQueryBuilder('adherence');

    if (medicationId) {
      queryBuilder.andWhere('adherence.medicationId = :medicationId', { medicationId });
    }

    if (patientId) {
      queryBuilder.andWhere('adherence.patientId = :patientId', { patientId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('adherence.recordedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const records = await queryBuilder.getMany();

    const totalDoses = records.length;
    const takenDoses = records.filter(r => r.status === AdherenceStatus.TAKEN).length;
    const missedDoses = records.filter(r => r.status === AdherenceStatus.MISSED).length;
    const skippedDoses = records.filter(r => r.status === AdherenceStatus.SKIPPED).length;
    const lateDoses = records.filter(r => r.status === AdherenceStatus.LATE).length;

    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    return {
      totalDoses,
      takenDoses,
      missedDoses,
      skippedDoses,
      lateDoses,
      adherenceRate: Math.round(adherenceRate * 100) / 100,
    };
  }

  /**
   * Get adherence records with filtering
   */
  async getAdherenceRecords(
    query: AdherenceQueryDto,
  ): Promise<{ records: MedicationAdherence[]; total: number }> {
    const {
      medicationId,
      patientId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const queryBuilder = this.adherenceRepository.createQueryBuilder('adherence');

    if (medicationId) {
      queryBuilder.andWhere('adherence.medicationId = :medicationId', { medicationId });
    }

    if (patientId) {
      queryBuilder.andWhere('adherence.patientId = :patientId', { patientId });
    }

    if (status) {
      queryBuilder.andWhere('adherence.status = :status', { status });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('adherence.recordedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    queryBuilder
      .leftJoinAndSelect('adherence.medication', 'medication')
      .leftJoinAndSelect('adherence.patient', 'patient')
      .leftJoinAndSelect('adherence.recorder', 'recorder')
      .orderBy('adherence.recordedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [records, total] = await queryBuilder.getManyAndCount();

    return { records, total };
  }

  /**
   * Get medication statistics for a patient
   */
  async getMedicationStats(patientId: string): Promise<{
    totalMedications: number;
    activeMedications: number;
    discontinuedMedications: number;
    medicationsRequiringRefill: number;
    overallAdherenceRate: number;
    medicationsWithInteractions: number;
  }> {
    const [
      totalMedications,
      activeMedications,
      discontinuedMedications,
      medicationsRequiringRefill,
      medicationsWithInteractions,
    ] = await Promise.all([
      this.medicationRepository.count({ where: { patientId } }),
      this.medicationRepository.count({ where: { patientId, isActive: true } }),
      this.medicationRepository.count({ where: { patientId, status: 'discontinued' } }),
      this.medicationRepository
        .createQueryBuilder('medication')
        .where('medication.patientId = :patientId', { patientId })
        .andWhere('medication.isActive = :isActive', { isActive: true })
        .andWhere('medication.refillsUsed >= medication.refillsAuthorized')
        .getCount(),
      this.medicationRepository
        .createQueryBuilder('medication')
        .where('medication.patientId = :patientId', { patientId })
        .andWhere('medication.isActive = :isActive', { isActive: true })
        .andWhere('medication.interactions IS NOT NULL')
        .andWhere("array_length(medication.interactions, 1) > 0")
        .getCount(),
    ]);

    const adherence = await this.getAdherenceRate(undefined, patientId);

    return {
      totalMedications,
      activeMedications,
      discontinuedMedications,
      medicationsRequiringRefill,
      overallAdherenceRate: adherence.adherenceRate,
      medicationsWithInteractions,
    };
  }

  /**
   * Check for medication interactions
   */
  async checkInteractions(patientId: string, newMedicationName: string): Promise<string[]> {
    const activeMedications = await this.medicationRepository.find({
      where: { patientId, isActive: true },
    });

    const interactions: string[] = [];
    const newMedLower = newMedicationName.toLowerCase();

    // Check against known interactions
    if (this.knownInteractions[newMedLower]) {
      for (const med of activeMedications) {
        const medNameLower = med.name.toLowerCase();
        if (this.knownInteractions[newMedLower].includes(medNameLower)) {
          interactions.push(med.name);
        }
      }
    }

    // Check if any existing medications list this as an interaction
    for (const med of activeMedications) {
      const medNameLower = med.name.toLowerCase();
      if (this.knownInteractions[medNameLower]?.includes(newMedLower)) {
        interactions.push(med.name);
      }
    }

    return [...new Set(interactions)]; // Remove duplicates
  }

  /**
   * Generate medication schedules based on frequency
   */
  private async generateSchedules(
    medicationId: string,
    patientId: string,
    frequency: Frequency,
    timesOfDay: string[],
    startDate: Date,
    endDate?: Date,
  ): Promise<void> {
    const schedules: Partial<MedicationSchedule>[] = [];
    const currentDate = new Date(startDate);
    const finalDate = endDate || new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    while (currentDate <= finalDate) {
      for (const time of timesOfDay) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledTime = new Date(currentDate);
        scheduledTime.setHours(hours, minutes, 0, 0);

        if (scheduledTime >= startDate && scheduledTime <= finalDate) {
          schedules.push({
            medicationId,
            patientId,
            scheduledTime,
            isRecurring: true,
            recurrenceRule: {
              pattern: frequency,
              timeOfDay: timesOfDay,
              endDate: endDate,
            },
          });
        }
      }

      // Increment date based on frequency
      switch (frequency) {
        case Frequency.ONCE_DAILY:
        case Frequency.TWICE_DAILY:
        case Frequency.THREE_TIMES_DAILY:
        case Frequency.FOUR_TIMES_DAILY:
        case Frequency.BEDTIME:
        case Frequency.MORNING:
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case Frequency.EVERY_OTHER_DAY:
          currentDate.setDate(currentDate.getDate() + 2);
          break;
        case Frequency.WEEKLY:
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Batch insert schedules
    if (schedules.length > 0) {
      await this.scheduleRepository
        .createQueryBuilder()
        .insert()
        .into(MedicationSchedule)
        .values(schedules)
        .execute();
    }

    this.logger.log(`Generated ${schedules.length} schedules for medication ${medicationId}`);
  }

  /**
   * Regenerate schedules for a medication (after changes)
   */
  private async regenerateSchedules(medication: Medication): Promise<void> {
    // Delete future schedules
    await this.scheduleRepository.delete({
      medicationId: medication.id,
      scheduledTime: MoreThanOrEqual(new Date()),
      isCompleted: false,
    });

    // Generate new schedules
    const timesOfDay = this.getDefaultTimesForFrequency(medication.frequency);
    await this.generateSchedules(
      medication.id,
      medication.patientId,
      medication.frequency,
      timesOfDay,
      new Date(),
      medication.endDate,
    );
  }

  /**
   * Get default times of day for a frequency
   */
  private getDefaultTimesForFrequency(frequency: Frequency): string[] {
    switch (frequency) {
      case Frequency.ONCE_DAILY:
        return ['08:00'];
      case Frequency.TWICE_DAILY:
        return ['08:00', '20:00'];
      case Frequency.THREE_TIMES_DAILY:
        return ['08:00', '14:00', '20:00'];
      case Frequency.FOUR_TIMES_DAILY:
        return ['08:00', '12:00', '16:00', '20:00'];
      case Frequency.BEDTIME:
        return ['22:00'];
      case Frequency.MORNING:
        return ['08:00'];
      default:
        return ['08:00'];
    }
  }

  /**
   * Create a medication reminder task
   */
  private async createMedicationReminderTask(medication: Medication): Promise<void> {
    try {
      await this.tasksService.create({
        type: TaskType.MEDICATION_REMINDER,
        title: `Take ${medication.name}`,
        description: `Reminder to take ${medication.name} (${medication.dosage}) - ${medication.instructions || ''}`,
        patientId: medication.patientId,
        assignedTo: medication.patientId,
        createdBy: medication.prescribedBy,
        priority: TaskPriority.MEDIUM,
        isRecurring: true,
        recurrencePattern: this.mapFrequencyToRecurrence(medication.frequency),
        metadata: { medicationId: medication.id },
      });
    } catch (error) {
      this.logger.error(`Failed to create medication reminder task: ${error.message}`);
    }
  }

  /**
   * Map medication frequency to task recurrence pattern
   */
  private mapFrequencyToRecurrence(frequency: Frequency): string {
    switch (frequency) {
      case Frequency.ONCE_DAILY:
      case Frequency.TWICE_DAILY:
      case Frequency.THREE_TIMES_DAILY:
      case Frequency.FOUR_TIMES_DAILY:
      case Frequency.BEDTIME:
      case Frequency.MORNING:
        return 'daily';
      case Frequency.EVERY_OTHER_DAY:
        return 'daily'; // Handle interval separately
      case Frequency.WEEKLY:
        return 'weekly';
      default:
        return 'daily';
    }
  }

  /**
   * Send medication notification
   */
  private async sendMedicationNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      // Map notification type to appropriate category
      let category = NotificationCategory.REMINDER;
      if (type.includes('alert') || type.includes('side_effects') || type.includes('interaction')) {
        category = NotificationCategory.ALERT;
      } else if (type.includes('discontinued') || type.includes('new')) {
        category = NotificationCategory.SYSTEM;
      }

      await this.notificationsService.createNotification({
        userId,
        type: NotificationType.IN_APP,
        category,
        title,
        body: message,
        data: metadata,
      });
    } catch (error) {
      this.logger.error(`Failed to send medication notification: ${error.message}`);
    }
  }

  /**
   * Create side effect alert
   */
  private async createSideEffectAlert(
    medication: Medication,
    sideEffects: string[],
  ): Promise<void> {
    try {
      await this.tasksService.create({
        type: TaskType.PROVIDER_REVIEW,
        title: `Side Effects Reported: ${medication.name}`,
        description: `Patient reported side effects for ${medication.name}: ${sideEffects.join(', ')}. Please review and follow up.`,
        patientId: medication.patientId,
        assignedTo: medication.prescribedBy,
        createdBy: medication.patientId,
        priority: TaskPriority.HIGH,
        metadata: {
          medicationId: medication.id,
          sideEffects,
        },
      });

      await this.sendMedicationNotification(
        medication.prescribedBy,
        'side_effects',
        'Side Effects Reported',
        `Patient reported side effects for ${medication.name}`,
        { medicationId: medication.id, sideEffects },
      );
    } catch (error) {
      this.logger.error(`Failed to create side effect alert: ${error.message}`);
    }
  }

  /**
   * Notify provider of missed dose
   */
  private async notifyProviderOfMissedDose(
    medication: Medication,
    adherenceRecord: MedicationAdherence,
  ): Promise<void> {
    try {
      // Get recent adherence rate
      const adherence = await this.getAdherenceRate(medication.id);

      // Only notify if adherence rate is concerning (< 80%)
      if (adherence.adherenceRate < 80) {
        await this.sendMedicationNotification(
          medication.prescribedBy,
          'low_adherence',
          'Low Medication Adherence Alert',
          `Patient has ${adherence.adherenceRate.toFixed(1)}% adherence for ${medication.name}`,
          {
            medicationId: medication.id,
            adherenceRate: adherence.adherenceRate,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to notify provider of missed dose: ${error.message}`);
    }
  }

  /**
   * Cron job: Process medication schedules and send reminders
   */
  @Cron('*/15 * * * *') // Every 15 minutes
  async processMedicationReminders(): Promise<void> {
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour ahead

    // Find upcoming scheduled doses that need reminders
    const upcomingSchedules = await this.scheduleRepository.find({
      where: {
        scheduledTime: Between(now, reminderWindow),
        isCompleted: false,
        reminderSent: false,
      },
      relations: ['medication', 'patient'],
    });

    for (const schedule of upcomingSchedules) {
      const medication = schedule.medication;

      if (!medication.reminderEnabled) {
        continue;
      }

      const reminderTime = new Date(
        schedule.scheduledTime.getTime() - (medication.reminderMinutesBefore || 30) * 60 * 1000,
      );

      if (now >= reminderTime) {
        await this.sendMedicationNotification(
          schedule.patientId,
          'medication_reminder',
          `Medication Reminder: ${medication.name}`,
          `Time to take ${medication.name} (${medication.dosage}). ${medication.instructions || ''}`,
          {
            medicationId: medication.id,
            scheduleId: schedule.id,
            scheduledTime: schedule.scheduledTime,
          },
        );

        schedule.reminderSent = true;
        schedule.reminderSentAt = now;
        await this.scheduleRepository.save(schedule);
      }
    }

    this.logger.log(`Processed ${upcomingSchedules.length} medication reminders`);
  }

  /**
   * Cron job: Mark missed doses and alert
   */
  @Cron('0 * * * *') // Every hour
  async processMissedDoses(): Promise<void> {
    const now = new Date();
    const gracePeriod = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours grace period

    // Find schedules that are past due and not completed
    const missedSchedules = await this.scheduleRepository.find({
      where: {
        scheduledTime: LessThanOrEqual(gracePeriod),
        isCompleted: false,
      },
      relations: ['medication'],
    });

    for (const schedule of missedSchedules) {
      try {
        // Record as missed
        await this.recordMissedDose(schedule.id);

        // Mark schedule as completed (to avoid reprocessing)
        schedule.isCompleted = true;
        await this.scheduleRepository.save(schedule);
      } catch (error) {
        this.logger.error(
          `Failed to process missed dose for schedule ${schedule.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Processed ${missedSchedules.length} missed doses`);
  }

  /**
   * Cron job: Check for refills needed
   */
  @Cron('0 0 8 * * *') // Daily at 8 AM
  async checkRefillsNeeded(): Promise<void> {
    const medicationsNeedingRefill = await this.medicationRepository
      .createQueryBuilder('medication')
      .where('medication.isActive = :isActive', { isActive: true })
      .andWhere('medication.refillsUsed >= medication.refillsAuthorized')
      .andWhere('medication.refillsAuthorized > 0')
      .getMany();

    for (const medication of medicationsNeedingRefill) {
      await this.sendMedicationNotification(
        medication.patientId,
        'refill_needed',
        `Refill Needed: ${medication.name}`,
        `You have no refills remaining for ${medication.name}. Please contact your provider or pharmacy.`,
        { medicationId: medication.id },
      );

      await this.sendMedicationNotification(
        medication.prescribedBy,
        'refill_needed',
        `Patient Needs Refill: ${medication.name}`,
        `Patient needs a refill authorization for ${medication.name}.`,
        { medicationId: medication.id, patientId: medication.patientId },
      );
    }

    this.logger.log(`Checked ${medicationsNeedingRefill.length} medications needing refills`);
  }
}
