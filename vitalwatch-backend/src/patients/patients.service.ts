import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus, OnboardingStep } from '../users/entities/user.entity';
import { VitalsService } from '../vitals/vitals.service';
import { AlertsService } from '../alerts/alerts.service';
import { DevicesService } from '../devices/devices.service';
import { TenoviService } from '../devices/tenovi.service';
import { AIService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly vitalsService: VitalsService,
    private readonly alertsService: AlertsService,
    private readonly devicesService: DevicesService,
    private readonly tenoviService: TenoviService,
    private readonly aiService: AIService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    providerId?: string;
    organizationId?: string;
  }) {
    const { page, limit, search, status, providerId, organizationId } = options;
    const skip = (page - 1) * limit;

    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.PATIENT });

    if (organizationId) {
      query.andWhere('user.organizationId = :organizationId', {
        organizationId,
      });
    }

    if (providerId) {
      query.andWhere('user.providerId = :providerId', { providerId });
    }

    if (status) {
      query.andWhere('user.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [patients, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: patients.map((p) => this.sanitizePatient(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const patient = await this.userRepository.findOne({
      where: { id, role: UserRole.PATIENT },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    this.checkAccess(patient, user);
    return this.sanitizePatient(patient);
  }

  async create(
    dto: Record<string, any> & { providerId?: string },
    user: CurrentUserPayload,
  ): Promise<Partial<User>> {
    const patient = new User();
    Object.assign(patient, {
      ...dto,
      role: UserRole.PATIENT,
      status: UserStatus.PENDING,
      organizationId: user.organizationId,
      providerId: dto.providerId || user.sub,
      onboardingStep: OnboardingStep.REGISTERED,
    });

    const saved = await this.userRepository.save(patient);

    // Send welcome email to new patient
    try {
      await this.emailService.sendWelcomeEmail({
        email: saved.email,
        firstName: saved.firstName,
      });
      this.logger.log(`Welcome email sent to patient: ${saved.email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${saved.email}`, error);
    }

    await this.auditService.log({
      action: 'PATIENT_CREATED',
      userId: user.sub,
      details: { patientId: saved.id },
    });

    return this.sanitizePatient(saved);
  }

  async update(
    id: string,
    dto: Record<string, any>,
    user: CurrentUserPayload,
  ): Promise<Partial<User>> {
    await this.findOne(id, user);
    await this.userRepository.update(id, dto);

    await this.auditService.log({
      action: 'PATIENT_UPDATED',
      userId: user.sub,
      details: { patientId: id, changes: Object.keys(dto) },
    });

    return this.findOne(id, user);
  }

  async remove(id: string) {
    const patient = await this.userRepository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    await this.userRepository.softDelete(id);
  }

  async getLatestVitals(patientId: string, user: CurrentUserPayload) {
    await this.findOne(patientId, user);
    return this.vitalsService.getLatestVitals(patientId);
  }

  async getVitalsHistory(
    patientId: string,
    options: { type?: string; startDate?: string; endDate?: string },
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);
    return this.vitalsService.getVitalsHistory(patientId, {
      startDate: options.startDate ? new Date(options.startDate) : undefined,
      endDate: options.endDate ? new Date(options.endDate) : undefined,
    });
  }

  async getVitalsByType(
    patientId: string,
    type: string,
    limit: number,
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);
    return this.vitalsService.getVitalsByType(patientId, type as any, limit);
  }

  async getAlerts(
    patientId: string,
    status: string | undefined,
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);
    return this.alertsService.findByPatient(patientId, status as any);
  }

  async getActiveAlerts(patientId: string, user: CurrentUserPayload) {
    await this.findOne(patientId, user);
    return this.alertsService.getActiveAlerts(patientId);
  }

  async getDevices(patientId: string, user: CurrentUserPayload) {
    await this.findOne(patientId, user);

    const genericDevices = await this.devicesService.findByPatient(patientId);
    const tenoviDevices =
      await this.tenoviService.findHwiDevicesByPatient(patientId);

    return {
      devices: genericDevices,
      tenoviDevices: tenoviDevices,
      total: genericDevices.length + tenoviDevices.length,
    };
  }

  async assignDevice(
    patientId: string,
    deviceId: string,
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);
    return this.devicesService.assignToPatient(deviceId, patientId, user.sub);
  }

  async unassignDevice(
    patientId: string,
    deviceId: string,
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);
    return this.devicesService.unassignFromPatient(deviceId, user.sub);
  }

  async getMedications(patientId: string, user: CurrentUserPayload) {
    const patient = await this.userRepository.findOne({
      where: { id: patientId },
      relations: ['medications'],
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    this.checkAccess(patient, user);
    return (patient as User & { medications?: unknown[] }).medications || [];
  }

  async addMedication(
    patientId: string,
    dto: Record<string, any> & { name: string },
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);

    // Add medication logic - in production, use a Medication entity
    await this.auditService.log({
      action: 'MEDICATION_ADDED',
      userId: user.sub,
      details: { patientId, medication: dto.name },
    });

    return { ...dto, id: `med_${Date.now()}`, patientId };
  }

  async updateMedication(
    patientId: string,
    medicationId: string,
    dto: Record<string, any>,
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);

    await this.auditService.log({
      action: 'MEDICATION_UPDATED',
      userId: user.sub,
      details: { patientId, medicationId },
    });

    return { id: medicationId, patientId, ...dto };
  }

  async removeMedication(
    patientId: string,
    medicationId: string,
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);

    await this.auditService.log({
      action: 'MEDICATION_REMOVED',
      userId: user.sub,
      details: { patientId, medicationId },
    });
  }

  async getCarePlan(patientId: string, user: CurrentUserPayload) {
    const patient = await this.findOne(patientId, user);
    type PatientWithCarePlan = Partial<User> & {
      carePlan?: { goals: string[]; interventions: string[]; notes: string };
    };
    return (
      (patient as PatientWithCarePlan).carePlan || {
        goals: [],
        interventions: [],
        notes: '',
      }
    );
  }

  async updateCarePlan(
    patientId: string,
    dto: { goals?: string[]; interventions?: string[]; notes?: string },
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);

    await this.userRepository.update(patientId, {
      carePlan: dto,
    } as Partial<User>);

    await this.auditService.log({
      action: 'CARE_PLAN_UPDATED',
      userId: user.sub,
      details: { patientId },
    });

    return this.getCarePlan(patientId, user);
  }

  async getAIInsights(patientId: string, user: CurrentUserPayload) {
    await this.findOne(patientId, user);
    return this.aiService.getPatientInsights(patientId);
  }

  async getRiskScore(
    patientId: string,
    user: CurrentUserPayload,
  ): Promise<{ score: number; level: string; factors: string[] }> {
    await this.findOne(patientId, user);
    return this.aiService.calculateRiskScore(patientId) as Promise<{
      score: number;
      level: string;
      factors: string[];
    }>;
  }

  async getAdherence(
    patientId: string,
    options: { startDate?: string; endDate?: string },
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);

    // Calculate adherence based on vitals readings and medication tracking
    const vitalsResult = await this.vitalsService.getVitalsHistory(
      patientId,
      {
        startDate: options.startDate ? new Date(options.startDate) : undefined,
        endDate: options.endDate ? new Date(options.endDate) : undefined,
      },
    );

    // Simple adherence calculation
    const totalExpected = 30; // Expected readings per month
    const actual = vitalsResult.vitals.length;
    const adherenceRate = Math.min((actual / totalExpected) * 100, 100);

    return {
      patientId,
      adherenceRate: Math.round(adherenceRate),
      totalReadings: actual,
      expectedReadings: totalExpected,
      period: options,
    };
  }

  async getAppointments(
    patientId: string,
    _status: string,
    user: CurrentUserPayload,
  ) {
    await this.findOne(patientId, user);

    // Return mock appointments - in production, use Appointments entity
    return [];
  }

  private checkAccess(patient: User, user: CurrentUserPayload): void {
    const role = user.role as UserRole;
    if (role === UserRole.ADMIN || role === UserRole.SUPERADMIN) return;

    if (role === UserRole.PATIENT && patient.id !== user.sub) {
      throw new ForbiddenException('Access denied');
    }

    if (role === UserRole.PROVIDER) {
      const patientWithProvider = patient as User & { providerId?: string };
      if (
        patient.organizationId !== user.organizationId &&
        patientWithProvider.providerId !== user.sub
      ) {
        throw new ForbiddenException('Access denied');
      }
    }
  }

  private sanitizePatient(patient: User): Partial<User> {
    const { passwordHash, resetToken, verificationToken, ...safe } =
      patient as User & {
        passwordHash?: string;
        resetToken?: string;
        verificationToken?: string;
      };
    void passwordHash;
    void resetToken;
    void verificationToken;
    return safe;
  }
}
