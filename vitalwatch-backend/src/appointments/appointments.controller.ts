import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CompleteAppointmentDto } from './dto/complete-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { GetAvailableSlotsDto } from './dto/available-slots.dto';
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
  async create(
    @Body(ValidationPipe) createDto: CreateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.create(createDto, user.sub);
  }

  @Get()
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(@Query(ValidationPipe) queryDto: QueryAppointmentsDto) {
    return this.appointmentsService.findAll(queryDto);
  }

  @Get('calendar')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getCalendar(
    @Query('providerId', ParseUUIDPipe) providerId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.appointmentsService.getCalendar(
      providerId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('available-slots')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getAvailableSlots(@Query(ValidationPipe) dto: GetAvailableSlotsDto) {
    return this.appointmentsService.getAvailableSlots(dto);
  }

  @Get('upcoming')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getUpcoming(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: number,
  ) {
    return this.appointmentsService.getUpcomingAppointments(user.sub, limit);
  }

  @Get('statistics')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getStatistics(
    @Query('providerId') providerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.appointmentsService.getStatistics(
      providerId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('my-appointments')
  @Roles(UserRole.PATIENT)
  async getMyAppointments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.appointmentsService.findAll({
      patientId: user.sub,
      page: page || 1,
      limit: limit || 20,
    });
  }

  @Get('my-schedule')
  @Roles(UserRole.PROVIDER)
  async getMySchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.appointmentsService.findAll({
      providerId: user.sub,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page || 1,
      limit: limit || 50,
    });
  }

  @Get(':id')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.update(id, updateDto, user.sub);
  }

  @Post(':id/confirm')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.confirm(id, user.sub);
  }

  @Post(':id/cancel')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) cancelDto: CancelAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.cancel(id, cancelDto, user.sub);
  }

  @Post(':id/reschedule')
  @Roles(UserRole.PATIENT, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) rescheduleDto: RescheduleAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.reschedule(id, rescheduleDto, user.sub);
  }

  @Post(':id/complete')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) completeDto: CompleteAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.complete(id, completeDto, user.sub);
  }

  @Post(':id/no-show')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.markNoShow(id, user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.appointmentsService.deleteAppointment(id, user.sub);
    return { message: 'Appointment deleted successfully' };
  }
}
