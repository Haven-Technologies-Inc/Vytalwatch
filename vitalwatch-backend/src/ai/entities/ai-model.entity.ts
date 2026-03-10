import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AIModelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRAINING = 'training',
  FAILED = 'failed',
}

export enum AIModelType {
  RISK_PREDICTION = 'risk_prediction',
  VITAL_ANALYSIS = 'vital_analysis',
  ALERT_CLASSIFICATION = 'alert_classification',
  PATIENT_INSIGHT = 'patient_insight',
  CUSTOM = 'custom',
}

@Entity('ai_models')
export class AIModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AIModelType, default: AIModelType.CUSTOM })
  type: AIModelType;

  @Column({ default: '1.0.0' })
  version: string;

  @Column({ type: 'enum', enum: AIModelStatus, default: AIModelStatus.INACTIVE })
  status: AIModelStatus;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  accuracy: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  precision: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  recall: number | null;

  @Column({ name: 'f1_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  f1Score: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  auc: number | null;

  @Column({ name: 'total_predictions', type: 'int', default: 0 })
  totalPredictions: number;

  @Column({ name: 'last_trained_at', type: 'timestamptz', nullable: true })
  lastTrainedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any> | null;

  @Column({ name: 'training_history', type: 'jsonb', nullable: true })
  trainingHistory: Array<{ version: string; date: string; accuracy: number }> | null;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
