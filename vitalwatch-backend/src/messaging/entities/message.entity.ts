import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  // Encrypted content (AES-256-GCM)
  @Column({ type: 'text' })
  encryptedContent: string;

  // Initialization vector for encryption
  @Column({ nullable: true })
  iv: string;

  // Authentication tag for encryption
  @Column({ nullable: true })
  authTag: string;

  // Plain text content for system messages (not encrypted)
  @Column({ type: 'text', nullable: true })
  plainContent: string;

  // File attachments
  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    encryptedUrl: string;
    thumbnailUrl?: string;
    scannedForVirus: boolean;
    virusScanResult?: string;
    virusScanAt?: Date;
  }>;

  // Reply to another message
  @Column({ nullable: true })
  replyToMessageId: string;

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'replyToMessageId' })
  replyToMessage: Message;

  // Message metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    edited?: boolean;
    editedAt?: Date;
    deleted?: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    reactions?: {
      userId: string;
      emoji: string;
      timestamp: Date;
    }[];
    mentions?: string[]; // Array of user IDs mentioned in message
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    expiresAt?: Date; // For self-destructing messages
  };

  // Read receipts
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  // Audit trail
  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Helper methods
  isDeleted(): boolean {
    return this.metadata?.deleted === true || this.deletedAt !== null;
  }

  isEdited(): boolean {
    return this.metadata?.edited === true;
  }

  isExpired(): boolean {
    if (!this.metadata?.expiresAt) {
      return false;
    }
    return new Date() > new Date(this.metadata.expiresAt);
  }

  canBeDeletedBy(userId: string): boolean {
    return this.senderId === userId;
  }

  canBeEditedBy(userId: string): boolean {
    // Can only edit text messages within 15 minutes
    if (this.type !== MessageType.TEXT || this.senderId !== userId) {
      return false;
    }
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(this.createdAt) > fifteenMinutesAgo;
  }
}
