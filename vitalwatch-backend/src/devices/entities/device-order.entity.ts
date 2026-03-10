import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('device_orders')
export class DeviceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.SUBMITTED })
  status: OrderStatus;

  @Column()
  shippingName: string;

  @Column()
  shippingAddress: string;

  @Column()
  shippingCity: string;

  @Column({ nullable: true })
  shippingState: string;

  @Column()
  shippingZipCode: string;

  @Column({ nullable: true })
  notifyEmails: string;

  @Column({ type: 'jsonb' })
  contents: Array<{ name: string; quantity: number }>;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ nullable: true })
  createdById: string;

  @Column({ nullable: true })
  externalOrderId: string;

  @Column({ default: 0 })
  totalDevices: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
