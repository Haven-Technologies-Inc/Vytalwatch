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
import { Organization } from '../../organizations/entities/organization.entity';

export enum WhitelistStatus {
  REGISTERED = 'RE',
  CONFIRMED = 'CO',
  PENDING = 'PE',
  REMOVED = 'RM',
}

@Entity('tenovi_whitelisted_devices')
@Index(['gatewayId', 'macAddress'], { unique: true })
export class TenoviWhitelistedDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gatewayId: string;

  @Column({ name: 'sensor_code' })
  sensorCode: string;

  @Column({ name: 'mac_address' })
  macAddress: string;

  @Column({
    type: 'enum',
    enum: WhitelistStatus,
    default: WhitelistStatus.PENDING,
    name: 'whitelist_status',
  })
  whitelistStatus: WhitelistStatus;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  modified: Date;
}

@Entity('tenovi_gateway_properties')
export class TenoviGatewayProperty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gatewayId: string;

  @Column()
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;
}

@Entity('tenovi_gateways')
@Index(['gatewayUuid'], { unique: true })
@Index(['organizationId'])
export class TenoviGateway {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'gateway_uuid', unique: true })
  gatewayUuid: string;

  @Column({ name: 'firmware_version', nullable: true })
  firmwareVersion: string;

  @Column({ name: 'bootloader_version', nullable: true })
  bootloaderVersion: string;

  @Column({ default: false })
  provisioned: boolean;

  @Column({ name: 'last_signal_strength', type: 'int', nullable: true })
  lastSignalStrength: number;

  @Column({ name: 'last_checkin_time', type: 'timestamp', nullable: true })
  lastCheckinTime: Date;

  @Column({ name: 'assigned_on', type: 'timestamp', nullable: true })
  assignedOn: Date;

  @Column({ name: 'shipped_on', type: 'timestamp', nullable: true })
  shippedOn: Date;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  patientId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  whitelistedDevices: TenoviWhitelistedDevice[];

  properties: TenoviGatewayProperty[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
