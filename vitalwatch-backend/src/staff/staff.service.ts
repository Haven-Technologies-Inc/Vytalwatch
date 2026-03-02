import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffRole, StaffRoleStatus } from './entities/staff-role.entity';
import { StaffMember, StaffStatus } from './entities/staff-member.entity';
import { Permission, ALL_PERMISSIONS, PERMISSION_GROUPS, PermissionCategory, PermissionType } from './constants/permissions.constant';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @InjectRepository(StaffRole)
    private staffRoleRepository: Repository<StaffRole>,
    @InjectRepository(StaffMember)
    private staffMemberRepository: Repository<StaffMember>,
    private auditService: AuditService,
  ) {}

  // ========== Staff Roles ==========

  async createRole(data: { name: string; description?: string; permissions: string[]; createdById: string }): Promise<StaffRole> {
    const existing = await this.staffRoleRepository.findOne({ where: { name: data.name } });
    if (existing) throw new ConflictException('Role name already exists');

    const invalidPerms = data.permissions.filter(p => !ALL_PERMISSIONS.includes(p as any));
    if (invalidPerms.length > 0) throw new BadRequestException(`Invalid permissions: ${invalidPerms.join(', ')}`);

    const role = this.staffRoleRepository.create({
      name: data.name,
      description: data.description,
      permissions: data.permissions,
      createdById: data.createdById,
    });

    const saved = await this.staffRoleRepository.save(role);
    await this.auditService.log({ action: 'STAFF_ROLE_CREATED', userId: data.createdById, details: { roleId: saved.id, name: saved.name } });
    return saved;
  }

  async updateRole(id: string, data: { name?: string; description?: string; permissions?: string[]; status?: StaffRoleStatus }, userId: string): Promise<StaffRole> {
    const role = await this.staffRoleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot modify system role');

    if (data.permissions) {
      const invalidPerms = data.permissions.filter(p => !ALL_PERMISSIONS.includes(p as any));
      if (invalidPerms.length > 0) throw new BadRequestException(`Invalid permissions: ${invalidPerms.join(', ')}`);
    }

    Object.assign(role, data);
    const saved = await this.staffRoleRepository.save(role);
    await this.auditService.log({ action: 'STAFF_ROLE_UPDATED', userId, details: { roleId: id, changes: data } });
    return saved;
  }

  async deleteRole(id: string, userId: string): Promise<void> {
    const role = await this.staffRoleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete system role');

    const membersCount = await this.staffMemberRepository.count({ where: { staffRoleId: id } });
    if (membersCount > 0) throw new BadRequestException(`Cannot delete role with ${membersCount} assigned members`);

    await this.staffRoleRepository.remove(role);
    await this.auditService.log({ action: 'STAFF_ROLE_DELETED', userId, details: { roleId: id, name: role.name } });
  }

  async findAllRoles(params?: { status?: StaffRoleStatus; page?: number; limit?: number }): Promise<{ data: StaffRole[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const where: any = {};
    if (params?.status) where.status = params.status;

    const [data, total] = await this.staffRoleRepository.findAndCount({ where, skip: (page - 1) * limit, take: limit, order: { name: 'ASC' } });
    return { data, total };
  }

  async findRoleById(id: string): Promise<StaffRole> {
    const role = await this.staffRoleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  // ========== Staff Members ==========

  async createStaffMember(data: { userId: string; staffRoleId: string; department?: string; title?: string; employeeId?: string; supervisorId?: string; hireDate?: Date; createdById: string }): Promise<StaffMember> {
    const existing = await this.staffMemberRepository.findOne({ where: { userId: data.userId } });
    if (existing) throw new ConflictException('User is already a staff member');

    const role = await this.staffRoleRepository.findOne({ where: { id: data.staffRoleId } });
    if (!role) throw new NotFoundException('Staff role not found');

    const member = this.staffMemberRepository.create(data);
    const saved = await this.staffMemberRepository.save(member);
    await this.auditService.log({ action: 'STAFF_MEMBER_CREATED', userId: data.createdById, details: { staffId: saved.id, userId: data.userId, roleId: data.staffRoleId } });
    return this.findStaffMemberById(saved.id);
  }

  async updateStaffMember(id: string, data: { staffRoleId?: string; status?: StaffStatus; department?: string; title?: string; additionalPermissions?: string[]; restrictedPermissions?: string[]; supervisorId?: string }, userId: string): Promise<StaffMember> {
    const member = await this.staffMemberRepository.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Staff member not found');

    if (data.staffRoleId) {
      const role = await this.staffRoleRepository.findOne({ where: { id: data.staffRoleId } });
      if (!role) throw new NotFoundException('Staff role not found');
    }

    Object.assign(member, data);
    await this.staffMemberRepository.save(member);
    await this.auditService.log({ action: 'STAFF_MEMBER_UPDATED', userId, details: { staffId: id, changes: data } });
    return this.findStaffMemberById(id);
  }

  async deleteStaffMember(id: string, userId: string): Promise<void> {
    const member = await this.staffMemberRepository.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Staff member not found');

    await this.staffMemberRepository.remove(member);
    await this.auditService.log({ action: 'STAFF_MEMBER_DELETED', userId, details: { staffId: id, memberUserId: member.userId } });
  }

  async findAllStaffMembers(params?: { status?: StaffStatus; roleId?: string; department?: string; page?: number; limit?: number }): Promise<{ data: StaffMember[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.roleId) where.staffRoleId = params.roleId;
    if (params?.department) where.department = params.department;

    const [data, total] = await this.staffMemberRepository.findAndCount({ where, relations: ['staffRole'], skip: (page - 1) * limit, take: limit, order: { createdAt: 'DESC' } });
    return { data, total };
  }

  async findStaffMemberById(id: string): Promise<StaffMember> {
    const member = await this.staffMemberRepository.findOne({ where: { id }, relations: ['staffRole'] });
    if (!member) throw new NotFoundException('Staff member not found');
    return member;
  }

  async findStaffMemberByUserId(userId: string): Promise<StaffMember | null> {
    return this.staffMemberRepository.findOne({ where: { userId }, relations: ['staffRole'] });
  }

  async getStaffPermissions(userId: string): Promise<string[]> {
    const member = await this.findStaffMemberByUserId(userId);
    return member ? member.getEffectivePermissions() : [];
  }

  // ========== Permission Utilities ==========

  getAllPermissions(): typeof Permission { return Permission; }
  getPermissionGroups(): typeof PERMISSION_GROUPS { return PERMISSION_GROUPS; }
  getPermissionCategories(): PermissionCategory[] { return Object.values(PermissionCategory); }

  async seedSystemRoles(): Promise<void> {
    const systemRoles = [
      { name: 'Super Administrator', description: 'Full system access', permissions: ALL_PERMISSIONS, isSystem: true },
      { name: 'Administrator', description: 'Administrative access without critical settings', permissions: ALL_PERMISSIONS.filter(p => !p.includes('staff:roles') && !p.includes('settings:manage')), isSystem: true },
      { name: 'Billing Manager', description: 'Billing and claims management', permissions: [...PERMISSION_GROUPS[PermissionCategory.BILLING], ...PERMISSION_GROUPS[PermissionCategory.CLAIMS], Permission.REPORTS_READ, Permission.REPORTS_EXPORT], isSystem: true },
      { name: 'Clinical Staff', description: 'Patient and vitals access', permissions: [Permission.PATIENTS_READ, Permission.PATIENTS_UPDATE, Permission.VITALS_READ, Permission.VITALS_UPDATE, Permission.DEVICES_READ], isSystem: true },
      { name: 'Support Staff', description: 'Basic read access for support', permissions: [Permission.USERS_READ, Permission.PATIENTS_READ, Permission.DEVICES_READ, Permission.VITALS_READ], isSystem: true },
      { name: 'Compliance Officer', description: 'Compliance and audit access', permissions: [...PERMISSION_GROUPS[PermissionCategory.COMPLIANCE], ...PERMISSION_GROUPS[PermissionCategory.AUDIT], Permission.REPORTS_READ, Permission.REPORTS_EXPORT], isSystem: true },
    ];

    for (const roleData of systemRoles) {
      const existing = await this.staffRoleRepository.findOne({ where: { name: roleData.name } });
      if (!existing) {
        await this.staffRoleRepository.save(this.staffRoleRepository.create(roleData));
        this.logger.log(`Created system role: ${roleData.name}`);
      }
    }
  }
}
