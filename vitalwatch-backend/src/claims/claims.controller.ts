import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClaimsService, CreateClaimDto } from './claims.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async create(@Body() createClaimDto: CreateClaimDto, @Request() req) {
    return this.claimsService.create(createClaimDto, req.user.id);
  }

  @Post('from-billing-records')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async createFromBillingRecords(@Body() body: any, @Request() req) {
    const { billingRecordIds, patientId, providerId, insuranceInfo } = body;
    return this.claimsService.createFromBillingRecords(
      billingRecordIds,
      patientId,
      providerId,
      insuranceInfo,
      req.user.id
    );
  }

  @Get()
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(@Query() query: any) {
    return this.claimsService.findAll({
      patientId: query.patientId,
      providerId: query.providerId,
      organizationId: query.organizationId,
      status: query.status,
      type: query.type,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getStats(@Query('organizationId') organizationId?: string) {
    return this.claimsService.getClaimStats(organizationId);
  }

  @Get(':id')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async findOne(@Param('id') id: string) {
    return this.claimsService.findById(id);
  }

  @Post(':id/submit')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async submit(@Param('id') id: string, @Request() req) {
    return this.claimsService.submit(id, req.user.id);
  }

  @Post(':id/payment')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async recordPayment(@Param('id') id: string, @Body() body: any) {
    return this.claimsService.recordPayment(
      id,
      body.paidAmount,
      body.adjustedAmount,
      body.patientResponsibility
    );
  }

  @Post(':id/deny')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async deny(@Param('id') id: string, @Body() body: any) {
    return this.claimsService.deny(id, body.denialReason, body.denialDetails);
  }

  @Post(':id/appeal')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async appeal(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.claimsService.appeal(id, body.appealReason, req.user.id);
  }
}
