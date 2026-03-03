import { Controller, Post, Body, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ClearinghouseService } from './clearinghouse.service';
import { Claim837PExportService } from './claim-837p-export.service';

@Controller('claims/clearinghouse')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClearinghouseController {
  constructor(private readonly ch: ClearinghouseService, private readonly edi: Claim837PExportService) {}

  @Get('status')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  getStatus() {
    return { data: { configured: this.ch.isConfigured() } };
  }

  @Post('submit')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async submitClaims(@Body() body: { claims: any[]; submitter: any; receiver: any }) {
    const file = this.edi.generateEDI837P(body.claims, body.submitter, body.receiver);
    const result = await this.ch.submitClaim(file.content, file.claimIds);
    return { data: result };
  }

  @Get('check/:transactionId')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async checkStatus(@Param('transactionId') transactionId: string) {
    const statuses = await this.ch.checkClaimStatus(transactionId);
    return { data: statuses };
  }

  @Get('remittance')
  @Roles(UserRole.ADMIN)
  async getRemittance(@Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    const remittances = await this.ch.getRemittance(fromDate, toDate);
    return { data: remittances };
  }
}
