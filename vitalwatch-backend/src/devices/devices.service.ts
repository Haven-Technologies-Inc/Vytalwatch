import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Device, DeviceType, DeviceStatus, DeviceVendor } from './entities/device.entity';
import { VitalsService } from '../vitals/vitals.service';
import { VitalType } from '../vitals/entities/vital-reading.entity';
import { AuditService } from '../audit/audit.service';

export interface RegisterDeviceDto {
  patientId: string;
  type: DeviceType;
  name: string;
  serialNumber: string;
  model?: string;
  vendor?: DeviceVendor;
  tenoviDeviceId?: string;
}

export interface TenoviWebhookPayload {
  event: string;
  device_id: string;
  patient_id?: string;
  timestamp: string;
  data: {
    type: string;
    value?: number;
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    spo2?: number;
    weight?: number;
    temperature?: number;
    glucose?: number;
    unit?: string;
    battery_level?: number;
  };
  metadata?: Record<string, any>;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly vitalsService: VitalsService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDeviceDto): Promise<Device> {
    // Check if device already exists
    const existing = await this.deviceRepository.findOne({
      where: { serialNumber: dto.serialNumber },
    });

    if (existing) {
      throw new ConflictException('Device with this serial number already registered');
    }

    const device = this.deviceRepository.create({
      ...dto,
      status: DeviceStatus.ACTIVE,
      vendor: dto.vendor || DeviceVendor.TENOVI,
    });

    const saved = await this.deviceRepository.save(device);

    await this.auditService.log({
      action: 'DEVICE_REGISTERED',
      userId: dto.patientId,
      resourceType: 'device',
      resourceId: saved.id,
      details: { type: dto.type, serialNumber: dto.serialNumber },
    });

    return saved;
  }

  async findById(id: string): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { id },
      relations: ['patient'],
    });
  }

  async findBySerialNumber(serialNumber: string): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { serialNumber },
      relations: ['patient'],
    });
  }

  async findByTenoviId(tenoviDeviceId: string): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { tenoviDeviceId },
      relations: ['patient'],
    });
  }

  async findByPatient(patientId: string): Promise<Device[]> {
    return this.deviceRepository.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
    const device = await this.findById(id);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.status = status;
    return this.deviceRepository.save(device);
  }

  async updateLastSync(id: string): Promise<void> {
    await this.deviceRepository.update(id, {
      lastSyncAt: new Date(),
    });
  }

  async unregister(id: string): Promise<void> {
    const device = await this.findById(id);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.auditService.log({
      action: 'DEVICE_UNREGISTERED',
      userId: device.patientId,
      resourceType: 'device',
      resourceId: id,
    });

    await this.deviceRepository.delete(id);
  }

  // Tenovi Integration
  async processTenoviWebhook(payload: TenoviWebhookPayload): Promise<void> {
    this.logger.log(`Processing Tenovi webhook: ${payload.event}`);

    // Find device by Tenovi device ID
    let device = await this.findByTenoviId(payload.device_id);

    if (!device) {
      this.logger.warn(`Device not found for Tenovi ID: ${payload.device_id}`);
      return;
    }

    switch (payload.event) {
      case 'reading':
      case 'measurement':
        await this.processReading(device, payload);
        break;

      case 'device_connected':
        await this.updateStatus(device.id, DeviceStatus.ACTIVE);
        break;

      case 'device_disconnected':
        await this.updateStatus(device.id, DeviceStatus.DISCONNECTED);
        break;

      case 'low_battery':
        if (payload.data.battery_level !== undefined) {
          await this.deviceRepository.update(device.id, {
            batteryLevel: payload.data.battery_level,
          });
        }
        break;

      default:
        this.logger.log(`Unhandled Tenovi event: ${payload.event}`);
    }

    // Update last sync
    await this.updateLastSync(device.id);

    // Audit log
    await this.auditService.log({
      action: 'DEVICE_DATA_RECEIVED',
      userId: device.patientId,
      resourceType: 'device',
      resourceId: device.id,
      details: { event: payload.event, dataType: payload.data.type },
    });
  }

  private async processReading(device: Device, payload: TenoviWebhookPayload): Promise<void> {
    const { data } = payload;
    const vitalType = this.mapTenoviTypeToVitalType(data.type);

    if (!vitalType) {
      this.logger.warn(`Unknown Tenovi data type: ${data.type}`);
      return;
    }

    // Create vital reading based on data type
    const vitalData: any = {
      patientId: device.patientId,
      deviceId: device.id,
      type: vitalType,
      recordedAt: new Date(payload.timestamp),
      metadata: payload.metadata,
    };

    switch (vitalType) {
      case VitalType.BLOOD_PRESSURE:
        vitalData.systolic = data.systolic;
        vitalData.diastolic = data.diastolic;
        vitalData.value = data.systolic; // Primary value for sorting/display
        vitalData.unit = 'mmHg';
        if (data.pulse) {
          // Also create heart rate reading
          await this.vitalsService.create({
            patientId: device.patientId,
            deviceId: device.id,
            type: VitalType.HEART_RATE,
            value: data.pulse,
            unit: 'bpm',
            recordedAt: new Date(payload.timestamp),
          });
        }
        break;

      case VitalType.BLOOD_GLUCOSE:
        vitalData.value = data.glucose || data.value;
        vitalData.unit = data.unit || 'mg/dL';
        break;

      case VitalType.SPO2:
        vitalData.value = data.spo2 || data.value;
        vitalData.unit = '%';
        if (data.pulse) {
          await this.vitalsService.create({
            patientId: device.patientId,
            deviceId: device.id,
            type: VitalType.HEART_RATE,
            value: data.pulse,
            unit: 'bpm',
            recordedAt: new Date(payload.timestamp),
          });
        }
        break;

      case VitalType.WEIGHT:
        vitalData.value = data.weight || data.value;
        vitalData.unit = data.unit || 'lbs';
        break;

      case VitalType.TEMPERATURE:
        vitalData.value = data.temperature || data.value;
        vitalData.unit = data.unit || '°F';
        break;

      case VitalType.HEART_RATE:
        vitalData.value = data.pulse || data.value;
        vitalData.unit = 'bpm';
        break;

      default:
        vitalData.value = data.value;
        vitalData.unit = data.unit || '';
    }

    // Create the vital reading
    await this.vitalsService.create(vitalData);

    // Update device stats
    await this.deviceRepository.update(device.id, {
      lastReadingAt: new Date(payload.timestamp),
      totalReadings: () => 'totalReadings + 1',
    });
  }

  private mapTenoviTypeToVitalType(tenoviType: string): VitalType | null {
    const mapping: Record<string, VitalType> = {
      'blood_pressure': VitalType.BLOOD_PRESSURE,
      'bp': VitalType.BLOOD_PRESSURE,
      'glucose': VitalType.BLOOD_GLUCOSE,
      'blood_glucose': VitalType.BLOOD_GLUCOSE,
      'spo2': VitalType.SPO2,
      'oxygen': VitalType.SPO2,
      'pulse_ox': VitalType.SPO2,
      'weight': VitalType.WEIGHT,
      'scale': VitalType.WEIGHT,
      'temperature': VitalType.TEMPERATURE,
      'temp': VitalType.TEMPERATURE,
      'heart_rate': VitalType.HEART_RATE,
      'pulse': VitalType.HEART_RATE,
      'respiratory_rate': VitalType.RESPIRATORY_RATE,
    };

    return mapping[tenoviType.toLowerCase()] || null;
  }

  async getDeviceStats(organizationId?: string): Promise<{
    total: number;
    active: number;
    disconnected: number;
    byType: Record<DeviceType, number>;
  }> {
    const queryBuilder = this.deviceRepository.createQueryBuilder('device');

    if (organizationId) {
      queryBuilder
        .leftJoin('device.patient', 'patient')
        .where('patient.organizationId = :organizationId', { organizationId });
    }

    const devices = await queryBuilder.getMany();

    const byType: Record<string, number> = {};
    Object.values(DeviceType).forEach(type => {
      byType[type] = 0;
    });

    let active = 0;
    let disconnected = 0;

    devices.forEach(device => {
      byType[device.type]++;
      if (device.status === DeviceStatus.ACTIVE) active++;
      if (device.status === DeviceStatus.DISCONNECTED) disconnected++;
    });

    return {
      total: devices.length,
      active,
      disconnected,
      byType: byType as Record<DeviceType, number>,
    };
  }
}
