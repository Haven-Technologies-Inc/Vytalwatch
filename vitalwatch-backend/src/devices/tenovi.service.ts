import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  TenoviGateway,
  TenoviWhitelistedDevice,
  TenoviGatewayProperty,
  WhitelistStatus,
} from './entities/tenovi-gateway.entity';
import {
  TenoviHwiDevice,
  TenoviDeviceStatus,
  TenoviShippingStatus,
} from './entities/tenovi-hwi-device.entity';
import {
  TenoviGatewayDto,
  TenoviHwiDeviceDto,
  TenoviMeasurementWebhookDto,
  TenoviDeviceTypeDto,
  TenoviOrderDto,
  RegisterTenoviGatewayDto,
  AssignTenoviDeviceDto,
  CreateTenoviFulfillmentDto,
  WhitelistDeviceDto,
  TenoviPaginatedResponseDto,
  TenoviPatientDto,
  TenoviHardwareChangeDto,
  TenoviSpecialOrderWebhookDto,
} from './dto/tenovi.dto';
import { VitalsService } from '../vitals/vitals.service';
import { VitalType } from '../vitals/entities/vital-reading.entity';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';
import { EnterpriseLoggingService } from '../enterprise-logging/enterprise-logging.service';
import { ApiOperation, LogSeverity } from '../enterprise-logging/entities/api-audit-log.entity';

@Injectable()
export class TenoviService {
  private readonly logger = new Logger(TenoviService.name);
  private readonly apiClient: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly clientDomain: string;

