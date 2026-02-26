import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RPMAnalyticsService } from './rpm-analytics.service';

@Controller('analytics/rpm')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RPMAnalyticsController {
  constructor(private readonly analytics: RPMAnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getDashboard(@Query('clinicId') clinicId: string, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    const data = await this.analytics.getDashboardAnalytics(clinicId, new Date(startDate), new Date(endDate));
    return { data };
  }

  @Get('productivity')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getProductivity(@Query('clinicId') clinicId: string, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    const data = await this.analytics.getProviderProductivity(clinicId, new Date(startDate), new Date(endDate));
    return { data };
  }

  @Get('compliance')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  async getCompliance(@Query('clinicId') clinicId: string) {
    const data = await this.analytics.getComplianceReport(clinicId);
    return { data };
  }
}
