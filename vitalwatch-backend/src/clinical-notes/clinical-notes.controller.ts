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
import { ClinicalNotesService } from './clinical-notes.service';
import {
  CreateClinicalNoteDto,
  UpdateClinicalNoteDto,
  SignNoteDto,
  AmendNoteDto,
  CreateCommunicationLogDto,
  NoteFilterDto,
} from './dto/clinical-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('clinical-notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicalNotesController {
  constructor(private readonly clinicalNotesService: ClinicalNotesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async create(
    @Body() dto: CreateClinicalNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async findAll(
    @Query() filters: NoteFilterDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.findAll(filters, user);
  }

  @Get('patient/:patientId')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async findByPatient(
    @Param('patientId') patientId: string,
    @Query('limit') limit: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.findByPatient(patientId, user, limit);
  }

  @Get('patient/:patientId/time-tracking')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async getTimeTracking(
    @Param('patientId') patientId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.getTimeTrackingSummary(
      patientId,
      new Date(startDate),
      new Date(endDate),
      user,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.findOne(id, user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClinicalNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.update(id, dto, user);
  }

  @Post(':id/sign')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async sign(
    @Param('id') id: string,
    @Body() dto: SignNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.sign(id, dto, user);
  }

  @Post(':id/amend')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async amend(
    @Param('id') id: string,
    @Body() dto: AmendNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.amend(id, dto, user);
  }

  @Post(':id/lock')
  @Roles(UserRole.ADMIN)
  async lock(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.lock(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.clinicalNotesService.delete(id, user);
  }

  @Post('communication-log')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async createCommunicationLog(
    @Body() dto: CreateCommunicationLogDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.createCommunicationLog(dto, user);
  }

  @Get('patient/:patientId/communication-logs')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async getCommunicationLogs(
    @Param('patientId') patientId: string,
    @Query('limit') limit: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalNotesService.getCommunicationLogs(patientId, user, limit);
  }
}
