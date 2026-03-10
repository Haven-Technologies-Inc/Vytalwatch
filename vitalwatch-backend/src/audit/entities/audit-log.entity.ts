import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  USER_REGISTERED = 'USER_REGISTERED',
  OAUTH_REGISTRATION = 'OAUTH_REGISTRATION',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_ACTIVATED = 'USER_ACTIVATED',

  // Patient Management
  PATIENT_ASSIGNED = 'PATIENT_ASSIGNED',
  PATIENT_UNASSIGNED = 'PATIENT_UNASSIGNED',

  // Vitals
  VITAL_RECORDED = 'VITAL_RECORDED',
  VITAL_UPDATED = 'VITAL_UPDATED',
  VITAL_DELETED = 'VITAL_DELETED',

  // Alerts
  ALERT_CREATED = 'ALERT_CREATED',
  ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
  ALERT_RESOLVED = 'ALERT_RESOLVED',
  ALERT_ESCALATED = 'ALERT_ESCALATED',

  // Billing
  INVOICE_CREATED = 'INVOICE_CREATED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',

  // Device
  DEVICE_REGISTERED = 'DEVICE_REGISTERED',
  DEVICE_UNREGISTERED = 'DEVICE_UNREGISTERED',
  DEVICE_DATA_RECEIVED = 'DEVICE_DATA_RECEIVED',

  // System
  API_ACCESS = 'API_ACCESS',
  EXPORT_DATA = 'EXPORT_DATA',
  IMPORT_DATA = 'IMPORT_DATA',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['resource', 'resourceId'])
export class AuditLog {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ type: 'varchar', length: 100 })
  @Index()
  action: string;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  resource: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  oldData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newData: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  actionById: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
