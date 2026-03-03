import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { VitalReading, VitalType, VitalStatus } from './entities/vital-reading.entity';
import { AlertsService } from '../alerts/alerts.service';
import { AuditService } from '../audit/audit.service';
import { CreateVitalDto } from './dto/create-vital.dto';
import { UpdateVitalDto } from './dto/update-vital.dto';

export { CreateVitalDto };

export interface VitalQueryOptions {
  patientId: string;
  type?: VitalType;
  status?: VitalStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class VitalsService {
  private readonly logger = new Logger(VitalsService.name);

  constructor(
    @InjectRepository(VitalReading)
    private readonly vitalRepository: Repository<VitalReading>,
    private readonly alertsService: AlertsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async create(createVitalDto: CreateVitalDto): Promise<VitalReading> {
    // Duplicate vital reading prevention: reject if same patientId, type, and recordedAt within 60 seconds
    const recordedAt = createVitalDto.recordedAt ? new Date(createVitalDto.recordedAt) : new Date();
    const windowStart = new Date(recordedAt.getTime() - 60 * 1000);
    const windowEnd = new Date(recordedAt.getTime() + 60 * 1000);

    const duplicate = await this.vitalRepository.findOne({
      where: {
        patientId: createVitalDto.patientId,
        type: createVitalDto.type,
        recordedAt: Between(windowStart, windowEnd),
      },
    });

    if (duplicate) {
      throw new ConflictException('Duplicate vital reading detected within 60 seconds');
    }

    const status = this.evaluateVitalStatus(createVitalDto);

    const vital = this.vitalRepository.create({
      ...createVitalDto,
      status,
      recordedAt: createVitalDto.recordedAt || new Date(),
    });

    const savedVital = await this.vitalRepository.save(vital);

    // Create alert if vital is abnormal
    if (status !== VitalStatus.NORMAL) {
      await this.alertsService.createVitalAlert(savedVital);
    }

    // Audit log
    await this.auditService.log({
      action: 'VITAL_RECORDED',
      userId: createVitalDto.patientId,
      resourceType: 'vital',
      resourceId: savedVital.id,
      details: { type: createVitalDto.type, value: createVitalDto.value, status },
    });

    return savedVital;
  }

  async update(id: string, updateVitalDto: UpdateVitalDto, userId?: string): Promise<VitalReading> {
    const vital = await this.findById(id);
    if (!vital) {
      throw new NotFoundException('Vital reading not found');
    }

    // Apply updates
    Object.assign(vital, updateVitalDto);

    // Re-evaluate status if value-related fields changed
    if (
      updateVitalDto.value !== undefined ||
      updateVitalDto.systolic !== undefined ||
      updateVitalDto.diastolic !== undefined ||
      updateVitalDto.type !== undefined
    ) {
      // Only auto-evaluate if status was not explicitly set
      if (updateVitalDto.status === undefined) {
        vital.status = this.evaluateVitalStatus({
          patientId: vital.patientId,
          type: vital.type,
          value: vital.value,
          unit: vital.unit,
          systolic: vital.systolic,
          diastolic: vital.diastolic,
        });
      }
    }

    const updatedVital = await this.vitalRepository.save(vital);

    // Audit log
    await this.auditService.log({
      action: 'VITAL_UPDATED',
      userId: userId || vital.patientId,
      resourceType: 'vital',
      resourceId: id,
      details: updateVitalDto,
    });

    return updatedVital;
  }

  private evaluateVitalStatus(vital: CreateVitalDto): VitalStatus {
    const thresholds = this.configService.get('alertThresholds');

    switch (vital.type) {
      case VitalType.BLOOD_PRESSURE:
        return this.evaluateBloodPressure(vital.systolic, vital.diastolic, thresholds.bloodPressure);

      case VitalType.BLOOD_GLUCOSE:
        return this.evaluateRange(vital.value, thresholds.glucose);

      case VitalType.SPO2:
        return this.evaluateSpo2(vital.value, thresholds.spo2);

      case VitalType.HEART_RATE:
        return this.evaluateRange(vital.value, { min: 60, max: 100 });

      case VitalType.TEMPERATURE:
        return this.evaluateRange(vital.value, { min: 97.0, max: 99.5 });

      case VitalType.WEIGHT:
        // Weight changes evaluated separately via trends
        return VitalStatus.NORMAL;

      case VitalType.RESPIRATORY_RATE:
        return this.evaluateRange(vital.value, { min: 12, max: 20 });

      default:
        return VitalStatus.NORMAL;
    }
  }

  private evaluateBloodPressure(
    systolic?: number,
    diastolic?: number,
    thresholds?: any,
  ): VitalStatus {
    if (!systolic || !diastolic || !thresholds) return VitalStatus.NORMAL;

    if (
      systolic >= thresholds.systolic.critical.max ||
      systolic <= thresholds.systolic.critical.min ||
      diastolic >= thresholds.diastolic.critical.max ||
      diastolic <= thresholds.diastolic.critical.min
    ) {
      return VitalStatus.CRITICAL;
    }

    if (
      systolic >= thresholds.systolic.high.max ||
      systolic <= thresholds.systolic.high.min ||
      diastolic >= thresholds.diastolic.high.max ||
      diastolic <= thresholds.diastolic.high.min
    ) {
      return VitalStatus.WARNING;
    }

    return VitalStatus.NORMAL;
  }

  private evaluateRange(value: number, thresholds: { min: number; max: number }): VitalStatus {
    if (value < thresholds.min * 0.8 || value > thresholds.max * 1.2) {
      return VitalStatus.CRITICAL;
    }

    if (value < thresholds.min || value > thresholds.max) {
      return VitalStatus.WARNING;
    }

    return VitalStatus.NORMAL;
  }

  private evaluateSpo2(value: number, thresholds: any): VitalStatus {
    if (value <= thresholds.critical) return VitalStatus.CRITICAL;
    if (value <= thresholds.warning) return VitalStatus.WARNING;
    return VitalStatus.NORMAL;
  }

  async findById(id: string): Promise<VitalReading | null> {
    return this.vitalRepository.findOne({
      where: { id },
      relations: ['patient', 'provider', 'device'],
    });
  }

  async findAll(options: VitalQueryOptions): Promise<{ vitals: VitalReading[]; total: number }> {
    const { patientId, type, status, startDate, endDate, page = 1, limit = 50 } = options;

    const queryBuilder = this.vitalRepository
      .createQueryBuilder('vital')
      .where('vital.patientId = :patientId', { patientId });

    if (type) queryBuilder.andWhere('vital.type = :type', { type });
    if (status) queryBuilder.andWhere('vital.status = :status', { status });
    if (startDate && endDate) {
      queryBuilder.andWhere('vital.recordedAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    queryBuilder
      .orderBy('vital.recordedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [vitals, total] = await queryBuilder.getManyAndCount();

    return { vitals, total };
  }

  async getLatestByType(patientId: string, type: VitalType): Promise<VitalReading | null> {
    return this.vitalRepository.findOne({
      where: { patientId, type },
      order: { recordedAt: 'DESC' },
    });
  }

  async getLatestVitals(patientId: string): Promise<Record<VitalType, VitalReading | null>> {
    const vitalTypes = Object.values(VitalType);
    const result: Record<string, VitalReading | null> = {};

    await Promise.all(
      vitalTypes.map(async (type) => {
        result[type] = await this.getLatestByType(patientId, type);
      }),
    );

    return result as Record<VitalType, VitalReading | null>;
  }

  async getVitalTrend(
    patientId: string,
    type: VitalType,
    days: number = 30,
  ): Promise<{ readings: VitalReading[]; trend: 'improving' | 'stable' | 'declining' | 'unknown' }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const readings = await this.vitalRepository.find({
      where: {
        patientId,
        type,
        recordedAt: MoreThanOrEqual(startDate),
      },
      order: { recordedAt: 'ASC' },
    });

    const trend = this.calculateTrend(readings);

    return { readings, trend };
  }

  private calculateTrend(readings: VitalReading[]): 'improving' | 'stable' | 'declining' | 'unknown' {
    if (readings.length < 3) return 'unknown';

    const recentHalf = readings.slice(Math.floor(readings.length / 2));
    const olderHalf = readings.slice(0, Math.floor(readings.length / 2));

    const recentAvg = recentHalf.reduce((sum, r) => sum + r.value, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((sum, r) => sum + r.value, 0) / olderHalf.length;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    // For most vitals, closer to normal range is better
    // This is a simplified trend calculation
    if (Math.abs(changePercent) < 5) return 'stable';

    const recentAbnormal = recentHalf.filter(r => r.status !== VitalStatus.NORMAL).length;
    const olderAbnormal = olderHalf.filter(r => r.status !== VitalStatus.NORMAL).length;

    if (recentAbnormal < olderAbnormal) return 'improving';
    if (recentAbnormal > olderAbnormal) return 'declining';

    return 'stable';
  }

  async getPatientSummary(patientId: string): Promise<{
    latestVitals: Record<VitalType, VitalReading | null>;
    abnormalCount: number;
    totalReadings: number;
    lastReading: Date | null;
  }> {
    const latestVitals = await this.getLatestVitals(patientId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [abnormalCount, totalReadings] = await Promise.all([
      this.vitalRepository.count({
        where: {
          patientId,
          status: VitalStatus.WARNING || VitalStatus.CRITICAL,
          recordedAt: MoreThanOrEqual(thirtyDaysAgo),
        },
      }),
      this.vitalRepository.count({
        where: {
          patientId,
          recordedAt: MoreThanOrEqual(thirtyDaysAgo),
        },
      }),
    ]);

    const lastReading = await this.vitalRepository.findOne({
      where: { patientId },
      order: { recordedAt: 'DESC' },
      select: ['recordedAt'],
    });

    return {
      latestVitals,
      abnormalCount,
      totalReadings,
      lastReading: lastReading?.recordedAt || null,
    };
  }

  async updateAIAnalysis(id: string, analysis: {
    aiAnalysis?: string;
    aiRiskScore?: number;
    aiRecommendations?: string[];
  }): Promise<VitalReading> {
    const vital = await this.findById(id);
    if (!vital) {
      throw new NotFoundException('Vital reading not found');
    }

    Object.assign(vital, analysis);
    return this.vitalRepository.save(vital);
  }

  async delete(id: string): Promise<void> {
    const result = await this.vitalRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Vital reading not found');
    }
  }

  async getVitalsHistory(
    patientId: string,
    options?: { startDate?: Date; endDate?: Date; limit?: number; page?: number },
  ): Promise<{ vitals: VitalReading[]; total: number }> {
    const { startDate, endDate, limit = 50, page = 1 } = options || {};

    const queryBuilder = this.vitalRepository
      .createQueryBuilder('vital')
      .where('vital.patientId = :patientId', { patientId });

    if (startDate && endDate) {
      queryBuilder.andWhere('vital.recordedAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      queryBuilder.andWhere('vital.recordedAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('vital.recordedAt <= :endDate', { endDate });
    }

    queryBuilder
      .orderBy('vital.recordedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [vitals, total] = await queryBuilder.getManyAndCount();
    return { vitals, total };
  }

  async getVitalsByType(
    patientId: string,
    type: VitalType,
    limit: number = 50,
  ): Promise<VitalReading[]> {
    return this.vitalRepository.find({
      where: { patientId, type },
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }
}
