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
  ParseUUIDPipe,
} from '@nestjs/common';
import { MedicationsService } from './medications.service';
import {
  CreateMedicationDto,
  UpdateMedicationDto,
  MarkTakenDto,
  MedicationQueryDto,
} from './dto/medication.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('medications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(@Body() dto: CreateMedicationDto, @CurrentUser() user: CurrentUserPayload) {
    const medication = await this.medicationsService.create(dto, user.id);
    return { success: true, data: medication };
  }

  @Get()
  async findAll(@Query() query: MedicationQueryDto, @CurrentUser() user: CurrentUserPayload) {
    if (user.role === UserRole.PATIENT) {
      query.patientId = user.id;
    }
    const result = await this.medicationsService.findAll(query);
    return { success: true, data: result };
  }

  @Get('patient/:patientId')
  async findByPatient(
    @Param('patientId') patientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.role === UserRole.PATIENT && user.id !== patientId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } };
    }
    const medications = await this.medicationsService.findByPatient(patientId);
    return { success: true, data: medications };
  }

  @Get('patient/:patientId/active')
  async findActive(@Param('patientId') patientId: string) {
    const medications = await this.medicationsService.findActive(patientId);
    return { success: true, data: medications };
  }

  @Get('patient/:patientId/schedule')
  async getTodaySchedule(@Param('patientId') patientId: string) {
    const schedule = await this.medicationsService.getTodaySchedule(patientId);
    return { success: true, data: schedule };
  }

  @Get('patient/:patientId/adherence')
  async getAdherence(@Param('patientId') patientId: string, @Query('days') days?: number) {
    const adherence = await this.medicationsService.getAdherence(patientId, days || 30);
    return { success: true, data: adherence };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const medication = await this.medicationsService.findOne(id);
    return { success: true, data: medication };
  }

  @Put(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const medication = await this.medicationsService.update(id, dto, user.id);
    return { success: true, data: medication };
  }

  @Post(':id/taken')
  async markTaken(
    @Param('id') id: string,
    @Body() dto: MarkTakenDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const log = await this.medicationsService.markTaken(id, dto, user.id);
    return { success: true, data: log };
  }

  @Post(':id/skip')
  async skip(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const log = await this.medicationsService.skip(id, reason, user.id);
    return { success: true, data: log };
  }

  @Post(':id/refill')
  async requestRefill(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const result = await this.medicationsService.requestRefill(id, user.id);
    return { success: true, data: result };
  }

  @Post(':id/discontinue')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async discontinue(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const medication = await this.medicationsService.discontinue(id, reason, user.id);
    return { success: true, data: medication };
  }

  @Delete(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    const medication = await this.medicationsService.remove(id, user.id);
    return { success: true, data: medication };
  }
}
