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
import { BillingService, CreateSubscriptionDto, CreateBillingRecordDto } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { BillingStatus } from './entities/billing-record.entity';
import { InvoiceStatus } from './entities/invoice.entity';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // Subscription endpoints
  @Post('subscriptions')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.billingService.createSubscription(dto);
  }

  @Get('subscriptions/current')
  async getCurrentSubscription(@CurrentUser() user: CurrentUserPayload) {
    if (user.organizationId) {
      return this.billingService.getSubscriptionByOrganization(user.organizationId);
    }
    return null;
  }

  @Get('subscriptions/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getSubscription(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.getSubscription(id);
  }

  @Post('subscriptions/:id/cancel')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.billingService.cancelSubscription(id, user.sub);
  }

  // Billing records (CPT codes)
  @Post('records')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async createBillingRecord(@Body() dto: CreateBillingRecordDto) {
    return this.billingService.createBillingRecord(dto);
  }

  @Get('records')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async getBillingRecords(
    @CurrentUser() user: CurrentUserPayload,
    @Query('patientId') patientId?: string,
    @Query('status') status?: BillingStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const providerId = user.role === 'provider' ? user.sub : undefined;

    return this.billingService.getBillingRecords({
      patientId,
      providerId,
      organizationId: user.organizationId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
  }

  @Put('records/:id/submit')
  @Roles(UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async submitBillingRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.submitBillingRecord(id);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getBillingStats(@CurrentUser() user: CurrentUserPayload) {
    return this.billingService.getBillingStats(user.organizationId);
  }

  // Invoices
  @Get('invoices')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getInvoices(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: InvoiceStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.billingService.getInvoices({
      organizationId: user.organizationId,
      status,
      page,
      limit,
    });
  }
}
