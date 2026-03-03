import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { PermissionType } from '../constants/permissions.constant';

export enum StaffRoleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('staff_roles')
export class StaffRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('simple-array')
  permissions: string[];

  @Column({ type: 'enum', enum: StaffRoleStatus, default: StaffRoleStatus.ACTIVE })
  status: StaffRoleStatus;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  hasPermission(permission: PermissionType): boolean {
    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissions: PermissionType[]): boolean {
    return permissions.some(p => this.permissions.includes(p));
  }

  hasAllPermissions(permissions: PermissionType[]): boolean {
    return permissions.every(p => this.permissions.includes(p));
  }
}
