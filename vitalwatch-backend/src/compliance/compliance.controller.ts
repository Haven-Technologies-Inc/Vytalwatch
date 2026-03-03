import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ComplianceService } from './compliance.service';
import { PHIResourceType } from './entities/phi-access-log.entity';
import { ConsentType } from './entities/patient-consent.entity';

@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('phi-access')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_AUDITOR)
  async getPHIAccessLogs(
    @Query('userId') userId?: string,
    @Query('patientId') patientId?: string,
    @Query('resourceType') resourceType?: PHIResourceType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.complianceService.getPHIAccessHistory({
      userId,
      patientId,
      resourceType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit || 100,
    });
  }

  @Get('consents/:patientId')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.COMPLIANCE_AUDITOR)
  async getPatientConsents(@Param('patientId') patientId: string) {
    return this.complianceService.getPatientConsents(patientId);
  }

  @Post('consents/:patientId')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async grantConsent(
    @Param('patientId') patientId: string,
    @Body() body: { consentType: ConsentType; grantedBy: string; expiresAt?: string },
  ) {
    return this.complianceService.grantConsent(patientId, body.consentType, {
      grantedBy: body.grantedBy,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Post('consents/:consentId/revoke')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async revokeConsent(
    @Param('consentId') consentId: string,
    @Body() body: { revokedBy: string; reason?: string },
  ) {
    return this.complianceService.revokeConsent(consentId, body.revokedBy, body.reason);
  }

  @Get('consents/:patientId/check/:consentType')
  async checkConsent(
    @Param('patientId') patientId: string,
    @Param('consentType') consentType: ConsentType,
  ) {
    const hasConsent = await this.complianceService.hasActiveConsent(patientId, consentType);
    return { patientId, consentType, hasActiveConsent: hasConsent };
  }

  @Get('baa')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_AUDITOR)
  async getBAAs(@Query('organizationId') organizationId?: string) {
    return this.complianceService.getActiveBAAs(organizationId);
  }

  @Post('baa')
  @Roles(UserRole.ADMIN)
  async createBAA(@Body() body: any) {
    return this.complianceService.createBAA(body);
  }
}
