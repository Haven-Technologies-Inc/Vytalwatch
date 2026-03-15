import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
  PermissionMode,
} from '../decorators/permissions.decorator';
import { StaffMember } from '../entities/staff-member.entity';
import { PermissionType, ALL_PERMISSIONS } from '../constants/permissions.constant';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(StaffMember)
    private staffMemberRepository: Repository<StaffMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionType[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const mode =
      this.reflector.getAllAndOverride<PermissionMode>(PERMISSIONS_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'all';

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // SuperAdmin has all permissions
    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    // Get staff member with role
    const staffMember = await this.staffMemberRepository.findOne({
      where: { userId: user.sub },
      relations: ['staffRole'],
    });

    if (!staffMember) {
      throw new ForbiddenException('Staff access required');
    }

    if (staffMember.status !== 'active') {
      throw new ForbiddenException('Staff account is not active');
    }

    const userPermissions = staffMember.getEffectivePermissions();

    const hasPermission =
      mode === 'any'
        ? requiredPermissions.some((p) => userPermissions.includes(p))
        : requiredPermissions.every((p) => userPermissions.includes(p));

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Attach permissions to request for downstream use
    context.switchToHttp().getRequest().staffPermissions = userPermissions;
    context.switchToHttp().getRequest().staffMember = staffMember;

    return true;
  }
}
