import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AIDraftType {
  MONTHLY_NOTE = 'monthly_note',
  CALL_SCRIPT = 'call_script',
  RISK_SUMMARY = 'risk_summary',
  CLAIM_JUSTIFICATION = 'claim_justification',
  TRIAGE_SUMMARY = 'triage_summary',
}

export enum AIDraftStatus {
  DRAFT = 'draft',
  REVIEWED = 'reviewed',
  ACCEPTED = 'accepted',
  DISCARDED = 'discarded',
}

@Entity('ai_drafts')
@Index(['patientId', 'draftType'])
@Index(['status'])
export class AIDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patientId: string;

  @Column('uuid', { nullable: true })
  enrollmentId: string;

  @Column({ nullable: true })
  programType: string;

  @Column({ type: 'enum', enum: AIDraftType })
  draftType: AIDraftType;

  @Column()
  promptVersion: string;

  @Column()
  modelVersion: string;

  @Column({ type: 'jsonb', nullable: true })
  inputRefs: {
    readingIds?: string[];
    alertIds?: string[];
    communicationLogIds?: string[];
    periodStart?: string;
    periodEnd?: string;
  };

  @Column({ type: 'text' })
  outputText: string;

  @Column({ type: 'enum', enum: AIDraftStatus, default: AIDraftStatus.DRAFT })
  status: AIDraftStatus;

  @Column('uuid', { nullable: true })
  reviewedByUserId: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column('uuid', { nullable: true })
  usedInNoteId: string;

  @CreateDateColumn()
  createdAt: Date;
}
