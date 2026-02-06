import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export enum TokenStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  INVALID = 'invalid',
  DISABLED = 'disabled',
}

@Entity('device_tokens')
@Index(['userId', 'enabled'])
@Index(['token'], { unique: true })
@Index(['platform', 'enabled'])
@Index(['expiresAt'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  platform: DevicePlatform;

  @Column({ type: 'enum', enum: TokenStatus, default: TokenStatus.ACTIVE })
  status: TokenStatus;

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: {
    deviceId?: string;
    deviceName?: string;
    model?: string;
    osVersion?: string;
    appVersion?: string;
    manufacturer?: string;
    locale?: string;
    timezone?: string;
  };

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastFailureAt: Date;

  @Column({ nullable: true })
  lastErrorMessage: string;

  // Badge count for iOS
  @Column({ default: 0 })
  badgeCount: number;

  // User preferences for this device
  @Column({ type: 'jsonb', default: {} })
  preferences: {
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
    mutedCategories?: string[];
    quietHoursStart?: string; // HH:mm format
    quietHoursEnd?: string; // HH:mm format
    quietHoursTimezone?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Methods
  isValid(): boolean {
    if (!this.enabled || this.status !== TokenStatus.ACTIVE) {
      return false;
    }

    if (this.expiresAt && this.expiresAt < new Date()) {
      return false;
    }

    // Disable token after 5 consecutive failures
    if (this.failureCount >= 5) {
      return false;
    }

    return true;
  }

  isInQuietHours(): boolean {
    if (!this.preferences?.quietHoursStart || !this.preferences?.quietHoursEnd) {
      return false;
    }

    const timezone = this.preferences.quietHoursTimezone || 'UTC';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const currentTime = formatter.format(now);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = this.preferences.quietHoursStart.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = this.preferences.quietHoursEnd.split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Quiet hours span midnight
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  shouldReceiveNotification(category: string, priority: string): boolean {
    if (!this.isValid()) {
      return false;
    }

    // Always send critical notifications
    if (priority === 'critical') {
      return true;
    }

    // Check if category is muted
    if (this.preferences?.mutedCategories?.includes(category)) {
      return false;
    }

    // Check quiet hours for non-critical notifications
    if (this.isInQuietHours() && priority !== 'high') {
      return false;
    }

    return true;
  }

  recordSuccess(): void {
    this.lastUsedAt = new Date();
    this.failureCount = 0;
    this.lastFailureAt = null;
    this.lastErrorMessage = null;
  }

  recordFailure(errorMessage: string): void {
    this.failureCount += 1;
    this.lastFailureAt = new Date();
    this.lastErrorMessage = errorMessage;

    // Disable token after 5 consecutive failures
    if (this.failureCount >= 5) {
      this.enabled = false;
      this.status = TokenStatus.INVALID;
    }
  }

  incrementBadge(): void {
    this.badgeCount += 1;
  }

  resetBadge(): void {
    this.badgeCount = 0;
  }
}
