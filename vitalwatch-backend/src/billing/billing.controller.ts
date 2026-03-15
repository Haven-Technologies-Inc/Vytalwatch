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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
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

  @Get('invoices/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.getInvoice(id);
  }

  // Customer Management
  @Post('create-customer')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createCustomer(
    @Body() dto: { email: string; name: string; organizationId?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.billingService.createStripeCustomer(dto, user);
  }

  @Get('customer/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getCustomer(@Param('id') id: string) {
    return this.billingService.getStripeCustomer(id);
  }

  @Get('customer')
  @Roles(UserRole.ADMIN, UserRole.PROVIDER)
  async getCurrentCustomer(@CurrentUser() user: CurrentUserPayload) {
    return this.billingService.getCurrentCustomer(user);
  }

  // Checkout Session
  @Post('create-checkout-session')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createCheckoutSession(
    @Body() dto: { priceId: string; successUrl: string; cancelUrl: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.billingService.createCheckoutSession(dto, user);
  }

  // Payment Methods
  @Get('payment-methods')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getPaymentMethods(@CurrentUser() user: CurrentUserPayload) {
    return this.billingService.getPaymentMethods(user);
  }

  @Post('payment-methods')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async addPaymentMethod(
    @Body() dto: { paymentMethodId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.billingService.addPaymentMethod(dto.paymentMethodId, user);
  }

  @Delete('payment-methods/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePaymentMethod(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.billingService.deletePaymentMethod(id, user);
  }

  @Put('payment-methods/:id/default')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async setDefaultPaymentMethod(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.billingService.setDefaultPaymentMethod(id, user);
  }

  // Usage
  @Get('usage')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getUsage(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.getUsage(user, { startDate, endDate });
  }

  // Pricing Plans
  @Get('plans')
  async getPricingPlans() {
    return this.billingService.getPricingPlans();
  }

  @Get('plans/:id')
  async getPricingPlan(@Param('id') id: string) {
    return this.billingService.getPricingPlan(id);
  }

  // Setup Intent (for adding payment methods)
  @Post('setup-intent')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createSetupIntent(@CurrentUser() user: CurrentUserPayload) {
    return this.billingService.createSetupIntent(user);
  }

  // Webhook (Stripe)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.billingService.handleStripeWebhook(req.rawBody, signature);
  }
}
