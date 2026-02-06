import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AIConversation } from './ai-conversation.entity';

export enum AIMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum AIMessageStatus {
  PENDING = 'pending',
  STREAMING = 'streaming',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped',
}

@Entity('ai_messages')
@Index(['conversationId', 'createdAt'])
@Index(['role'])
@Index(['status'])
@Index(['createdAt'])
export class AIMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => AIConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: AIConversation;

  @Column({
    type: 'enum',
    enum: AIMessageRole,
  })
  role: AIMessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: AIMessageStatus,
    default: AIMessageStatus.COMPLETED,
  })
  status: AIMessageStatus;

  // Token usage for this message
  @Column({ default: 0 })
  promptTokens: number;

  @Column({ default: 0 })
  completionTokens: number;

  @Column({ default: 0 })
  totalTokens: number;

  // Cost for this message
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  cost: number;

  // Model used
  @Column({ nullable: true })
  model: string;

  // Streaming metadata
  @Column({ type: 'timestamp', nullable: true })
  streamStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  streamCompletedAt: Date;

  @Column({ default: 0 })
  streamChunks: number;

  // Response time in milliseconds
  @Column({ type: 'int', nullable: true })
  responseTime: number;

  // Content safety and filtering
  @Column({ default: false })
  contentFiltered: boolean;

  @Column({ type: 'simple-array', nullable: true })
  contentFilterFlags: string[];

  @Column({ default: false })
  containsPHI: boolean;

  // Function calling (for structured outputs)
  @Column({ type: 'jsonb', nullable: true })
  functionCall: {
    name?: string;
    arguments?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  toolCalls: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;

  // Error tracking
  @Column({ type: 'text', nullable: true })
  error: string;

  @Column({ nullable: true })
  errorCode: string;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopReason?: string;
    finishReason?: string;
    citations?: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
    rating?: number;
    feedback?: string;
    regenerated?: boolean;
    editedAt?: Date;
    originalContent?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Helper methods
  calculateCost(
    promptTokenPrice: number,
    completionTokenPrice: number,
  ): number {
    const cost =
      (this.promptTokens * promptTokenPrice) / 1000 +
      (this.completionTokens * completionTokenPrice) / 1000;
    this.cost = parseFloat(cost.toFixed(6));
    return this.cost;
  }

  calculateResponseTime(): void {
    if (this.streamStartedAt && this.streamCompletedAt) {
      this.responseTime =
        this.streamCompletedAt.getTime() - this.streamStartedAt.getTime();
    } else if (this.createdAt && this.updatedAt) {
      this.responseTime =
        this.updatedAt.getTime() - this.createdAt.getTime();
    }
  }

  isComplete(): boolean {
    return this.status === AIMessageStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === AIMessageStatus.FAILED;
  }

  isStreaming(): boolean {
    return this.status === AIMessageStatus.STREAMING;
  }
}
