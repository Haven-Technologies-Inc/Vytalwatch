import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VitalsService, CreateVitalDto } from './vitals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { VitalType, VitalStatus } from './entities/vital-reading.entity';

@Controller('vitals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(@Body() createVitalDto: CreateVitalDto) {
    return this.vitalsService.create(createVitalDto);
  }

  @Get('patient/:patientId')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('type') type?: VitalType,
    @Query('status') status?: VitalStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.vitalsService.findAll({
      patientId,
      type,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
  }

  @Get('patient/:patientId/latest')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getLatestVitals(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.vitalsService.getLatestVitals(patientId);
  }

  @Get('patient/:patientId/summary')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPatientSummary(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.vitalsService.getPatientSummary(patientId);
  }

  @Get('patient/:patientId/trend/:type')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getVitalTrend(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('type') type: VitalType,
    @Query('days') days?: number,
  ) {
    return this.vitalsService.getVitalTrend(patientId, type, days);
  }

  @Get('me')
  async getMyVitals(
    @CurrentUser() user: CurrentUserPayload,
    @Query('type') type?: VitalType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.vitalsService.findAll({ patientId: user.sub, type, page, limit });
  }

  @Get('me/latest')
  async getMyLatestVitals(@CurrentUser() user: CurrentUserPayload) {
    return this.vitalsService.getLatestVitals(user.sub);
  }

  @Get('me/summary')
  async getMySummary(@CurrentUser() user: CurrentUserPayload) {
    return this.vitalsService.getPatientSummary(user.sub);
  }

  @Get(':id')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vitalsService.findById(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.vitalsService.delete(id);
  }
}
