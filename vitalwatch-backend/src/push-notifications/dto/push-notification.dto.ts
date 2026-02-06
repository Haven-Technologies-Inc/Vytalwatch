import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DevicePlatform } from '../entities/device-token.entity';
import { NotificationPriority } from '../templates/notification-templates';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsOptional()
  @IsObject()
  deviceInfo?: {
    deviceId?: string;
    deviceName?: string;
    model?: string;
    osVersion?: string;
    appVersion?: string;
    manufacturer?: string;
    locale?: string;
    timezone?: string;
  };

  @IsOptional()
  @IsObject()
  preferences?: {
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
    mutedCategories?: string[];
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursTimezone?: string;
  };
}

export class UnregisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  sound?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  deepLink?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;

  @IsOptional()
  @IsNumber()
  badge?: number;
}

export class SendBatchNotificationDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  sound?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  deepLink?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class SendTopicNotificationDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  sound?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  deepLink?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class ScheduleNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsDateString()
  scheduledFor: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  sound?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  deepLink?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class TestNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class UpdateDevicePreferencesDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  preferences?: {
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
    mutedCategories?: string[];
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursTimezone?: string;
  };
}

export class UpdateBadgeCountDto {
  @IsNumber()
  @Min(0)
  badgeCount: number;
}

export class IncrementBadgeDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  increment?: number;
}

export class SubscribeToTopicDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deviceIds?: string[];
}

export class UnsubscribeFromTopicDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deviceIds?: string[];
}

export class GetHistoryQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GetDevicesQueryDto {
  @IsOptional()
  @IsEnum(DevicePlatform)
  platform?: DevicePlatform;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enabledOnly?: boolean;
}
