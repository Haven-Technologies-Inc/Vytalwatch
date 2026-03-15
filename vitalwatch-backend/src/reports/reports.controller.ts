import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { UserRole } from '../users/entities/user.entity';

class GenerateReportDto {
  type:
    | 'patient_summary'
    | 'vitals_history'
    | 'billing'
    | 'compliance'
    | 'population_health'
    | 'custom';
  title?: string;
  patientId?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  format?: 'pdf' | 'csv' | 'xlsx';
  parameters?: Record<string, any>;
}

class ScheduleReportDto {
  reportType: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  parameters?: Record<string, any>;
}

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.reportsService.findAll({
      page,
      limit,
      type,
      status,
      organizationId: user?.organizationId,
      userId: user?.sub,
    });
  }

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getTemplates() {
    return this.reportsService.getTemplates();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.findOne(id, user);
  }

  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async generate(@Body() dto: GenerateReportDto, @CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.generate(dto, user);
  }

  @Get(':id/download')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async download(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const report = await this.reportsService.getReportFile(id, user);

    res.setHeader('Content-Type', report.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.reportsService.remove(id, user);
  }

  @Get('scheduled')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getScheduledReports(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.getScheduledReports(user);
  }

  @Post('schedule')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async scheduleReport(@Body() dto: ScheduleReportDto, @CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.scheduleReport(dto, user);
  }

  @Delete('scheduled/:id')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelScheduledReport(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.reportsService.cancelScheduledReport(id, user);
  }

  // Patient-specific reports
  @Get('patient/:patientId/summary')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async getPatientSummary(
    @Param('patientId') patientId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.reportsService.generatePatientSummary(patientId, { startDate, endDate }, user);
  }

  @Get('patient/:patientId/vitals')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async getPatientVitalsReport(
    @Param('patientId') patientId: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.reportsService.generateVitalsReport(patientId, { type, startDate, endDate }, user);
  }

  // Organization reports
  @Get('organization/:orgId/compliance')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getComplianceReport(
    @Param('orgId') orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.generateComplianceReport(orgId, { startDate, endDate });
  }

  @Get('organization/:orgId/billing')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getBillingReport(
    @Param('orgId') orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.generateBillingReport(orgId, { startDate, endDate });
  }
}
