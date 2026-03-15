import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { InfluxDBService } from './influxdb.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('influxdb')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InfluxDBController {
  constructor(private readonly influxDBService: InfluxDBService) {}

  /**
   * GET /influxdb/vitals/:patientId
   * Query time-series vital data with optional date range and type filters.
   */
  @Get('vitals/:patientId')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async queryVitals(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('type') type?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit?: number,
  ) {
    const vitals = await this.influxDBService.queryVitals({
      patientId,
      type,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return {
      success: true,
      data: vitals,
      meta: {
        patientId,
        count: vitals.length,
        type: type || 'all',
        startTime: startTime || null,
        endTime: endTime || null,
      },
    };
  }

  /**
   * GET /influxdb/vitals/:patientId/trends
   * Get trend aggregation data for a specific vital type.
   */
  @Get('vitals/:patientId/trends')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getVitalTrends(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('type') type: string,
    @Query('days') days?: number,
    @Query('aggregateWindow') aggregateWindow?: string,
  ) {
    const trends = await this.influxDBService.getVitalTrends(
      patientId,
      type,
      days ? Number(days) : 30,
      aggregateWindow || '1h',
    );

    return {
      success: true,
      data: trends,
      meta: {
        patientId,
        type,
        days: days ? Number(days) : 30,
        aggregateWindow: aggregateWindow || '1h',
        dataPoints: trends.length,
      },
    };
  }

  /**
   * GET /influxdb/vitals/:patientId/summary
   * Get daily/weekly/monthly summary of vital data.
   */
  @Get('vitals/:patientId/summary')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getVitalSummary(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
    @Query('type') type?: string,
  ) {
    const validPeriod =
      period && ['daily', 'weekly', 'monthly'].includes(period) ? period : 'daily';

    const summary = await this.influxDBService.getVitalSummary(patientId, validPeriod, type);

    return {
      success: true,
      data: summary,
      meta: {
        patientId,
        period: validPeriod,
        type: type || 'all',
        dataPoints: summary.length,
      },
    };
  }
}
