import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ProgramType {
  BP = 'BP',
  GLUCOSE = 'GLUCOSE',
}

export enum EnrollmentStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('enrollments')
@Index(['patientId', 'programType'])
@Index(['clinicId', 'status'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patientId: string;

  @Column('uuid')
  clinicId: string;

  @Column({ type: 'enum', enum: ProgramType })
  programType: ProgramType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE })
  status: EnrollmentStatus;

  @Column('uuid')
  orderingProviderId: string;

  @Column('uuid', { nullable: true })
  supervisingProviderId: string;

  @Column({ type: 'date' })
  currentBillingPeriodStart: Date;

  @Column({ type: 'date' })
  currentBillingPeriodEnd: Date;

  @Column({ default: false })
  setupCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  setupCompletedAt: Date;

  @Column('uuid', { nullable: true })
  setupNoteId: string;

  @Column('uuid', { nullable: true })
  deviceId: string;

  @Column('simple-array', { nullable: true })
  diagnosisCodes: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
