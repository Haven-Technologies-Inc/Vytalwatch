import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsDateString,
  IsUUID,
  IsEmail,
  IsUrl,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums based on Tenovi API
export enum TenoviShippingStatus {
  DRAFT = 'DR',
  REQUESTED = 'RQ',
  PENDING = 'PE',
  CREATED = 'CR',
  ON_HOLD = 'OH',
  READY_TO_SHIP = 'RS',
  SHIPPED = 'SH',
  DELIVERED = 'DE',
  RETURNED = 'RE',
  CANCELLED = 'CA',
}

export enum TenoviWhitelistStatus {
  REGISTERED = 'RE',
  CONFIRMED = 'CO',
  PENDING = 'PE',
  REMOVED = 'RM',
}

export enum TenoviStockType {
  STANDARD = 'ST',
  CUSTOM = 'CU',
}

export enum TenoviMetricType {
  PHYSICAL = 'PH',
  CALCULATED = 'CA',
}

export enum TenoviWebhookEvent {
  MEASUREMENT = 'MEASUREMENT',
  FULFILLMENT = 'FULFILLMENT',
  SPECIAL_ORDER = 'SPECIAL_ORDER',
}

// Special Order Webhook DTO (for supply shipments)
export class TenoviSpecialOrderWebhookDto {
  @IsString()
  @IsOptional()
  order_id?: string;

  @IsString()
  @IsOptional()
  order_number?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  shipping_status?: string;

  @IsString()
  @IsOptional()
  tracking_number?: string;

  @IsString()
  @IsOptional()
  carrier?: string;

  @IsString()
  @IsOptional()
  shipping_name?: string;

  @IsString()
  @IsOptional()
  shipping_address?: string;

  @IsString()
  @IsOptional()
  shipping_city?: string;

  @IsString()
  @IsOptional()
  shipping_state?: string;

  @IsString()
  @IsOptional()
  shipping_zip_code?: string;

  @IsDateString()
  @IsOptional()
  shipped_at?: string;

  @IsDateString()
  @IsOptional()
  delivered_at?: string;

  @IsDateString()
  @IsOptional()
  created?: string;

  @IsArray()
  @IsOptional()
  contents?: Array<{
    name: string;
    quantity: number;
    sku?: string;
  }>;

  @IsString()
  @IsOptional()
  client_notes?: string;

  @IsString()
  @IsOptional()
  notify_emails?: string;
}

// Gateway DTOs
export class TenoviWhitelistedDeviceDto {
  @IsString()
  sensor_code: string;

  @IsString()
  mac_address: string;

  @IsEnum(TenoviWhitelistStatus)
  @IsOptional()
  whitelist_status?: TenoviWhitelistStatus;

  @IsDateString()
  @IsOptional()
  created?: string;

  @IsDateString()
  @IsOptional()
  modified?: string;
}

export class TenoviGatewayPropertyDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  key: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsBoolean()
  @IsOptional()
  synced?: boolean;

  @IsBoolean()
  @IsOptional()
  handle_property?: boolean;
}

export class TenoviGatewayDto {
  @IsString()
  gateway_uuid: string;

  @IsString()
  @IsOptional()
  firmware_version?: string;

  @IsString()
  @IsOptional()
  bootloader_version?: string;

  @IsBoolean()
  @IsOptional()
  provisioned?: boolean;

  @IsNumber()
  @IsOptional()
  last_signal_strength?: number;

  @IsDateString()
  @IsOptional()
  last_checkin_time?: string;

  @IsDateString()
  @IsOptional()
  assigned_on?: string;

  @IsDateString()
  @IsOptional()
  shipped_on?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenoviWhitelistedDeviceDto)
  @IsOptional()
  whitelisted_devices?: TenoviWhitelistedDeviceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenoviGatewayPropertyDto)
  @IsOptional()
  properties?: TenoviGatewayPropertyDto[];
}

// Patient DTOs
export class TenoviPatientDto {
  @IsString()
  @IsOptional()
  external_id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  physician?: string;

  @IsString()
  @IsOptional()
  clinic_name?: string;

  @IsString()
  @IsOptional()
  care_manager?: string;

  @IsBoolean()
  @IsOptional()
  sms_opt_in?: boolean;
}

// Fulfillment Request DTOs
export class TenoviFulfillmentRequestDto {
  @IsDateString()
  @IsOptional()
  created?: string;

  @IsEnum(TenoviShippingStatus)
  @IsOptional()
  shipping_status?: TenoviShippingStatus;

  @IsString()
  @IsOptional()
  shipping_name?: string;

  @IsString()
  @IsOptional()
  shipping_address?: string;

  @IsString()
  @IsOptional()
  shipping_city?: string;

