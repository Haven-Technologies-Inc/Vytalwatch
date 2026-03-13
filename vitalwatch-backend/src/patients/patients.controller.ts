import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PatientsService } from './patients.service';
import { UserRole } from '../users/entities/user.entity';

class CreatePatientDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  insuranceProvider?: string;
  insuranceId?: string;
  providerId?: string;
}

class UpdatePatientDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  insuranceProvider?: string;
  insuranceId?: string;
}

class AddMedicationDto {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  instructions?: string;
  prescribedBy?: string;
}

class UpdateCarePlanDto {
  goals?: string[];
  interventions?: string[];
  notes?: string;
}

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.patientsService.findAll({
      page,
      limit,
      search,
      status,
      providerId: providerId || undefined,
      organizationId: user?.organizationId,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  async create(@Body() dto: CreatePatientDto, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.patientsService.remove(id);
  }

  // Vitals endpoints
  @Get(':id/vitals/latest')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getLatestVitals(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.getLatestVitals(id, user);
  }

  @Get(':id/vitals/history')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getVitalsHistory(
    @Param('id') id: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.patientsService.getVitalsHistory(id, { type, startDate, endDate }, user);
  }

  @Get(':id/vitals/:type')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getVitalsByType(
    @Param('id') id: string,
    @Param('type') type: string,
    @Query('limit') limit: number = 50,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.patientsService.getVitalsByType(id, type, limit, user);
  }

  // Alerts endpoints
  @Get(':id/alerts')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getAlerts(
    @Param('id') id: string,
    @Query('status') status?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.patientsService.getAlerts(id, status, user);
  }

  @Get(':id/alerts/active')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getActiveAlerts(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.getActiveAlerts(id, user);
  }

  // Devices endpoints
  @Get(':id/devices')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getDevices(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.getDevices(id, user);
  }

  @Post(':id/devices/:deviceId/assign')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async assignDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.assignDevice(id, deviceId, user);
  }

  @Post(':id/devices/:deviceId/unassign')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async unassignDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.unassignDevice(id, deviceId, user);
  }

  // Medications endpoints
  @Get(':id/medications')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getMedications(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.getMedications(id, user);
  }

  @Post(':id/medications')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  async addMedication(
    @Param('id') id: string,
    @Body() dto: AddMedicationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.addMedication(id, dto, user);
  }

  @Put(':id/medications/:medicationId')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  async updateMedication(
    @Param('id') id: string,
    @Param('medicationId') medicationId: string,
    @Body() dto: Partial<AddMedicationDto>,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.updateMedication(id, medicationId, dto, user);
  }

  @Delete(':id/medications/:medicationId')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMedication(
    @Param('id') id: string,
    @Param('medicationId') medicationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.patientsService.removeMedication(id, medicationId, user);
  }

  // Care Plan endpoints
  @Get(':id/care-plan')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getCarePlan(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.getCarePlan(id, user);
  }

  @Put(':id/care-plan')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  async updateCarePlan(
    @Param('id') id: string,
    @Body() dto: UpdateCarePlanDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.updateCarePlan(id, dto, user);
  }

  // AI Insights endpoints
  @Get(':id/ai-insights')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getAIInsights(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.getAIInsights(id, user);
  }

  // Risk Score endpoint
  @Get(':id/risk-score')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getRiskScore(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.getRiskScore(id, user);
  }

  // Adherence endpoint
  @Get(':id/adherence')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getAdherence(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.patientsService.getAdherence(id, { startDate, endDate }, user);
  }

  // Appointments endpoint
  @Get(':id/appointments')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT, UserRole.SUPERADMIN)
  async getAppointments(
    @Param('id') id: string,
    @Query('status') status?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.patientsService.getAppointments(id, status, user);
  }
}
