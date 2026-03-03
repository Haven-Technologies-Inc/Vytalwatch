import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RetentionAction {
  ARCHIVE = 'archive',
  DELETE = 'delete',
  ANONYMIZE = 'anonymize',
}

@Entity('data_retention_policies')
export class DataRetentionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  resourceType: string;

  @Column({ type: 'int' })
  retentionDays: number;

  @Column({ type: 'enum', enum: RetentionAction, default: RetentionAction.ARCHIVE })
  action: RetentionAction;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
