import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TimeEntryCategory {
  MONITORING = 'monitoring',
  OUTREACH = 'outreach',
  DOCUMENTATION = 'documentation',
  CARE_COORDINATION = 'care_coordination',
  EDUCATION = 'education',
}

export enum TimeEntrySource {
  MANUAL = 'manual',
  ASSISTED = 'assisted',
  SYSTEM = 'system',
}

export enum TimeEntryStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  BILLED = 'billed',
}

@Entity('time_entries')
@Index(['patientId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patientId: string;

  @Column('uuid')
  userId: string;

  @Column('uuid', { nullable: true })
  enrollmentId: string;

  @Column({ nullable: true })
  programType: string;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endAt: Date;

  @Column({ type: 'int', default: 0 })
  minutes: number;

  @Column({ type: 'enum', enum: TimeEntryCategory })
  category: TimeEntryCategory;

  @Column({ type: 'enum', enum: TimeEntrySource, default: TimeEntrySource.MANUAL })
  source: TimeEntrySource;

  @Column('uuid', { nullable: true })
  taskId: string;

  @Column('uuid', { nullable: true })
  communicationLogId: string;

  @Column('uuid', { nullable: true })
  noteId: string;

  @Column('simple-array', { nullable: true })
  evidenceRefs: string[];

  @Column({ default: true })
  billable: boolean;

  @Column({ nullable: true })
  cptCode: string;

  @Column({ type: 'enum', enum: TimeEntryStatus, default: TimeEntryStatus.DRAFT })
  status: TimeEntryStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
