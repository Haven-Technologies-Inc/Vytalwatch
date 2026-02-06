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
import { Message } from './message.entity';

@Entity('conversations')
@Index(['patientId', 'providerId'])
@Index(['createdAt'])
@Index(['updatedAt'])
export class Conversation {
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

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @Column({ nullable: true })
  lastMessageId: string;

  @Column({ type: 'text', nullable: true })
  lastMessagePreview: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ default: 0 })
  patientUnreadCount: number;

  @Column({ default: 0 })
  providerUnreadCount: number;

  @Column({ default: false })
  patientArchived: boolean;

  @Column({ default: false })
  providerArchived: boolean;

  @Column({ default: false })
  patientMuted: boolean;

  @Column({ default: false })
  providerMuted: boolean;

  // Encryption key reference (stored separately in secure key management system)
  @Column({ nullable: true })
  encryptionKeyId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    patientTyping?: boolean;
    providerTyping?: boolean;
    tags?: string[];
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    subject?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  // Helper method to get unread count for a specific user
  getUnreadCount(userId: string): number {
    if (userId === this.patientId) {
      return this.patientUnreadCount;
    } else if (userId === this.providerId) {
      return this.providerUnreadCount;
    }
    return 0;
  }

  // Helper method to check if conversation is archived for a specific user
  isArchivedFor(userId: string): boolean {
    if (userId === this.patientId) {
      return this.patientArchived;
    } else if (userId === this.providerId) {
      return this.providerArchived;
    }
    return false;
  }

  // Helper method to check if conversation is muted for a specific user
  isMutedFor(userId: string): boolean {
    if (userId === this.patientId) {
      return this.patientMuted;
    } else if (userId === this.providerId) {
      return this.providerMuted;
    }
    return false;
  }
}
