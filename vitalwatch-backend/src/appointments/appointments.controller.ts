import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  AppointmentQueryDto,
} from './dto/appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: CurrentUserPayload) {
    const appointment = await this.appointmentsService.create(dto, user.id);
    return { success: true, data: appointment };
  }

  @Get()
  async findAll(@Query() query: AppointmentQueryDto, @CurrentUser() user: CurrentUserPayload) {
    if (user.role === UserRole.PATIENT) {
      query.patientId = user.id;
    }
    const result = await this.appointmentsService.findAll(query);
    return { success: true, data: result };
  }

  @Get('upcoming')
  async getUpcoming(@CurrentUser() user: CurrentUserPayload) {
    const patientId = user.role === UserRole.PATIENT ? user.id : undefined;
    if (!patientId) {
      return { success: true, data: [] };
    }
    const appointments = await this.appointmentsService.findUpcoming(patientId);
    return { success: true, data: appointments };
  }

  @Get('patient/:patientId')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findByPatient(@Param('patientId') patientId: string) {
    const appointments = await this.appointmentsService.findByPatient(patientId);
    return { success: true, data: appointments };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const appointment = await this.appointmentsService.findOne(id);
    return { success: true, data: appointment };
  }

  @Put(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const appointment = await this.appointmentsService.update(id, dto, user.id);
    return { success: true, data: appointment };
  }

  @Post(':id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const appointment = await this.appointmentsService.reschedule(id, dto, user.id);
    return { success: true, data: appointment };
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const appointment = await this.appointmentsService.cancel(id, dto, user.id);
    return { success: true, data: appointment };
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const appointment = await this.appointmentsService.confirm(id, user.id);
    return { success: true, data: appointment };
  }

  @Post(':id/complete')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async complete(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const appointment = await this.appointmentsService.complete(id, notes, user.id);
    return { success: true, data: appointment };
  }
}