  @IsString()
  @IsOptional()
  shipping_state?: string;

  @IsString()
  @IsOptional()
  shipping_zip_code?: string;

  @IsString()
  @IsOptional()
  shipped_on_behalf_of?: string;

  @IsUrl()
  @IsOptional()
  shipping_tracking_link?: string;

  @IsBoolean()
  @IsOptional()
  ship_gateway_only?: boolean;

  @IsBoolean()
  @IsOptional()
  require_signature?: boolean;

  @IsDateString()
  @IsOptional()
  shipped_on?: string;

  @IsDateString()
  @IsOptional()
  delivered_on?: string;

  @IsString()
  @IsOptional()
  requested_by?: string;

  @IsString()
  @IsOptional()
  client_notes?: string;

  @IsString()
  @IsOptional()
  notify_emails?: string;

  @IsBoolean()
  @IsOptional()
  fulfilled?: boolean;

  @IsBoolean()
  @IsOptional()
  client_will_fulfill?: boolean;

  @IsBoolean()
  @IsOptional()
  flagged_by_client?: boolean;

  @IsString()
  @IsOptional()
  invalid_address?: string;

  @IsBoolean()
  @IsOptional()
  duplicate_device_at_address?: boolean;
}

// Device DTOs
export class TenoviDeviceDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @ValidateNested()
  @Type(() => TenoviFulfillmentRequestDto)
  @IsOptional()
  fulfillment_request?: TenoviFulfillmentRequestDto;

  @IsDateString()
  @IsOptional()
  created?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  hardware_uuid?: string;

  @IsString()
  @IsOptional()
  sensor_code?: string;

  @IsString()
  @IsOptional()
  sensor_id?: string;

  @IsUUID()
  @IsOptional()
  device_type?: string;

  @IsBoolean()
  @IsOptional()
  shared_hardware_uuid?: boolean;

  @IsString()
  @IsOptional()
  model_number?: string;
}

// HWI Device (Patient Device) DTOs
export class TenoviHwiDeviceDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  hwi_device_id?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  connected_on?: string;

  @IsDateString()
  @IsOptional()
  unlinked_on?: string;

  @IsDateString()
  @IsOptional()
  last_measurement?: string;

  @ValidateNested()
  @Type(() => TenoviDeviceDto)
  @IsOptional()
  device?: TenoviDeviceDto;

  @IsString()
  @IsOptional()
  patient_id?: string;

  @IsString()
  @IsOptional()
  patient_phone_number?: string;

  @ValidateNested()
  @Type(() => TenoviPatientDto)
  @IsOptional()
  patient?: TenoviPatientDto;
}

// Device Type Metric DTOs
export class TenoviDeviceTypeMetricDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  primary_units?: string;

  @IsString()
  @IsOptional()
  primary_display_name?: string;

  @IsString()
  @IsOptional()
  secondary_units?: string;

  @IsString()
  @IsOptional()
  secondary_display_name?: string;

  @IsString()
  @IsOptional()
  unified_display_name?: string;

  @IsEnum(TenoviMetricType)
  @IsOptional()
  type?: TenoviMetricType;
}

// Device Type DTOs
export class TenoviDeviceTypeDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  client_sku?: string;

  @IsEnum(TenoviStockType)
  @IsOptional()
  stock_type?: TenoviStockType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenoviDeviceTypeMetricDto)
  @IsOptional()
  metrics?: TenoviDeviceTypeMetricDto[];

  @IsString()
  @IsOptional()
  sensor_code?: string;

  @IsUrl()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  up_front_cost?: string;

  @IsString()
  @IsOptional()
  shipping_cost?: string;

  @IsString()
  @IsOptional()
  monthly_cost?: string;

  @IsBoolean()
  @IsOptional()
  sensor_id_required?: boolean;

  @IsBoolean()
  @IsOptional()
  in_stock?: boolean;

  @IsBoolean()
  @IsOptional()
  virtual?: boolean;

  @IsBoolean()
  @IsOptional()
  deprecated?: boolean;
}

// Measurement DTOs (Webhook payload)
export class TenoviMeasurementWebhookDto {
  @IsString()
  metric: string;

  @IsString()
  @IsOptional()
  device_name?: string;

  @IsString()
  @IsOptional()
  hwi_device_id?: string;

  @IsString()
  @IsOptional()
  patient_id?: string;

  @IsString()
  @IsOptional()
  hardware_uuid?: string;

  @IsString()
  @IsOptional()
  sensor_code?: string;

  @IsString()
  @IsOptional()
  value_1?: string;

  @IsString()
  @IsOptional()
  value_2?: string;

  @IsDateString()
  @IsOptional()
  created?: string;

