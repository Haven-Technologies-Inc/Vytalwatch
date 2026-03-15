import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum PHIAccessType {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  PRINT = 'print',
  SHARE = 'share',
}

export enum PHIResourceType {
  PATIENT_RECORD = 'patient_record',
  VITAL_READING = 'vital_reading',
  CLINICAL_NOTE = 'clinical_note',
  CLAIM = 'claim',
  MEDICATION = 'medication',
  DIAGNOSIS = 'diagnosis',
  INSURANCE = 'insurance',
  BILLING = 'billing',
  REPORT = 'report',
}

@Entity('phi_access_logs')
@Index(['userId', 'createdAt'])
@Index(['patientId', 'createdAt'])
@Index(['resourceType', 'createdAt'])
@Index(['accessType', 'createdAt'])
export class PHIAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  userRole: string;

  @Column('uuid', { nullable: true })
  patientId: string;

  @Column({ nullable: true })
  patientName: string;

  @Column({ type: 'enum', enum: PHIResourceType })
  resourceType: PHIResourceType;

  @Column('uuid', { nullable: true })
  resourceId: string;

  @Column({ type: 'enum', enum: PHIAccessType })
  accessType: PHIAccessType;

  @Column({ type: 'simple-array', nullable: true })
  fieldsAccessed: string[];

  @Column({ nullable: true })
  accessReason: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ default: false })
  emergencyAccess: boolean;

  @Column({ nullable: true })
  emergencyReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
