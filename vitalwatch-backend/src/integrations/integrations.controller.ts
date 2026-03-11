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
import { IsOptional, IsString, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';
import { UserRole } from '../users/entities/user.entity';

class ConfigureIntegrationDto {
  @IsOptional() @IsString() apiKey?: string;
  @IsOptional() @IsString() apiSecret?: string;
  @IsOptional() @IsString() webhookUrl?: string;
  @IsOptional() @IsObject() settings?: Record<string, any>;
}

class TestIntegrationDto {
  @IsOptional() @IsObject() testData?: Record<string, any>;
}

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async listIntegrations() {
    return this.integrationsService.listIntegrations();
  }

  @Get(':name')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getIntegration(@Param('name') name: string) {
    return this.integrationsService.getIntegration(name);
  }

  @Put(':name/configure')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async configureIntegration(
    @Param('name') name: string,
    @Body() dto: ConfigureIntegrationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.integrationsService.configureIntegration(name, dto, user);
  }

  @Post(':name/enable')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async enableIntegration(@Param('name') name: string, @CurrentUser() user: CurrentUserPayload) {
    return this.integrationsService.enableIntegration(name, user);
  }

  @Post(':name/disable')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async disableIntegration(@Param('name') name: string, @CurrentUser() user: CurrentUserPayload) {
    return this.integrationsService.disableIntegration(name, user);
  }

  @Post(':name/test')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async testIntegration(
    @Param('name') name: string,
    @Body() dto: TestIntegrationDto,
  ) {
    return this.integrationsService.testIntegration(name, dto);
  }

  // Zoho SMTP endpoints
  @Post('zoho/send-email')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async sendEmail(
    @Body() dto: { to: string; subject: string; body: string; html?: boolean },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.integrationsService.sendZohoEmail(dto, user);
  }

  @Get('zoho/templates')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getEmailTemplates() {
    return this.integrationsService.getEmailTemplates();
  }

  // OpenAI endpoints
  @Post('openai/analyze')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async analyzeWithOpenAI(
    @Body() dto: { prompt: string; context?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.integrationsService.analyzeWithOpenAI(dto, user);
  }

  @Post('openai/generate-insight')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async generateInsight(
    @Body() dto: { patientId: string; vitalData: any },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.integrationsService.generateOpenAIInsight(dto, user);
  }

  // Grok AI endpoints
  @Post('grok/analyze')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async analyzeWithGrok(
    @Body() dto: { data: any; analysisType: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.integrationsService.analyzeWithGrok(dto, user);
  }

  @Post('grok/real-time')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async grokRealTimeAnalysis(
    @Body() dto: { vitalReading: any },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.integrationsService.grokRealTimeAnalysis(dto, user);
  }

  // Twilio endpoints
  @Post('twilio/send-sms')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PROVIDER)
  async sendSms(
    @Body() dto: { to: string; message: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.integrationsService.sendTwilioSms(dto, user);
  }

  @Get('twilio/status/:messageId')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getSmsStatus(@Param('messageId') messageId: string) {
    return this.integrationsService.getTwilioMessageStatus(messageId);
  }

  // Tenovi device endpoints
  @Get('tenovi/devices')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getTenoviDevices() {
    return this.integrationsService.getTenoviDevices();
  }

  @Post('tenovi/sync')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async syncTenoviDevices(@CurrentUser() user: CurrentUserPayload) {
    return this.integrationsService.syncTenoviDevices(user);
  }
}