  @IsDateString()
  @IsOptional()
  timestamp?: string;

  @IsInt()
  @IsOptional()
  timezone_offset?: number;

  @IsBoolean()
  @IsOptional()
  estimated_timestamp?: boolean;

  @IsOptional()
  filter_params?: Record<string, any>;
}

// Order DTOs
export class TenoviOrderContentDto {
  @IsString()
  name: string;

  @IsInt()
  quantity: number;

  @IsInt()
  @IsOptional()
  kit_id?: number;
}

export class TenoviOrderManifestItemDto {
  @IsString()
  @IsOptional()
  order_section?: string;

  @IsArray()
  @IsOptional()
  kitted_items?: Record<string, any>[];

  @IsArray()
  @IsOptional()
  loose_items?: Record<string, any>[];
}

export class TenoviOrderDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsDateString()
  @IsOptional()
  created?: string;

  @IsDateString()
  @IsOptional()
  modified?: string;

  @IsString()
  @IsOptional()
  order_number?: string;

  @IsString()
  @IsOptional()
  shipping_name?: string;

  @IsString()
  @IsOptional()
  shipping_address?: string;

  @IsString()
  @IsOptional()
  shipping_city?: string;

  @IsString()
  @IsOptional()
  shipping_state?: string;

  @IsString()
  @IsOptional()
  shipping_zip_code?: string;

  @IsEnum(TenoviShippingStatus)
  @IsOptional()
  shipping_status?: TenoviShippingStatus;

  @IsUrl()
  @IsOptional()
  shipping_tracking_link?: string;

  @IsBoolean()
  @IsOptional()
  fulfilled?: boolean;

  @IsString()
  @IsOptional()
  requested_by?: string;

  @IsDateString()
  @IsOptional()
  shipped_on?: string;

  @IsDateString()
  @IsOptional()
  delivered_on?: string;

  @IsString()
  @IsOptional()
  notify_emails?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenoviOrderContentDto)
  @IsOptional()
  contents?: TenoviOrderContentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenoviOrderManifestItemDto)
  @IsOptional()
  manifest?: TenoviOrderManifestItemDto[];
}

// Hardware Change DTOs
export class TenoviHardwareChangeDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsDateString()
  @IsOptional()
  created?: string;

  @IsDateString()
  @IsOptional()
  modified?: string;

  @IsString()
  @IsOptional()
  object_id?: string;

  @IsString()
  @IsOptional()
  device_name?: string;

  @IsString()
  @IsOptional()
  old_hardware_uuid?: string;

  @IsString()
  @IsOptional()
  new_hardware_uuid?: string;

  @IsString()
  @IsOptional()
  changer?: string;
}

// Paginated Response DTO
export class TenoviPaginatedResponseDto<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Webhook Configuration DTOs
export class TenoviWebhookConfigDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsDateString()
  @IsOptional()
  created?: string;

  @IsDateString()
  @IsOptional()
  modified?: string;

  @IsUrl()
  endpoint: string;

  @IsString()
  @IsOptional()
  auth_header?: string;

  @IsString()
  @IsOptional()
  auth_key?: string;

  @IsEnum(TenoviWebhookEvent)
  @IsOptional()
  event?: TenoviWebhookEvent;

  @IsBoolean()
  @IsOptional()
  post_as_array?: boolean;

  @IsBoolean()
  @IsOptional()
  enabled_by_default?: boolean;
}

// Request DTOs for our API
export class RegisterTenoviGatewayDto {
  @IsString()
  gatewayUuid: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  patientId?: string;
}

export class AssignTenoviDeviceDto {
  @IsString()
  hwiDeviceId: string;

  @IsString()
  patientId: string;

  @IsString()
  @IsOptional()
  patientPhoneNumber?: string;

  @ValidateNested()
  @Type(() => TenoviPatientDto)
  @IsOptional()
  patient?: TenoviPatientDto;
}

export class CreateTenoviFulfillmentDto {
  @IsString()
  @IsOptional()
  shippingName?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  shippingCity?: string;

  @IsString()
  @IsOptional()
  shippingState?: string;

  @IsString()
  @IsOptional()
  shippingZipCode?: string;

  @IsString()
  @IsOptional()
  notifyEmails?: string;

  @IsBoolean()
  @IsOptional()
  requireSignature?: boolean;

  @IsBoolean()
  @IsOptional()
  shipGatewayOnly?: boolean;

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsArray()
  @IsOptional()
  deviceTypes?: string[];
}

export class WhitelistDeviceDto {
  @IsString()
  sensorCode: string;

  @IsString()
  @IsOptional()
  macAddress?: string;

  @IsString()
  @IsOptional()
  sensorId?: string;
}

export class TenoviApiResponseDto<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
