import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PrescriptionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ORDERED = 'ordered',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
}

@Entity('device_prescriptions')
export class DevicePrescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @Column({ nullable: true })
  patientName: string;

  @Column()
  providerId: string;

  @Column({ nullable: true })
  providerName: string;

  @Column({ nullable: true })
  organizationId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PrescriptionStatus;

  @Column({ type: 'jsonb' })
  devices: Array<{
    catalogId: string;
    name: string;
    quantity: number;
    category: string;
    brand: string;
  }>;

  @Column({ nullable: true })
  clinicalReason: string;

  @Column({ nullable: true })
  icdCode: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  orderId: string;

  @Column({ nullable: true })
  approvedById: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
