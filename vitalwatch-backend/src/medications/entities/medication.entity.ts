import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MedicationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  DISCONTINUED = 'discontinued',
}

export enum MedicationFrequency {
  ONCE_DAILY = 'once_daily',
  TWICE_DAILY = 'twice_daily',
  THREE_TIMES_DAILY = 'three_times_daily',
  FOUR_TIMES_DAILY = 'four_times_daily',
  EVERY_OTHER_DAY = 'every_other_day',
  WEEKLY = 'weekly',
  AS_NEEDED = 'as_needed',
  CUSTOM = 'custom',
}

@Entity('medications')
@Index(['patientId', 'status'])
export class Medication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column()
  name: string;

  @Column()
  dosage: string;

  @Column({ type: 'enum', enum: MedicationFrequency, default: MedicationFrequency.ONCE_DAILY })
  frequency: MedicationFrequency;

  @Column({ type: 'jsonb', nullable: true })
  schedule: { time: string; taken?: boolean; takenAt?: Date }[];

  @Column({ type: 'enum', enum: MedicationStatus, default: MedicationStatus.ACTIVE })
  @Index()
  status: MedicationStatus;

  @Column({ nullable: true })
  prescribedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'prescribedBy' })
  prescriber: User;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  refillDate: Date;

  @Column({ default: 0 })
  refillsRemaining: number;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  sideEffects: string[];

  @Column({ type: 'jsonb', nullable: true })
  interactions: string[];

  @Column({ nullable: true })
  pharmacy: string;

  @Column({ nullable: true })
  rxNumber: string;

  @Column({ nullable: true })
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

@Entity('medication_logs')
export class MedicationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  medicationId: string;

  @ManyToOne(() => Medication)
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @Column()
  patientId: string;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  takenAt: Date;

  @Column({ default: false })
  taken: boolean;

  @Column({ default: false })
  skipped: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
