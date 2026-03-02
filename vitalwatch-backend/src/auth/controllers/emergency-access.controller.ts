import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../decorators/current-user.decorator';
import { EmergencyAccessService } from '../services/emergency-access.service';
import { UserRole } from '../../users/entities/user.entity';
import { Request } from 'express';

class RequestEmergencyAccessDto {
  patientId: string;
  reason: string;
}

@Controller('auth/emergency-access')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmergencyAccessController {
  constructor(private readonly emergencyAccessService: EmergencyAccessService) {}

  @Post('request')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async requestAccess(
    @Body() dto: RequestEmergencyAccessDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const grant = await this.emergencyAccessService.requestAccess(
      user.id,
      dto.patientId,
      dto.reason,
      ip,
    );
    return {
      success: true,
      data: {
        accessId: grant.accessId,
        expiresAt: grant.expiresAt,
        message: 'Emergency access granted. This access is logged and audited.',
      },
    };
  }

  @Post('validate')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async validateAccess(
    @Body('accessId') accessId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const valid = this.emergencyAccessService.validate(accessId, user.id);
    return { success: true, data: { valid } };
  }

  @Post('revoke')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async revokeAccess(
    @Body('accessId') accessId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.emergencyAccessService.revoke(accessId, user.id);
    return { success: true, message: 'Emergency access revoked' };
  }
}
