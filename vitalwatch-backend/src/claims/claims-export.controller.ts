import { Controller, Post, Body, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Claim837PExportService } from './claim-837p-export.service';
import { AuditBundleService, AuditBundleData } from './audit-bundle.service';

@Controller('claims/export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClaimsExportController {
  constructor(private readonly edi: Claim837PExportService, private readonly audit: AuditBundleService) {}

  @Post('837p')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async export837P(@Body() body: { claims: any[]; submitter: { name: string; ein: string; npi: string }; receiver: { name: string; id: string } }, @Res() res: Response) {
    const file = this.edi.generateEDI837P(body.claims, body.submitter, body.receiver);
    res.setHeader('Content-Type', 'application/edi-x12');
    res.setHeader('Content-Disposition', 'attachment; filename=' + file.filename);
    res.send(file.content);
  }

  @Post('837p/preview')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async preview837P(@Body() body: { claims: any[]; submitter: { name: string; ein: string; npi: string }; receiver: { name: string; id: string } }) {
    const file = this.edi.generateEDI837P(body.claims, body.submitter, body.receiver);
    return { data: { content: file.content, filename: file.filename, claimCount: file.claimIds.length, totalCharges: file.totalCharges } };
  }

  @Post('audit-bundle')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async generateAuditBundle(@Body() data: AuditBundleData) {
    const bundle = await this.audit.generateAuditBundle(data);
    return { data: { id: bundle.id, claimId: bundle.claimId, hash: bundle.hash, generatedAt: bundle.generatedAt } };
  }

  @Post('audit-bundle/download')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async downloadAuditBundle(@Body() data: AuditBundleData, @Res() res: Response) {
    const bundle = await this.audit.generateAuditBundle(data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_bundle_' + bundle.claimId + '.pdf');
    res.send(bundle.pdfBuffer);
  }
}
