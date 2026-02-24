import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NoteType {
  PROGRESS = 'progress',
  SOAP = 'soap',
  ENCOUNTER = 'encounter',
  PHONE_CALL = 'phone_call',
  TELEHEALTH = 'telehealth',
  CARE_COORDINATION = 'care_coordination',
  MEDICATION_REVIEW = 'medication_review',
  VITAL_REVIEW = 'vital_review',
  ALERT_RESPONSE = 'alert_response',
  GENERAL = 'general',
}

export enum NoteStatus {
  DRAFT = 'draft',
  SIGNED = 'signed',
  AMENDED = 'amended',
  LOCKED = 'locked',
}

export interface SOAPContent {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface TimeTracking {
  startTime: Date;
  endTime?: Date;
  totalMinutes: number;
  billable: boolean;
  cptCode?: string;
}

@Entity('clinical_notes')
@Index(['patientId', 'createdAt'])
@Index(['providerId', 'createdAt'])
@Index(['type'])
@Index(['status'])
export class ClinicalNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column()
  providerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'providerId' })
  provider: User;

  @Column({ type: 'enum', enum: NoteType, default: NoteType.PROGRESS })
  type: NoteType;

  @Column({ type: 'enum', enum: NoteStatus, default: NoteStatus.DRAFT })
  status: NoteStatus;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  soapContent: SOAPContent;

  @Column({ type: 'jsonb', nullable: true })
  timeTracking: TimeTracking;

  @Column({ type: 'jsonb', nullable: true })
  vitalReadingIds: string[];

  @Column({ type: 'jsonb', nullable: true })
  alertIds: string[];

  @Column({ type: 'jsonb', nullable: true })
  attachments: { name: string; url: string; type: string }[];

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'timestamp', nullable: true })
  signedAt: Date;

  @Column({ nullable: true })
  signedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'signedBy' })
  signer: User;

  @Column({ nullable: true })
  amendedFrom: string;

  @Column({ type: 'text', nullable: true })
  amendmentReason: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('communication_logs')
@Index(['patientId', 'createdAt'])
@Index(['providerId', 'createdAt'])
export class CommunicationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column()
  providerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'providerId' })
  provider: User;

  @Column({ type: 'enum', enum: ['call', 'message', 'video', 'email', 'sms', 'alert'] })
  type: 'call' | 'message' | 'video' | 'email' | 'sms' | 'alert';

  @Column({ type: 'enum', enum: ['inbound', 'outbound'] })
  direction: 'inbound' | 'outbound';

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ default: 0 })
  durationMinutes: number;

  @Column({ type: 'enum', enum: ['completed', 'missed', 'voicemail', 'no_answer'], default: 'completed' })
  outcome: 'completed' | 'missed' | 'voicemail' | 'no_answer';

  @Column({ nullable: true })
  relatedNoteId: string;

  @ManyToOne(() => ClinicalNote, { nullable: true })
  @JoinColumn({ name: 'relatedNoteId' })
  relatedNote: ClinicalNote;

  @Column({ nullable: true })
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;
}
