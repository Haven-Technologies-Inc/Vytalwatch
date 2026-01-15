import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Alert, AlertType, AlertSeverity, AlertStatus } from './entities/alert.entity';
import { VitalReading, VitalType, VitalStatus } from '../vitals/entities/vital-reading.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';

export interface CreateAlertDto {
  patientId: string;
  providerId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  vitalReadingId?: string;
  deviceId?: string;
  metadata?: Record<string, any>;
}

export interface AlertQueryOptions {
  patientId?: string;
  providerId?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  async create(createAlertDto: CreateAlertDto): Promise<Alert> {
    const alert = this.alertRepository.create({
      ...createAlertDto,
      status: AlertStatus.ACTIVE,
    });

    const savedAlert = await this.alertRepository.save(alert);

    // Send notifications
    await this.sendAlertNotifications(savedAlert);

    // Audit log
    await this.auditService.log({
      action: 'ALERT_CREATED',
      userId: createAlertDto.patientId,
      resourceType: 'alert',
      resourceId: savedAlert.id,
      details: { type: createAlertDto.type, severity: createAlertDto.severity },
    });

    return savedAlert;
  }

  async createVitalAlert(vital: VitalReading): Promise<Alert> {
    const severity = this.mapVitalStatusToSeverity(vital.status);
    const title = this.getAlertTitle(vital.type, vital.status);
    const message = this.getAlertMessage(vital);

    return this.create({
      patientId: vital.patientId,
      providerId: vital.providerId,
      type: AlertType.VITAL_ABNORMAL,
      severity,
      title,
      message,
      vitalReadingId: vital.id,
      deviceId: vital.deviceId,
      metadata: {
        vitalType: vital.type,
        value: vital.value,
        unit: vital.unit,
        systolic: vital.systolic,
        diastolic: vital.diastolic,
      },
    });
  }

  private mapVitalStatusToSeverity(status: VitalStatus): AlertSeverity {
    switch (status) {
      case VitalStatus.CRITICAL:
        return AlertSeverity.CRITICAL;
      case VitalStatus.WARNING:
        return AlertSeverity.HIGH;
      default:
        return AlertSeverity.LOW;
    }
  }

  private getAlertTitle(vitalType: VitalType, status: VitalStatus): string {
    const typeNames: Record<VitalType, string> = {
      [VitalType.BLOOD_PRESSURE]: 'Blood Pressure',
      [VitalType.HEART_RATE]: 'Heart Rate',
      [VitalType.BLOOD_GLUCOSE]: 'Blood Glucose',
      [VitalType.SPO2]: 'Oxygen Saturation',
      [VitalType.TEMPERATURE]: 'Temperature',
      [VitalType.WEIGHT]: 'Weight',
      [VitalType.RESPIRATORY_RATE]: 'Respiratory Rate',
    };

    const statusText = status === VitalStatus.CRITICAL ? 'Critical' : 'Abnormal';
    return `${statusText} ${typeNames[vitalType] || vitalType} Reading`;
  }

