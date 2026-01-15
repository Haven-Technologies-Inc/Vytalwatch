import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AlertsService, CreateAlertDto, AlertQueryOptions } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AlertType, AlertSeverity, AlertStatus } from './entities/alert.entity';

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(@Body() createAlertDto: CreateAlertDto) {
    return this.alertsService.create(createAlertDto);
  }

  @Get()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(
    @Query('patientId') patientId?: string,
    @Query('providerId') providerId?: string,
    @Query('type') type?: AlertType,
    @Query('severity') severity?: AlertSeverity,
    @Query('status') status?: AlertStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.alertsService.findAll({
      patientId,
      providerId,
      type,
      severity,
      status,
      page,
      limit,
    });
  }

  @Get('active')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getActiveAlerts(@CurrentUser() user: CurrentUserPayload) {
    // Providers see their patients' alerts, admins see all
    const providerId = user.role === 'provider' ? user.sub : undefined;
    return this.alertsService.getActiveAlerts(providerId);
  }

  @Get('stats')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getStats(@CurrentUser() user: CurrentUserPayload) {
    const providerId = user.role === 'provider' ? user.sub : undefined;
    return this.alertsService.getAlertStats(providerId);
  }

  @Get('patient/:patientId')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPatientAlerts(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.alertsService.getPatientAlertHistory(patientId, { page, limit });
  }

  @Get('me')
  async getMyAlerts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.alertsService.getPatientAlertHistory(user.sub, { page, limit });
  }

  @Get(':id')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findById(id);
  }

  @Put(':id/acknowledge')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.alertsService.acknowledge(id, user.sub);
  }

  @Put(':id/resolve')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('resolution') resolution?: string,
  ) {
    return this.alertsService.resolve(id, user.sub, resolution);
  }

  @Put(':id/escalate')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async escalate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('reason') reason: string,
  ) {
    return this.alertsService.escalate(id, user.sub, reason);
  }

  @Post('bulk-acknowledge')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async bulkAcknowledge(
    @Body('ids') ids: string[],
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const count = await this.alertsService.bulkAcknowledge(ids, user.sub);
    return { acknowledged: count };
  }
}
