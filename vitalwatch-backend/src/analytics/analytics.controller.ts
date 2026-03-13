import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { UserRole } from '../users/entities/user.entity';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('range') range?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    const dates = this.resolveRange(range, startDate, endDate);
    return this.analyticsService.getDashboardAnalytics({
      startDate: dates.startDate,
      endDate: dates.endDate,
      organizationId: user?.organizationId,
      role: user?.role as any,
    });
  }

  @Get('overview')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('range') range?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    const dates = this.resolveRange(range, startDate, endDate);
    return this.analyticsService.getDashboardAnalytics({
      startDate: dates.startDate,
      endDate: dates.endDate,
      organizationId: user?.organizationId,
      role: user?.role as any,
    });
  }

  @Get('population-health')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getPopulationHealth(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.analyticsService.getPopulationHealth({
      startDate,
      endDate,
      organizationId: user?.organizationId,
    });
  }

  @Get('adherence')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getAdherenceAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.analyticsService.getAdherenceAnalytics({
      startDate,
      endDate,
      organizationId: user?.organizationId,
    });
  }

  @Get('outcomes')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getOutcomes(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.analyticsService.getOutcomesAnalytics({
      startDate,
      endDate,
      organizationId: user?.organizationId,
    });
  }

  @Get('revenue')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async getRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('range') range?: string,
  ) {
    const dates = this.resolveRange(range, startDate, endDate);
    return this.analyticsService.getRevenueAnalytics({ startDate: dates.startDate, endDate: dates.endDate });
  }

  @Get('provider-stats')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getProviderStats(@CurrentUser() user?: CurrentUserPayload) {
    const d = await this.analyticsService.getDashboardAnalytics({ organizationId: user?.organizationId, role: user?.role as any });
    const rev = await this.analyticsService.getRevenueAnalytics({});
    return { totalPatients: d.totalPatients, activeAlerts: d.activeAlerts, criticalAlerts: 0, adherenceRate: 85, adherenceChange: 2, monthlyRevenue: (rev as any)?.mrr ?? 0, patientChange: 0 };
  }

  @Get('system')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getSystemAnalytics() {
    return this.analyticsService.getSystemAnalytics();
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async exportAnalytics(
    @Query('type') type: string,
    @Query('format') format: string = 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.analyticsService.exportAnalytics({
      type,
      format,
      startDate,
      endDate,
      organizationId: user?.organizationId,
    });
  }

  private resolveRange(range?: string, startDate?: string, endDate?: string): { startDate?: string; endDate?: string } {
    if (startDate || endDate) return { startDate, endDate };
    if (!range) return {};
    const match = range.match(/^(\d+)([dhm])$/);
    if (!match) return {};
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    const now = new Date();
    const start = new Date(now);
    if (unit === 'd') start.setDate(start.getDate() - amount);
    else if (unit === 'h') start.setHours(start.getHours() - amount);
    else if (unit === 'm') start.setMonth(start.getMonth() - amount);
    return { startDate: start.toISOString(), endDate: now.toISOString() };
  }
}
