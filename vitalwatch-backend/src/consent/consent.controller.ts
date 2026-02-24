import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ConsentService } from './consent.service';
import {
  CreateConsentTemplateDto,
  UpdateConsentTemplateDto,
  SendConsentDto,
  SignConsentDto,
  WitnessConsentDto,
  GuardianSignConsentDto,
  RevokeConsentDto,
  ConsentFilterDto,
} from './dto/consent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ConsentType } from './entities/consent.entity';

@Controller('consents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('templates')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createTemplate(
    @Body() dto: CreateConsentTemplateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consentService.createTemplate(dto, user);
  }

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  async findAllTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.consentService.findAllTemplates(user);
  }

  @Get('templates/:id')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async findTemplate(@Param('id') id: string) {
    return this.consentService.findTemplateById(id);
  }

  @Put('templates/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateConsentTemplateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consentService.updateTemplate(id, dto, user);
  }

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async sendConsent(
    @Body() dto: SendConsentDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    return this.consentService.sendConsent(dto, user, ip, userAgent);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.SUPERADMIN)
  async findAllConsents(
    @Query() filters: ConsentFilterDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consentService.findAllConsents(filters, user);
  }

  @Get('patient/:patientId')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async findPatientConsents(
    @Param('patientId') patientId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consentService.findPatientConsents(patientId, user);
  }

  @Get('patient/:patientId/pending')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async getPendingConsents(@Param('patientId') patientId: string) {
    return this.consentService.getPendingConsents(patientId);
  }

  @Get('patient/:patientId/status/:type')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async getConsentStatus(
    @Param('patientId') patientId: string,
    @Param('type') type: ConsentType,
  ) {
    return this.consentService.getConsentStatus(patientId, type);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async findOne(@Param('id') id: string) {
    return this.consentService.findConsentById(id);
  }

  @Post(':id/sign')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async signConsent(
    @Param('id') id: string,
    @Body() dto: SignConsentDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    return this.consentService.signConsent(id, dto, user, ip, userAgent);
  }

  @Post(':id/witness')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async witnessConsent(
    @Param('id') id: string,
    @Body() dto: WitnessConsentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consentService.witnessConsent(id, dto, user);
  }

  @Post(':id/guardian-sign')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER, UserRole.PATIENT)
  async guardianSign(
    @Param('id') id: string,
    @Body() dto: GuardianSignConsentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consentService.guardianSign(id, dto, user);
  }

  @Post(':id/revoke')
  @Roles(UserRole.ADMIN, UserRole.PATIENT)
  async revokeConsent(
    @Param('id') id: string,
    @Body() dto: RevokeConsentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consentService.revokeConsent(id, dto, user);
  }

  @Post(':id/remind')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async sendReminder(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consentService.sendReminder(id, user);
  }

  @Post('seed-templates')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async seedTemplates() {
    return this.consentService.seedDefaultTemplates();
  }
}