  constructor(
    @InjectRepository(TenoviGateway)
    private readonly gatewayRepository: Repository<TenoviGateway>,
    @InjectRepository(TenoviWhitelistedDevice)
    private readonly whitelistedDeviceRepository: Repository<TenoviWhitelistedDevice>,
    @InjectRepository(TenoviGatewayProperty)
    private readonly propertyRepository: Repository<TenoviGatewayProperty>,
    @InjectRepository(TenoviHwiDevice)
    private readonly hwiDeviceRepository: Repository<TenoviHwiDevice>,
    private readonly vitalsService: VitalsService,
    private readonly auditService: AuditService,
    private readonly alertsService: AlertsService,
    private readonly configService: ConfigService,
    private readonly enterpriseLogger: EnterpriseLoggingService,
  ) {
    this.apiUrl = this.configService.get('tenovi.apiUrl') || 'https://api2.tenovi.com';
    this.apiKey = this.configService.get('tenovi.apiKey') || '';
    this.clientDomain = this.configService.get('tenovi.clientDomain') || '';

    this.apiClient = axios.create({
      baseURL: `${this.apiUrl}/clients/${this.clientDomain}/hwi`,
      headers: {
        Authorization: `Api-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.apiClient.interceptors.request.use((config) => {
      (config as any).metadata = { startTime: Date.now() };
      return config;
    });

    this.apiClient.interceptors.response.use(
      async (response) => {
        const duration = Date.now() - ((response.config as any).metadata?.startTime || Date.now());
        await this.enterpriseLogger.logTenovi({
          operation: ApiOperation.DEVICE_SYNC, success: true,
          endpoint: response.config.url, method: response.config.method?.toUpperCase(),
          responseStatus: response.status, durationMs: duration,
          metadata: { baseURL: response.config.baseURL },
        });
        return response;
      },
      async (error: AxiosError) => {
        const duration = Date.now() - ((error.config as any)?.metadata?.startTime || Date.now());
        await this.enterpriseLogger.logTenovi({
          operation: ApiOperation.DEVICE_SYNC, success: false, severity: LogSeverity.ERROR,
          endpoint: error.config?.url, method: error.config?.method?.toUpperCase(),
          responseStatus: error.response?.status, durationMs: duration,
          errorMessage: error.message, errorCode: (error.response?.data as any)?.code,
        });
        this.logger.error(`Tenovi API error: ${error.message}`, error.response?.data);
        throw new HttpException(error.response?.data || 'Tenovi API error', error.response?.status || 500);
      },
    );
  }

  // ==================== GATEWAY OPERATIONS ====================

  async getGatewayInfo(gatewayUuid: string): Promise<TenoviGatewayDto> {
    const cleanUuid = gatewayUuid.replace(/-/g, '');
    const response = await this.apiClient.get<TenoviGatewayDto>(
      `/gateway-info/${cleanUuid}/`,
    );
    return response.data;
  }

  async syncGatewayFromApi(gatewayUuid: string): Promise<TenoviGateway> {
    const apiData = await this.getGatewayInfo(gatewayUuid);
    return this.upsertGatewayFromDto(apiData);
  }

  async upsertGatewayFromDto(dto: TenoviGatewayDto): Promise<TenoviGateway> {
    let gateway = await this.gatewayRepository.findOne({
      where: { gatewayUuid: dto.gateway_uuid },
    });

    if (!gateway) {
      gateway = this.gatewayRepository.create({
        gatewayUuid: dto.gateway_uuid,
      });
    }

    gateway.firmwareVersion = dto.firmware_version || gateway.firmwareVersion;
    gateway.bootloaderVersion = dto.bootloader_version || gateway.bootloaderVersion;
    gateway.provisioned = dto.provisioned ?? gateway.provisioned;
    gateway.lastSignalStrength = dto.last_signal_strength ?? gateway.lastSignalStrength;
    gateway.lastCheckinTime = dto.last_checkin_time
      ? new Date(dto.last_checkin_time)
      : gateway.lastCheckinTime;
    gateway.assignedOn = dto.assigned_on ? new Date(dto.assigned_on) : gateway.assignedOn;
    gateway.shippedOn = dto.shipped_on ? new Date(dto.shipped_on) : gateway.shippedOn;

    const saved = await this.gatewayRepository.save(gateway);

    // Sync whitelisted devices
    if (dto.whitelisted_devices?.length) {
      for (const device of dto.whitelisted_devices) {
        await this.upsertWhitelistedDevice(saved.id, device);
      }
    }

    // Sync properties
    if (dto.properties?.length) {
      for (const prop of dto.properties) {
        await this.upsertGatewayProperty(saved.id, prop.key, prop.value);
      }
    }

    return this.gatewayRepository.findOne({
      where: { id: saved.id },
      relations: ['whitelistedDevices', 'properties'],
    });
  }

  private async upsertWhitelistedDevice(
    gatewayId: string,
    dto: { sensor_code: string; mac_address: string; whitelist_status?: string },
  ): Promise<TenoviWhitelistedDevice> {
    let device = await this.whitelistedDeviceRepository.findOne({
      where: { gatewayId, macAddress: dto.mac_address },
    });

    if (!device) {
      device = this.whitelistedDeviceRepository.create({
        gatewayId,
        sensorCode: dto.sensor_code,
        macAddress: dto.mac_address,
      });
    }

    device.sensorCode = dto.sensor_code;
    device.whitelistStatus = (dto.whitelist_status as WhitelistStatus) || device.whitelistStatus;

    return this.whitelistedDeviceRepository.save(device);
  }

  private async upsertGatewayProperty(
    gatewayId: string,
    key: string,
    value: string,
  ): Promise<TenoviGatewayProperty> {
    let prop = await this.propertyRepository.findOne({
      where: { gatewayId, key },
    });

    if (!prop) {
      prop = this.propertyRepository.create({ gatewayId, key, value });
    } else {
      prop.value = value;
    }

    return this.propertyRepository.save(prop);
  }

  async registerGateway(dto: RegisterTenoviGatewayDto): Promise<TenoviGateway> {
    const existing = await this.gatewayRepository.findOne({
      where: { gatewayUuid: dto.gatewayUuid },
    });

    if (existing) {
      throw new BadRequestException('Gateway already registered');
    }

    // Sync from Tenovi API
    try {
      const gateway = await this.syncGatewayFromApi(dto.gatewayUuid);
      gateway.organizationId = dto.organizationId;
      gateway.patientId = dto.patientId;
      const saved = await this.gatewayRepository.save(gateway);

      await this.auditService.log({
        action: 'TENOVI_GATEWAY_REGISTERED',
        resourceType: 'tenovi_gateway',
        resourceId: saved.id,
        details: { gatewayUuid: dto.gatewayUuid },
      });

      return saved;
    } catch (error) {
      // Create locally if API fails
      const gateway = this.gatewayRepository.create({
        gatewayUuid: dto.gatewayUuid,
        organizationId: dto.organizationId,
        patientId: dto.patientId,
      });

      return this.gatewayRepository.save(gateway);
    }
  }

  async findGatewayByUuid(gatewayUuid: string): Promise<TenoviGateway | null> {
    return this.gatewayRepository.findOne({
      where: { gatewayUuid },
      relations: ['whitelistedDevices', 'properties', 'organization'],
    });
  }

  async findGatewaysByOrganization(organizationId: string): Promise<TenoviGateway[]> {
    return this.gatewayRepository.find({
      where: { organizationId },
      relations: ['whitelistedDevices', 'properties'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== HWI DEVICE OPERATIONS ====================

  async listHwiDevices(
    page = 1,
    limit = 20,
  ): Promise<TenoviPaginatedResponseDto<TenoviHwiDeviceDto>> {
    const response = await this.apiClient.get<TenoviPaginatedResponseDto<TenoviHwiDeviceDto>>(
      `/hwi-devices/`,
      { params: { page, page_size: limit } },
    );
    return response.data;
  }

  async getHwiDevice(hwiDeviceId: string): Promise<TenoviHwiDeviceDto> {
    const response = await this.apiClient.get<TenoviHwiDeviceDto>(
      `/hwi-devices/${hwiDeviceId}/`,
    );
    return response.data;
  }

  async createHwiDevice(dto: AssignTenoviDeviceDto): Promise<TenoviHwiDeviceDto> {
    const payload = {
      patient_id: dto.patientId,
      patient_phone_number: dto.patientPhoneNumber,
      patient: dto.patient
        ? {
            external_id: dto.patient.external_id,
            name: dto.patient.name,
            phone_number: dto.patient.phone_number,
            email: dto.patient.email,
            physician: dto.patient.physician,
            clinic_name: dto.patient.clinic_name,
            care_manager: dto.patient.care_manager,
            sms_opt_in: dto.patient.sms_opt_in,
          }
        : undefined,
      device: {
        hardware_uuid: dto.hwiDeviceId,
      },
    };

    const response = await this.apiClient.post<TenoviHwiDeviceDto>(
      `/hwi-devices/`,
      payload,
    );
    return response.data;
  }

  async updateHwiDevice(
    hwiDeviceId: string,
    dto: Partial<AssignTenoviDeviceDto>,
  ): Promise<TenoviHwiDeviceDto> {
    const response = await this.apiClient.patch<TenoviHwiDeviceDto>(
      `/hwi-devices/${hwiDeviceId}/`,
      dto,
    );
    return response.data;
  }

  async deleteHwiDevice(hwiDeviceId: string): Promise<void> {
    await this.apiClient.delete(`/hwi-devices/${hwiDeviceId}/`);
  }

  async syncHwiDeviceFromApi(hwiDeviceId: string): Promise<TenoviHwiDevice> {
    const apiData = await this.getHwiDevice(hwiDeviceId);
    return this.upsertHwiDeviceFromDto(apiData);
  }

  async upsertHwiDeviceFromDto(dto: TenoviHwiDeviceDto): Promise<TenoviHwiDevice> {
    let device = await this.hwiDeviceRepository.findOne({
      where: { hwiDeviceId: dto.hwi_device_id },
    });

    if (!device) {
      device = this.hwiDeviceRepository.create({
        hwiDeviceId: dto.hwi_device_id,
      });
    }

    // Update device fields
    device.tenoviId = dto.id;
    device.status = this.mapTenoviStatus(dto.status);
    device.connectedOn = dto.connected_on ? new Date(dto.connected_on) : device.connectedOn;
    device.unlinkedOn = dto.unlinked_on ? new Date(dto.unlinked_on) : device.unlinkedOn;
    device.lastMeasurement = dto.last_measurement
      ? new Date(dto.last_measurement)
      : device.lastMeasurement;

    // Device details
    if (dto.device) {
      device.deviceName = dto.device.name || device.deviceName;
      device.hardwareUuid = dto.device.hardware_uuid || device.hardwareUuid;
      device.sensorCode = dto.device.sensor_code || device.sensorCode;
      device.sensorId = dto.device.sensor_id || device.sensorId;
      device.deviceTypeId = dto.device.device_type || device.deviceTypeId;
      device.modelNumber = dto.device.model_number || device.modelNumber;
      device.sharedHardwareUuid = dto.device.shared_hardware_uuid ?? device.sharedHardwareUuid;

      // Fulfillment details
      if (dto.device.fulfillment_request) {
        const fr = dto.device.fulfillment_request;
        device.fulfillmentCreated = fr.created ? new Date(fr.created) : device.fulfillmentCreated;
        device.shippingStatus = fr.shipping_status as TenoviShippingStatus;
        device.shippingName = fr.shipping_name;
        device.shippingAddress = fr.shipping_address;
        device.shippingCity = fr.shipping_city;
        device.shippingState = fr.shipping_state;
        device.shippingZipCode = fr.shipping_zip_code;
        device.shippingTrackingLink = fr.shipping_tracking_link;
        device.shippedOn = fr.shipped_on ? new Date(fr.shipped_on) : device.shippedOn;
        device.deliveredOn = fr.delivered_on ? new Date(fr.delivered_on) : device.deliveredOn;
        device.fulfilled = fr.fulfilled ?? device.fulfilled;
        device.fulfillmentMetadata = fr as any;
      }
    }

    // Patient details
    device.tenoviPatientId = dto.patient_id || device.tenoviPatientId;
    device.patientPhoneNumber = dto.patient_phone_number || device.patientPhoneNumber;

    if (dto.patient) {
      device.patientExternalId = dto.patient.external_id;
      device.patientName = dto.patient.name;
      device.patientEmail = dto.patient.email;
      device.physician = dto.patient.physician;
      device.clinicName = dto.patient.clinic_name;
      device.careManager = dto.patient.care_manager;
      device.smsOptIn = dto.patient.sms_opt_in ?? device.smsOptIn;
    }

    return this.hwiDeviceRepository.save(device);
  }

  private mapTenoviStatus(status: string): TenoviDeviceStatus {
    const statusMap: Record<string, TenoviDeviceStatus> = {
      active: TenoviDeviceStatus.ACTIVE,
      inactive: TenoviDeviceStatus.INACTIVE,
      connected: TenoviDeviceStatus.CONNECTED,
      disconnected: TenoviDeviceStatus.DISCONNECTED,
      unlinked: TenoviDeviceStatus.UNLINKED,
    };
    return statusMap[status?.toLowerCase()] || TenoviDeviceStatus.INACTIVE;
  }

  async findHwiDeviceByHwiId(hwiDeviceId: string): Promise<TenoviHwiDevice | null> {
    return this.hwiDeviceRepository.findOne({
      where: { hwiDeviceId },
      relations: ['patient', 'organization'],
    });
  }

  async findHwiDevicesByPatient(patientId: string): Promise<TenoviHwiDevice[]> {
    return this.hwiDeviceRepository.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }

  async findHwiDevicesByOrganization(organizationId: string): Promise<TenoviHwiDevice[]> {
    return this.hwiDeviceRepository.find({
      where: { organizationId },
      relations: ['patient'],
      order: { createdAt: 'DESC' },
    });
  }

  async assignHwiDeviceToPatient(
    hwiDeviceId: string,
    patientId: string,
    organizationId?: string,
  ): Promise<TenoviHwiDevice> {
    let device = await this.findHwiDeviceByHwiId(hwiDeviceId);

    if (!device) {
      // Sync from API first
      device = await this.syncHwiDeviceFromApi(hwiDeviceId);
    }

    device.patientId = patientId;
    device.organizationId = organizationId || device.organizationId;

    const saved = await this.hwiDeviceRepository.save(device);

    await this.auditService.log({
      action: 'TENOVI_DEVICE_ASSIGNED',
      userId: patientId,
      resourceType: 'tenovi_hwi_device',
      resourceId: saved.id,
      details: { hwiDeviceId },
    });

    return saved;
  }

  // ==================== DEVICE TYPES ====================

  async listDeviceTypes(): Promise<TenoviDeviceTypeDto[]> {
    const response = await this.apiClient.get<TenoviDeviceTypeDto[]>(`/hwi-device-types/`);
    return response.data;
  }

  async getDeviceType(deviceTypeId: string): Promise<TenoviDeviceTypeDto> {
    const response = await this.apiClient.get<TenoviDeviceTypeDto>(
      `/hwi-device-types/${deviceTypeId}/`,
    );
    return response.data;
  }

  // ==================== ORDERS ====================

  async listOrders(page = 1, limit = 20): Promise<TenoviPaginatedResponseDto<TenoviOrderDto>> {
    const response = await this.apiClient.get<TenoviPaginatedResponseDto<TenoviOrderDto>>(
      `/orders/`,
      { params: { page, page_size: limit } },
    );
    return response.data;
  }

  async getOrder(orderId: string): Promise<TenoviOrderDto> {
    const response = await this.apiClient.get<TenoviOrderDto>(`/orders/${orderId}/`);
    return response.data;
  }

  // ==================== FULFILLMENT ====================

  async createFulfillmentRequest(dto: CreateTenoviFulfillmentDto): Promise<any> {
    const payload = {
      shipping_name: dto.shippingName,
      shipping_address: dto.shippingAddress,
      shipping_city: dto.shippingCity,
      shipping_state: dto.shippingState,
      shipping_zip_code: dto.shippingZipCode,
      notify_emails: dto.notifyEmails,
      require_signature: dto.requireSignature,
      ship_gateway_only: dto.shipGatewayOnly,
      client_notes: dto.clientNotes,
      device_types: dto.deviceTypes?.map((dt) => ({ name: dt })),
    };

    const response = await this.apiClient.post(`/activations/`, payload);
    return response.data;
  }

  // ==================== MEASUREMENT WEBHOOK PROCESSING ====================

  async processMeasurementWebhook(
    payload: TenoviMeasurementWebhookDto | TenoviMeasurementWebhookDto[],
  ): Promise<void> {
    const measurements = Array.isArray(payload) ? payload : [payload];

    for (const measurement of measurements) {
      await this.processSingleMeasurement(measurement);
    }
  }

  private async processSingleMeasurement(measurement: TenoviMeasurementWebhookDto): Promise<void> {
    this.logger.log(
      `Processing Tenovi measurement: ${measurement.metric} for device ${measurement.hwi_device_id}`,
    );

    // Find local device record
    let device = await this.findHwiDeviceByHwiId(measurement.hwi_device_id);

    if (!device) {
      // Try to sync from API
      try {
        device = await this.syncHwiDeviceFromApi(measurement.hwi_device_id);
      } catch (error) {
        this.logger.warn(`Device not found and cannot sync: ${measurement.hwi_device_id}`);
        return;
      }
    }

    if (!device.patientId) {
      this.logger.warn(`Device ${measurement.hwi_device_id} not assigned to a patient`);
      return;
    }

    // Update device last measurement
    device.lastMeasurement = new Date(measurement.timestamp || measurement.created);
    await this.hwiDeviceRepository.save(device);

    // Map metric to vital type and create reading
    const vitalType = this.mapMetricToVitalType(measurement.metric);

    if (!vitalType) {
      this.logger.warn(`Unknown metric type: ${measurement.metric}`);
      return;
    }

    const vitalData = this.buildVitalData(measurement, device, vitalType);

    if (vitalData) {
      await this.vitalsService.create(vitalData);

      // Audit log
      await this.auditService.log({
        action: 'TENOVI_MEASUREMENT_RECEIVED',
        userId: device.patientId,
        resourceType: 'vital_reading',
        details: {
          metric: measurement.metric,
          hwiDeviceId: measurement.hwi_device_id,
          sensorCode: measurement.sensor_code,
        },
      });
    }
  }

  private mapMetricToVitalType(metric: string): VitalType | null {
    const mapping: Record<string, VitalType> = {
      blood_pressure_systolic: VitalType.BLOOD_PRESSURE,
      blood_pressure_diastolic: VitalType.BLOOD_PRESSURE,
      blood_pressure: VitalType.BLOOD_PRESSURE,
      systolic: VitalType.BLOOD_PRESSURE,
      diastolic: VitalType.BLOOD_PRESSURE,
      pulse: VitalType.HEART_RATE,
      heart_rate: VitalType.HEART_RATE,
      spo2: VitalType.SPO2,
      oxygen_saturation: VitalType.SPO2,
      blood_oxygen: VitalType.SPO2,
      weight: VitalType.WEIGHT,
      body_weight: VitalType.WEIGHT,
      glucose: VitalType.BLOOD_GLUCOSE,
      blood_glucose: VitalType.BLOOD_GLUCOSE,
      temperature: VitalType.TEMPERATURE,
      body_temperature: VitalType.TEMPERATURE,
    };

    return mapping[metric?.toLowerCase()] || null;
  }

  private buildVitalData(
    measurement: TenoviMeasurementWebhookDto,
    device: TenoviHwiDevice,
    vitalType: VitalType,
  ): any {
    const baseData = {
      patientId: device.patientId,
      type: vitalType,
      recordedAt: new Date(measurement.timestamp || measurement.created),
      metadata: {
        hwiDeviceId: measurement.hwi_device_id,
        hardwareUuid: measurement.hardware_uuid,
        sensorCode: measurement.sensor_code,
        deviceName: measurement.device_name,
        tenoviPatientId: measurement.patient_id,
        timezoneOffset: measurement.timezone_offset,
        estimatedTimestamp: measurement.estimated_timestamp,
        filterParams: measurement.filter_params,
      },
    };

    const value1 = measurement.value_1 ? parseFloat(measurement.value_1) : null;
    const value2 = measurement.value_2 ? parseFloat(measurement.value_2) : null;

    switch (vitalType) {
      case VitalType.BLOOD_PRESSURE:
        return {
          ...baseData,
          systolic: value1,
          diastolic: value2,
          value: value1,
          unit: 'mmHg',
        };

      case VitalType.HEART_RATE:
        return {
          ...baseData,
          value: value1,
          unit: 'bpm',
        };

      case VitalType.SPO2:
        return {
          ...baseData,
          value: value1,
          unit: '%',
        };

      case VitalType.WEIGHT:
        return {
          ...baseData,
          value: value1,
          unit: 'lbs',
        };

      case VitalType.BLOOD_GLUCOSE:
        return {
          ...baseData,
          value: value1,
          unit: 'mg/dL',
        };

      case VitalType.TEMPERATURE:
        return {
          ...baseData,
          value: value1,
          unit: '°F',
        };

      default:
        return {
          ...baseData,
          value: value1,
          unit: '',
        };
    }
  }

  // ==================== FULFILLMENT STATUS UPDATES ====================

  async updateDeviceShippingStatus(data: {
    hwiDeviceId?: string;
    hardwareUuid?: string;
    status?: string;
    trackingNumber?: string;
    carrier?: string;
    shippedAt?: Date;
    deliveredAt?: Date;
    orderId?: string;
  }): Promise<TenoviHwiDevice | null> {
    let device: TenoviHwiDevice | null = null;

    // Find device by hwi_device_id or hardware_uuid
    if (data.hwiDeviceId) {
      device = await this.findHwiDeviceByHwiId(data.hwiDeviceId);
    } else if (data.hardwareUuid) {
      device = await this.hwiDeviceRepository.findOne({
        where: { hardwareUuid: data.hardwareUuid },
      });
    }

    if (!device) {
      this.logger.warn(`Device not found for shipping update: ${data.hwiDeviceId || data.hardwareUuid}`);
      return null;
    }

    // Map status string to enum
    const statusMapping: Record<string, TenoviShippingStatus> = {
      draft: TenoviShippingStatus.DRAFT,
      requested: TenoviShippingStatus.REQUESTED,
      pending: TenoviShippingStatus.PENDING,
      created: TenoviShippingStatus.CREATED,
      on_hold: TenoviShippingStatus.ON_HOLD,
      ready_to_ship: TenoviShippingStatus.READY_TO_SHIP,
      shipped: TenoviShippingStatus.SHIPPED,
      delivered: TenoviShippingStatus.DELIVERED,
      returned: TenoviShippingStatus.RETURNED,
      cancelled: TenoviShippingStatus.CANCELLED,
    };

    if (data.status) {
      const normalizedStatus = data.status.toLowerCase().replace(/\s+/g, '_');
      device.shippingStatus = statusMapping[normalizedStatus] || device.shippingStatus;
    }

    if (data.trackingNumber) {
      device.shippingTrackingLink = data.trackingNumber;
    }

    if (data.shippedAt) {
      device.shippedOn = data.shippedAt;
    }

    if (data.deliveredAt) {
      device.deliveredOn = data.deliveredAt;
      device.fulfilled = true;
    }

    if (data.orderId) {
      device.fulfillmentMetadata = {
        ...device.fulfillmentMetadata,
        orderId: data.orderId,
        carrier: data.carrier,
        lastUpdated: new Date().toISOString(),
      };
    }

    const saved = await this.hwiDeviceRepository.save(device);

    this.logger.log(`Updated shipping status for device ${device.hwiDeviceId}: ${device.shippingStatus}`);

    await this.auditService.log({
      action: 'DEVICE_SHIPPING_UPDATED',
      resourceType: 'tenovi_hwi_device',
      resourceId: device.id,
      details: {
        hwiDeviceId: device.hwiDeviceId,
        status: device.shippingStatus,
        trackingNumber: data.trackingNumber,
      },
    });

    return saved;
  }

  // ==================== SPECIAL ORDER WEBHOOK PROCESSING ====================

  async processSpecialOrderWebhook(
    payload: TenoviSpecialOrderWebhookDto,
  ): Promise<void> {
    this.logger.log(
      `Processing Tenovi special order webhook: ${payload.order_id || payload.order_number}`,
    );

    // Log the special order for tracking
    await this.auditService.log({
      action: 'TENOVI_SPECIAL_ORDER_RECEIVED',
      resourceType: 'tenovi_special_order',
      resourceId: payload.order_id || payload.order_number,
      details: {
        orderId: payload.order_id,
        orderNumber: payload.order_number,
        status: payload.status,
        shippingStatus: payload.shipping_status,
        trackingNumber: payload.tracking_number,
        carrier: payload.carrier,
        shippingName: payload.shipping_name,
        shippingAddress: payload.shipping_address,
        shippingCity: payload.shipping_city,
        shippingState: payload.shipping_state,
        shippingZipCode: payload.shipping_zip_code,
        shippedAt: payload.shipped_at,
        deliveredAt: payload.delivered_at,
        contents: payload.contents,
      },
    });

    // Emit event for real-time notifications if needed
    this.logger.log(
      `Special order ${payload.order_id || payload.order_number} status: ${payload.shipping_status || payload.status}`,
    );
  }

  // ==================== WEBHOOK CONFIGURATION ====================

  async listWebhooks(): Promise<any[]> {
    const response = await this.apiClient.get(`/webhooks/`);
    return response.data;
  }

  async createWebhook(endpoint: string, event: 'MEASUREMENT' | 'FULFILLMENT' | 'SPECIAL_ORDER'): Promise<any> {
    const response = await this.apiClient.post(`/webhooks/`, {
      endpoint,
      event,
      enabled_by_default: true,
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.apiClient.delete(`/webhooks/${webhookId}/`);
  }

  async testWebhook(webhookId: string, event: string): Promise<any> {
    const response = await this.apiClient.post(`/webhooks-testing/`, {
      event,
      webhook_ids: [webhookId],
    });
    return response.data;
  }

  // ==================== SYNC OPERATIONS ====================

  async syncAllDevices(organizationId?: string): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.listHwiDevices(page, 100);

        for (const deviceDto of response.results) {
          try {
            const device = await this.upsertHwiDeviceFromDto(deviceDto);
            if (organizationId) {
              device.organizationId = organizationId;
              await this.hwiDeviceRepository.save(device);
            }
            synced++;
          } catch (err) {
            this.logger.error(`Failed to sync device ${deviceDto.hwi_device_id}`, err);
            errors++;
          }
        }

        hasMore = !!response.next;
        page++;
      } catch (err) {
        this.logger.error('Failed to fetch devices page', err);
        break;
      }
    }

    await this.auditService.log({
      action: 'TENOVI_SYNC_COMPLETED',
      details: { synced, errors, organizationId },
    });

    return { synced, errors };
  }

  // ==================== STATISTICS ====================

  async getDeviceStats(organizationId?: string): Promise<{
    total: number;
    active: number;
    connected: number;
    byStatus: Record<TenoviDeviceStatus, number>;
    bySensorCode: Record<string, number>;
  }> {
    const query = this.hwiDeviceRepository.createQueryBuilder('device');

    if (organizationId) {
      query.where('device.organizationId = :organizationId', { organizationId });
    }

    const devices = await query.getMany();

    const byStatus: Record<string, number> = {};
    const bySensorCode: Record<string, number> = {};
    let active = 0;
    let connected = 0;

    for (const device of devices) {
      byStatus[device.status] = (byStatus[device.status] || 0) + 1;

      if (device.sensorCode) {
        bySensorCode[device.sensorCode] = (bySensorCode[device.sensorCode] || 0) + 1;
      }

      if (device.status === TenoviDeviceStatus.ACTIVE) active++;
      if (device.status === TenoviDeviceStatus.CONNECTED) connected++;
    }

    return {
      total: devices.length,
      active,
      connected,
      byStatus: byStatus as Record<TenoviDeviceStatus, number>,
      bySensorCode,
    };
  }

  // ==================== DEVICE MEASUREMENTS ====================

  async getDeviceMeasurements(
    hwiDeviceId: string,
    params?: { page?: number; limit?: number; startDate?: string; endDate?: string },
  ): Promise<TenoviPaginatedResponseDto<TenoviMeasurementWebhookDto>> {
    const response = await this.apiClient.get<TenoviPaginatedResponseDto<TenoviMeasurementWebhookDto>>(
      `/hwi-devices/${hwiDeviceId}/measurements/`,
      {
        params: {
          page: params?.page || 1,
          page_size: params?.limit || 20,
          start_date: params?.startDate,
          end_date: params?.endDate,
        },
      },
    );
    return response.data;
  }

  async getPatientMeasurements(
    patientExternalId: string,
    params?: { page?: number; limit?: number; startDate?: string; endDate?: string },
  ): Promise<TenoviPaginatedResponseDto<TenoviMeasurementWebhookDto>> {
    const response = await this.apiClient.get<TenoviPaginatedResponseDto<TenoviMeasurementWebhookDto>>(
      `/patients/${patientExternalId}/measurements/`,
      {
        params: {
          page: params?.page || 1,
          page_size: params?.limit || 20,
          start_date: params?.startDate,
          end_date: params?.endDate,
        },
      },
    );
    return response.data;
  }

  // ==================== HWI PATIENTS ====================

  async listHwiPatients(
    page = 1,
    limit = 20,
  ): Promise<TenoviPaginatedResponseDto<TenoviPatientDto>> {
    const response = await this.apiClient.get<TenoviPaginatedResponseDto<TenoviPatientDto>>(
      `/hwi-patients/`,
      { params: { page, page_size: limit } },
    );
    return response.data;
  }

  async getHwiPatient(externalId: string): Promise<TenoviPatientDto> {
    const response = await this.apiClient.get<TenoviPatientDto>(
      `/hwi-patients/${externalId}/`,
    );
    return response.data;
  }

  async createHwiPatient(dto: TenoviPatientDto): Promise<TenoviPatientDto> {
    const payload = {
      external_id: dto.external_id,
      name: dto.name,
      phone_number: dto.phone_number,
      email: dto.email,
      physician: dto.physician,
      clinic_name: dto.clinic_name,
      care_manager: dto.care_manager,
      sms_opt_in: dto.sms_opt_in,
    };
    const response = await this.apiClient.post<TenoviPatientDto>(`/hwi-patients/`, payload);
    return response.data;
  }

  async updateHwiPatient(externalId: string, dto: Partial<TenoviPatientDto>): Promise<TenoviPatientDto> {
    const response = await this.apiClient.patch<TenoviPatientDto>(
      `/hwi-patients/${externalId}/`,
      dto,
    );
    return response.data;
  }

  async deleteHwiPatient(externalId: string): Promise<void> {
    await this.apiClient.delete(`/hwi-patients/${externalId}/`);
  }

  // ==================== UNASSIGN DEVICE ====================

  async unassignHwiDeviceFromPatient(hwiDeviceId: string): Promise<TenoviHwiDevice> {
    const device = await this.findHwiDeviceByHwiId(hwiDeviceId);

    if (!device) {
      throw new NotFoundException(`Device ${hwiDeviceId} not found`);
    }

    const previousPatientId = device.patientId;
    device.patientId = null;
    device.tenoviPatientId = null;
    device.patientExternalId = null;
    device.patientName = null;
    device.patientEmail = null;
    device.patientPhoneNumber = null;

    const saved = await this.hwiDeviceRepository.save(device);

    await this.auditService.log({
      action: 'TENOVI_DEVICE_UNASSIGNED',
      userId: previousPatientId,
      resourceType: 'tenovi_hwi_device',
      resourceId: saved.id,
      details: { hwiDeviceId, previousPatientId },
    });

    return saved;
  }

  // ==================== LIST ALL GATEWAYS ====================

  async listAllGateways(
    page = 1,
    limit = 20,
  ): Promise<TenoviPaginatedResponseDto<TenoviGatewayDto>> {
    const response = await this.apiClient.get<TenoviPaginatedResponseDto<TenoviGatewayDto>>(
      `/hwi-gateways/`,
      { params: { page, page_size: limit } },
    );
    return response.data;
  }

  async getHwiGateway(gatewayUuid: string): Promise<TenoviGatewayDto> {
    const cleanUuid = gatewayUuid.replace(/-/g, '');
    const response = await this.apiClient.get<TenoviGatewayDto>(
      `/hwi-gateways/${cleanUuid}/`,
    );
    return response.data;
  }

  async unlinkGateway(gatewayId: string): Promise<void> {
    await this.apiClient.post(`/unlink-gateway/${gatewayId}/`);
    
    await this.auditService.log({
      action: 'TENOVI_GATEWAY_UNLINKED',
      resourceType: 'tenovi_gateway',
      resourceId: gatewayId,
    });
  }

  // ==================== DEVICE PROPERTIES ====================

  async getDeviceProperties(hwiDeviceId: string): Promise<any[]> {
    const response = await this.apiClient.get<any[]>(
      `/hwi-devices/${hwiDeviceId}/properties/`,
    );
    return response.data;
  }

  async getDeviceProperty(hwiDeviceId: string, propertyId: string): Promise<any> {
    const response = await this.apiClient.get<any>(
      `/hwi-devices/${hwiDeviceId}/properties/${propertyId}/`,
    );
    return response.data;
  }

  async updateDeviceProperty(hwiDeviceId: string, propertyId: string, value: string): Promise<any> {
    const response = await this.apiClient.patch<any>(
      `/hwi-devices/${hwiDeviceId}/properties/${propertyId}/`,
      { value },
    );
    return response.data;
  }

  // ==================== BULK ORDERS ====================

  async listBulkOrders(
    page = 1,
    limit = 20,
  ): Promise<TenoviPaginatedResponseDto<TenoviOrderDto>> {
    const response = await this.apiClient.get<TenoviPaginatedResponseDto<TenoviOrderDto>>(
      `/hwi-bulk-orders/`,
      { params: { page, page_size: limit } },
    );
    return response.data;
  }

  async getBulkOrder(orderId: string): Promise<TenoviOrderDto> {
    const response = await this.apiClient.get<TenoviOrderDto>(
      `/hwi-bulk-orders/${orderId}/`,
    );
    return response.data;
  }

  async createBulkOrder(dto: {
    shippingName: string;
    shippingAddress: string;
    shippingCity: string;
    shippingState: string;
    shippingZipCode: string;
    notifyEmails?: string;
    contents: Array<{ name: string; quantity: number }>;
  }): Promise<TenoviOrderDto> {
    const payload = {
      shipping_name: dto.shippingName,
      shipping_address: dto.shippingAddress,
      shipping_city: dto.shippingCity,
      shipping_state: dto.shippingState,
      shipping_zip_code: dto.shippingZipCode,
      notify_emails: dto.notifyEmails,
      contents: dto.contents,
    };
    const response = await this.apiClient.post<TenoviOrderDto>(`/hwi-bulk-orders/`, payload);
    
    await this.auditService.log({
      action: 'TENOVI_BULK_ORDER_CREATED',
      resourceType: 'tenovi_order',
      details: payload,
    });
    
    return response.data;
  }

  // ==================== DEVICE REPLACEMENTS ====================

  async listReplacements(
    page = 1,
    limit = 20,
  ): Promise<TenoviPaginatedResponseDto<TenoviHardwareChangeDto>> {
    const response = await this.apiClient.get<TenoviPaginatedResponseDto<TenoviHardwareChangeDto>>(
      `/hwi-replacements/`,
      { params: { page, page_size: limit } },
    );
    return response.data;
  }

  async getReplacement(replacementId: string): Promise<TenoviHardwareChangeDto> {
    const response = await this.apiClient.get<TenoviHardwareChangeDto>(
      `/hwi-replacements/${replacementId}/`,
    );
    return response.data;
  }

  async createReplacement(dto: {
    hwiDeviceId: string;
    newHardwareUuid: string;
    reason?: string;
  }): Promise<TenoviHardwareChangeDto> {
    const payload = {
      hwi_device_id: dto.hwiDeviceId,
      new_hardware_uuid: dto.newHardwareUuid,
      reason: dto.reason,
    };
    const response = await this.apiClient.post<TenoviHardwareChangeDto>(
      `/hwi-replacements/`,
      payload,
    );
    
    await this.auditService.log({
      action: 'TENOVI_DEVICE_REPLACEMENT_CREATED',
      resourceType: 'tenovi_hwi_device',
      resourceId: dto.hwiDeviceId,
      details: payload,
    });
    
    return response.data;
  }

  // ==================== WEBHOOK RESEND/TEST ====================

  async resendWebhooks(params: {
    webhookIds?: string[];
    startDate?: string;
    endDate?: string;
    hwiDeviceId?: string;
  }): Promise<{ resent: number }> {
    const payload = {
      webhook_ids: params.webhookIds,
      start_date: params.startDate,
      end_date: params.endDate,
      hwi_device_id: params.hwiDeviceId,
    };
    const response = await this.apiClient.post<{ resent: number }>(
      `/resend-webhooks/`,
      payload,
    );
    return response.data;
  }

  async testWebhooks(params: {
    webhookIds: string[];
    event: 'MEASUREMENT' | 'FULFILLMENT' | 'SPECIAL_ORDER';
  }): Promise<{ tested: number; results: any[] }> {
    const payload = {
      webhook_ids: params.webhookIds,
      event: params.event,
    };
    const response = await this.apiClient.post<{ tested: number; results: any[] }>(
      `/test-webhooks/`,
      payload,
    );
    return response.data;
  }

  // ==================== HARDWARE UUID LOGS ====================

  async getHardwareUuidLogs(
    params?: { page?: number; limit?: number; hwiDeviceId?: string },
  ): Promise<TenoviPaginatedResponseDto<TenoviHardwareChangeDto>> {
    const response = await this.apiClient.get<TenoviPaginatedResponseDto<TenoviHardwareChangeDto>>(
      `/hardware-uuid-logs/`,
      {
        params: {
          page: params?.page || 1,
          page_size: params?.limit || 20,
          hwi_device_id: params?.hwiDeviceId,
        },
      },
    );
    return response.data;
  }

  // ==================== LOCAL DATABASE OPERATIONS ====================

  async findAllLocalDevices(params?: {
    page?: number;
    limit?: number;
    status?: TenoviDeviceStatus;
    sensorCode?: string;
    organizationId?: string;
    patientId?: string;
    unassignedOnly?: boolean;
  }): Promise<{ data: TenoviHwiDevice[]; total: number; page: number; limit: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    const query = this.hwiDeviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.patient', 'patient')
      .leftJoinAndSelect('device.organization', 'organization');

    if (params?.status) {
      query.andWhere('device.status = :status', { status: params.status });
    }
    if (params?.sensorCode) {
      query.andWhere('device.sensorCode = :sensorCode', { sensorCode: params.sensorCode });
    }
    if (params?.organizationId) {
      query.andWhere('device.organizationId = :organizationId', { organizationId: params.organizationId });
    }
    if (params?.patientId) {
      query.andWhere('device.patientId = :patientId', { patientId: params.patientId });
    }
    if (params?.unassignedOnly) {
      query.andWhere('device.patientId IS NULL');
    }

    const [data, total] = await query
      .orderBy('device.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findAllLocalGateways(params?: {
    page?: number;
    limit?: number;
    organizationId?: string;
  }): Promise<{ data: TenoviGateway[]; total: number; page: number; limit: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    const query = this.gatewayRepository.createQueryBuilder('gateway')
      .leftJoinAndSelect('gateway.whitelistedDevices', 'whitelistedDevices')
      .leftJoinAndSelect('gateway.properties', 'properties')
      .leftJoinAndSelect('gateway.organization', 'organization');

    if (params?.organizationId) {
      query.andWhere('gateway.organizationId = :organizationId', { organizationId: params.organizationId });
    }

    const [data, total] = await query
      .orderBy('gateway.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }
}
