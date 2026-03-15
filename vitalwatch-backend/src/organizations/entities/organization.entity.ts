import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
}

export enum OrganizationType {
  HOSPITAL = 'hospital',
  CLINIC = 'clinic',
  PRACTICE = 'practice',
  HOME_HEALTH = 'home_health',
  SPECIALTY = 'specialty',
  AGENCY = 'agency',
  OTHER = 'other',
}

export enum OrganizationPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  address: Record<string, any>;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  taxId: string;

  @Column({ nullable: true })
  npi: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ type: 'varchar', default: OrganizationPlan.STARTER })
  plan: string;

  @Column({ type: 'varchar', default: OrganizationStatus.TRIAL })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
