import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Param,
} from '@nestjs/common';
import { AuditService, AuditQueryOptions } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuditAction } from './entities/audit-log.entity';

@Controller({ path: ['audit', 'audit-logs'] })
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('resource') resource?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const options: AuditQueryOptions = {
      userId,
      action,
      resource,
      resourceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    };

    return this.auditService.findAll(options);
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findByUser(userId, { page, limit });
  }

  @Get('resource/:resource/:resourceId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findByResource(
    @Param('resource') resource: string,
    @Param('resourceId') resourceId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findByResource(resource, resourceId, { page, limit });
  }

  @Get('recent/:organizationId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getRecentActivity(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getRecentActivity(organizationId, limit);
  }

  @Get('login-history/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getLoginHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getLoginHistory(userId, limit);
  }

  @Get('security')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getSecurityEvents(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.auditService.getSecurityEvents(
      new Date(startDate),
      new Date(endDate),
    );
  }
}
