import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AIMessage } from './ai-message.entity';

export enum AIConversationType {
  GENERAL_CHAT = 'general_chat',
  VITAL_ANALYSIS = 'vital_analysis',
  PATIENT_INSIGHT = 'patient_insight',
  HEALTH_SUMMARY = 'health_summary',
  ALERT_RECOMMENDATION = 'alert_recommendation',
  CLINICAL_DECISION = 'clinical_decision',
}

@Entity('ai_conversations')
@Index(['userId', 'createdAt'])
@Index(['type'])
@Index(['createdAt'])
@Index(['updatedAt'])
export class AIConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 500 })
  title: string;

  @Column({
    type: 'enum',
    enum: AIConversationType,
    default: AIConversationType.GENERAL_CHAT,
  })
  type: AIConversationType;

  @Column({ type: 'text', nullable: true })
  context: string;

  @OneToMany(() => AIMessage, (message) => message.conversation, {
    cascade: true,
  })
  messages: AIMessage[];

  @Column({ default: 0 })
  messageCount: number;

  @Column({ default: 0 })
  totalTokens: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  totalCost: number;

  @Column({ nullable: true })
  lastMessageId: string;

  @Column({ type: 'text', nullable: true })
  lastMessagePreview: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  // Model used for this conversation
  @Column({ default: 'gpt-4' })
  model: string;

  // System prompt used for this conversation
  @Column({ type: 'text', nullable: true })
  systemPrompt: string;

  // Conversation summary (generated periodically for long conversations)
  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'timestamp', nullable: true })
  summarizedAt: Date;

  // Tags for categorization
  @Column('simple-array', { nullable: true })
  tags: string[];

  // Associated entities
  @Column({ nullable: true })
  patientId: string;

  @Column({ nullable: true })
  providerId: string;

  @Column({ nullable: true })
  vitalReadingId: string;

  @Column({ nullable: true })
  alertId: string;

  // Sharing settings
  @Column({ default: false })
  sharedWithProvider: boolean;

  @Column({ type: 'simple-array', nullable: true })
  sharedWithUserIds: string[];

  // Privacy and compliance
  @Column({ default: false })
  containsPHI: boolean;

  @Column({ default: false })
  hipaaCompliant: boolean;

  @Column({ default: false })
  contentFiltered: boolean;

  // Archival
  @Column({ default: false })
  archived: boolean;

  @Column({ default: false })
  pinned: boolean;

  // Conversation settings
  @Column({ type: 'jsonb', nullable: true })
  settings: {
    temperature?: number;
    maxTokens?: number;
    streamingEnabled?: boolean;
    contextWindowSize?: number;
  };

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: 'web' | 'mobile' | 'api';
    userAgent?: string;
    ipAddress?: string;
    exportedAt?: Date;
    exportFormat?: string;
    rating?: number;
    feedback?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Helper methods
  getContextWindow(windowSize: number = 20): number {
    return Math.min(this.messageCount, windowSize);
  }

  shouldSummarize(threshold: number = 50): boolean {
    return this.messageCount >= threshold && (!this.summary || this.messageCount - this.summarizedAt.getTime() > 20);
  }

  addToTotalCost(cost: number): void {
    this.totalCost = parseFloat((parseFloat(this.totalCost.toString()) + cost).toFixed(6));
  }

  addToTotalTokens(tokens: number): void {
    this.totalTokens += tokens;
  }

  incrementMessageCount(): void {
    this.messageCount++;
  }
}
