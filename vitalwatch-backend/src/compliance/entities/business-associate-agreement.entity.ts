import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BAAStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURE = 'pending_signature',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum BAAPartyType {
  COVERED_ENTITY = 'covered_entity',
  BUSINESS_ASSOCIATE = 'business_associate',
  SUBCONTRACTOR = 'subcontractor',
}

@Entity('business_associate_agreements')
@Index(['organizationId', 'status'])
@Index(['expiresAt'])
export class BusinessAssociateAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agreementNumber: string;

  @Column()
  partyName: string;

  @Column({ type: 'enum', enum: BAAPartyType })
  partyType: BAAPartyType;

  @Column({ nullable: true })
  partyContact: string;

  @Column({ nullable: true })
  partyEmail: string;

  @Column({ type: 'enum', enum: BAAStatus, default: BAAStatus.DRAFT })
  status: BAAStatus;

  @Column({ type: 'date' })
  effectiveDate: Date;

  @Column({ type: 'date', nullable: true })
  expiresAt: Date;

  @Column({ type: 'text', nullable: true })
  scopeOfServices: string;

  @Column({ type: 'simple-array', nullable: true })
  permittedUses: string[];

  @Column({ type: 'simple-array', nullable: true })
  permittedDisclosures: string[];

  @Column({ nullable: true })
  documentUrl: string;

  @Column({ nullable: true })
  signedByUs: string;

  @Column({ type: 'timestamp', nullable: true })
  signedByUsAt: Date;

  @Column({ nullable: true })
  signedByThem: string;

  @Column({ type: 'timestamp', nullable: true })
  signedByThemAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  terminatedAt: Date;

  @Column({ nullable: true })
  terminationReason: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
