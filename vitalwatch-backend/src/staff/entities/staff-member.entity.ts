import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StaffRole } from './staff-role.entity';

export enum StaffStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Entity('staff_members')
export class StaffMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  staffRoleId: string;

  @ManyToOne(() => StaffRole, { eager: true })
  @JoinColumn({ name: 'staffRoleId' })
  staffRole: StaffRole;

  @Column({ type: 'enum', enum: StaffStatus, default: StaffStatus.ACTIVE })
  status: StaffStatus;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  employeeId: string;

  @Column({ type: 'simple-array', nullable: true })
  additionalPermissions: string[];

  @Column({ type: 'simple-array', nullable: true })
  restrictedPermissions: string[];

  @Column({ nullable: true })
  supervisorId: string;

  @Column({ nullable: true })
  hireDate: Date;

  @Column({ nullable: true })
  lastActiveAt: Date;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  getEffectivePermissions(): string[] {
    const rolePerms = this.staffRole?.permissions || [];
    const additional = this.additionalPermissions || [];
    const restricted = this.restrictedPermissions || [];
    const combined = [...new Set([...rolePerms, ...additional])];
    return combined.filter(p => !restricted.includes(p));
  }

  hasPermission(permission: string): boolean {
    return this.getEffectivePermissions().includes(permission);
  }
}