  private getAlertMessage(vital: VitalReading): string {
    if (vital.type === VitalType.BLOOD_PRESSURE) {
      return `Blood pressure reading of ${vital.systolic}/${vital.diastolic} mmHg is outside normal range.`;
    }

    return `${vital.type} reading of ${vital.value} ${vital.unit} is outside normal range.`;
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    try {
      // Get patient info
      const patient = await this.usersService.findById(alert.patientId);
      if (!patient) return;

      // Send to patient
      await this.notificationsService.sendAlertNotification(patient, {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
      });

      // Send to assigned provider if exists
      if (patient.assignedProviderId) {
        const provider = await this.usersService.findById(patient.assignedProviderId);
        if (provider) {
          await this.notificationsService.sendAlertNotification(provider, {
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            message: `Patient ${patient.firstName} ${patient.lastName}: ${alert.message}`,
          });
        }
      }

      // Update alert notification status
      await this.alertRepository.update(alert.id, {
        notificationSent: true,
        notificationSentAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to send alert notifications for alert ${alert.id}`, error);
    }
  }

  async findById(id: string): Promise<Alert | null> {
    return this.alertRepository.findOne({
      where: { id },
      relations: ['patient', 'provider', 'vitalReading'],
    });
  }

  async findAll(options: AlertQueryOptions): Promise<{ alerts: Alert[]; total: number }> {
    const { patientId, providerId, type, severity, status, page = 1, limit = 20 } = options;

    const queryBuilder = this.alertRepository.createQueryBuilder('alert');

    if (patientId) queryBuilder.andWhere('alert.patientId = :patientId', { patientId });
    if (providerId) queryBuilder.andWhere('alert.providerId = :providerId', { providerId });
    if (type) queryBuilder.andWhere('alert.type = :type', { type });
    if (severity) queryBuilder.andWhere('alert.severity = :severity', { severity });
    if (status) queryBuilder.andWhere('alert.status = :status', { status });

    queryBuilder
      .leftJoinAndSelect('alert.patient', 'patient')
      .orderBy('alert.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [alerts, total] = await queryBuilder.getManyAndCount();

    return { alerts, total };
  }

  async getActiveAlerts(providerId?: string): Promise<Alert[]> {
    const queryBuilder = this.alertRepository
      .createQueryBuilder('alert')
      .where('alert.status = :status', { status: AlertStatus.ACTIVE })
      .leftJoinAndSelect('alert.patient', 'patient')
      .orderBy('alert.severity', 'DESC')
      .addOrderBy('alert.createdAt', 'DESC');

    if (providerId) {
      queryBuilder.andWhere('alert.providerId = :providerId', { providerId });
    }

    return queryBuilder.getMany();
  }

  async acknowledge(id: string, userId: string): Promise<Alert> {
    const alert = await this.findById(id);
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    const updated = await this.alertRepository.save(alert);

    await this.auditService.log({
      action: 'ALERT_ACKNOWLEDGED',
      userId,
      resourceType: 'alert',
      resourceId: id,
    });

    return updated;
  }

  async resolve(id: string, userId: string, resolution?: string): Promise<Alert> {
    const alert = await this.findById(id);
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;
    if (resolution) {
      alert.metadata = { ...alert.metadata, resolution };
    }

    const updated = await this.alertRepository.save(alert);

    await this.auditService.log({
      action: 'ALERT_RESOLVED',
      userId,
      resourceType: 'alert',
      resourceId: id,
      details: { resolution },
    });

    return updated;
  }

  async escalate(id: string, userId: string, reason: string): Promise<Alert> {
    const alert = await this.findById(id);
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    // Increase severity
    const severityOrder = [AlertSeverity.LOW, AlertSeverity.MEDIUM, AlertSeverity.HIGH, AlertSeverity.CRITICAL];
    const currentIndex = severityOrder.indexOf(alert.severity);
    if (currentIndex < severityOrder.length - 1) {
      alert.severity = severityOrder[currentIndex + 1];
    }

    alert.escalatedAt = new Date();
    alert.metadata = { ...alert.metadata, escalationReason: reason };

    const updated = await this.alertRepository.save(alert);

    // Resend notifications for escalated alert
    await this.sendAlertNotifications(updated);

    await this.auditService.log({
      action: 'ALERT_ESCALATED',
      userId,
      resourceType: 'alert',
      resourceId: id,
      details: { newSeverity: alert.severity, reason },
    });

    return updated;
  }

  async getAlertStats(providerId?: string): Promise<{
    total: number;
    active: number;
    critical: number;
    acknowledged: number;
    resolved: number;
  }> {
    const baseWhere = providerId ? { providerId } : {};

    const [total, active, critical, acknowledged, resolved] = await Promise.all([
      this.alertRepository.count({ where: baseWhere }),
      this.alertRepository.count({ where: { ...baseWhere, status: AlertStatus.ACTIVE } }),
      this.alertRepository.count({ where: { ...baseWhere, severity: AlertSeverity.CRITICAL, status: AlertStatus.ACTIVE } }),
      this.alertRepository.count({ where: { ...baseWhere, status: AlertStatus.ACKNOWLEDGED } }),
      this.alertRepository.count({ where: { ...baseWhere, status: AlertStatus.RESOLVED } }),
    ]);

    return { total, active, critical, acknowledged, resolved };
  }

  async getPatientAlertHistory(
    patientId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ alerts: Alert[]; total: number }> {
    return this.findAll({ patientId, ...options });
  }

  async bulkAcknowledge(ids: string[], userId: string): Promise<number> {
    const result = await this.alertRepository.update(
      { id: In(ids), status: AlertStatus.ACTIVE },
      {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    );

    return result.affected || 0;
  }
}
