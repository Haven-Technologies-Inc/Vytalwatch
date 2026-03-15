import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from './decorators/permissions.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Permission } from './constants/permissions.constant';
import { StaffRoleStatus } from './entities/staff-role.entity';
import { StaffStatus } from './entities/staff-member.entity';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // ========== Staff Roles ==========

  @Post('roles')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.STAFF_ROLES_MANAGE)
  async createRole(
    @Request() req: any,
    @Body() body: { name: string; description?: string; permissions: string[] },
  ) {
    return this.staffService.createRole({ ...body, createdById: req.user.sub });
  }

  @Get('roles')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async findAllRoles(
    @Query('status') status?: StaffRoleStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.staffService.findAllRoles({ status, page, limit });
  }

  @Get('roles/:id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async findRoleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.findRoleById(id);
  }

  @Put('roles/:id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.STAFF_ROLES_MANAGE)
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body()
    body: { name?: string; description?: string; permissions?: string[]; status?: StaffRoleStatus },
  ) {
    return this.staffService.updateRole(id, body, req.user.sub);
  }

  @Delete('roles/:id')
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    await this.staffService.deleteRole(id, req.user.sub);
  }

  // ========== Staff Members ==========

  @Post('members')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.STAFF_CREATE)
  async createStaffMember(
    @Request() req: any,
    @Body()
    body: {
      userId: string;
      staffRoleId: string;
      department?: string;
      title?: string;
      employeeId?: string;
      supervisorId?: string;
      hireDate?: Date;
    },
  ) {
    return this.staffService.createStaffMember({ ...body, createdById: req.user.sub });
  }

  @Get('members')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async findAllStaffMembers(
    @Query('status') status?: StaffStatus,
    @Query('roleId') roleId?: string,
    @Query('department') department?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.staffService.findAllStaffMembers({ status, roleId, department, page, limit });
  }

  @Get('members/:id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async findStaffMemberById(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.findStaffMemberById(id);
  }

  @Get('members/user/:userId')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async findStaffMemberByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.staffService.findStaffMemberByUserId(userId);
  }

  @Put('members/:id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.STAFF_UPDATE)
  async updateStaffMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body()
    body: {
      staffRoleId?: string;
      status?: StaffStatus;
      department?: string;
      title?: string;
      additionalPermissions?: string[];
      restrictedPermissions?: string[];
      supervisorId?: string;
    },
  ) {
    return this.staffService.updateStaffMember(id, body, req.user.sub);
  }

  @Delete('members/:id')
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStaffMember(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    await this.staffService.deleteStaffMember(id, req.user.sub);
  }

  // ========== Permission Utilities ==========

  @Get('permissions')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async getAllPermissions() {
    return {
      permissions: this.staffService.getAllPermissions(),
      groups: this.staffService.getPermissionGroups(),
      categories: this.staffService.getPermissionCategories(),
    };
  }

  @Get('my-permissions')
  async getMyPermissions(@Request() req: any) {
    if (req.user.role === UserRole.SUPERADMIN)
      return {
        permissions: Object.values(this.staffService.getAllPermissions()),
        isSuperAdmin: true,
      };
    const permissions = await this.staffService.getStaffPermissions(req.user.sub);
    return { permissions, isSuperAdmin: false };
  }
}
