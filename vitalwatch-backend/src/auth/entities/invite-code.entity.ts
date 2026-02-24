import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';

export enum InviteCodeStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('invite_codes')
export class InviteCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PROVIDER })
  allowedRole: UserRole;

  @Column({ type: 'enum', enum: InviteCodeStatus, default: InviteCodeStatus.ACTIVE })
  status: InviteCodeStatus;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  usedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usedById' })
  usedBy: User;

  @Column({ nullable: true })
  usedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: 1 })
  maxUses: number;

  @Column({ default: 0 })
  usesCount: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  isValid(): boolean {
    if (this.status !== InviteCodeStatus.ACTIVE) {
      return false;
    }
    if (this.expiresAt && new Date() > this.expiresAt) {
      return false;
    }
    if (this.usesCount >= this.maxUses) {
      return false;
    }
    return true;
  }
}
