import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, SubscriptionStatus, PlanType } from './entities/subscription.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { BillingRecord, CPTCode, BillingStatus } from './entities/billing-record.entity';
import { AuditService } from '../audit/audit.service';
import { EnterpriseLoggingService } from '../enterprise-logging/enterprise-logging.service';
import { ApiOperation } from '../enterprise-logging/entities/api-audit-log.entity';

export interface CreateSubscriptionDto {
  userId: string;
  organizationId?: string;
  plan: PlanType;
  paymentMethodId?: string;
}

export interface CreateBillingRecordDto {
  patientId: string;
  providerId: string;
  organizationId?: string;
  cptCode: CPTCode;
  serviceDate: Date;
  minutesSpent?: number;
  daysWithReadings?: number;
  notes?: string;
  supportingData?: BillingRecord['supportingData'];
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  private readonly PLAN_CONFIGS: Record<PlanType, {
    priceId: string;
    monthlyPrice: number;
    patientLimit: number;
    providerLimit: number;
  }> = {
    [PlanType.STARTER]: {
      priceId: '',
      monthlyPrice: 299,
      patientLimit: 50,
      providerLimit: 3,
    },
    [PlanType.PRO]: {
      priceId: '',
      monthlyPrice: 799,
      patientLimit: 200,
      providerLimit: 10,
    },
    [PlanType.ENTERPRISE]: {
      priceId: '',
      monthlyPrice: 0, // Custom pricing
      patientLimit: -1, // Unlimited
      providerLimit: -1,
    },
  };

  private readonly CPT_RATES: Record<CPTCode, number> = {
    [CPTCode.INITIAL_SETUP]: 19.46,
    [CPTCode.DEVICE_SUPPLY]: 63.16,
    [CPTCode.CLINICAL_REVIEW_20]: 51.54,
    [CPTCode.CLINICAL_REVIEW_ADDITIONAL]: 42.22,
  };

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(BillingRecord)
    private readonly billingRecordRepository: Repository<BillingRecord>,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly enterpriseLogger: EnterpriseLoggingService,
  ) {
    this.initializeStripe();
    this.initializePriceIds();
  }

  private initializeStripe(): void {
    const secretKey = this.configService.get('stripe.secretKey');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  private initializePriceIds(): void {
    const prices = this.configService.get('stripe.prices');
    if (prices) {
      this.PLAN_CONFIGS[PlanType.STARTER].priceId = prices.starter;
      this.PLAN_CONFIGS[PlanType.PRO].priceId = prices.pro;
      this.PLAN_CONFIGS[PlanType.ENTERPRISE].priceId = prices.enterprise;
    }
  }

  // Subscription Management
  async createSubscription(dto: CreateSubscriptionDto): Promise<Subscription> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const planConfig = this.PLAN_CONFIGS[dto.plan];

    // Create or get Stripe customer
    const startTime = Date.now();
    let customer: Stripe.Customer;
    try {
      customer = await this.stripe.customers.create({
        metadata: { userId: dto.userId, organizationId: dto.organizationId || '' },
      });
      await this.enterpriseLogger.logPayment({
        operation: ApiOperation.CUSTOMER_CREATE, userId: dto.userId, organizationId: dto.organizationId,
        endpoint: '/v1/customers', method: 'POST', success: true, durationMs: Date.now() - startTime,
        metadata: { stripeCustomerId: customer.id },
      });
    } catch (error) {
      await this.enterpriseLogger.logPayment({
        operation: ApiOperation.CUSTOMER_CREATE, userId: dto.userId, success: false,
        errorMessage: error.message, durationMs: Date.now() - startTime,
      });
      throw error;
    }

    // Create subscription in Stripe
    const subStartTime = Date.now();
    let stripeSubscription: Stripe.Subscription;
    try {
      stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: planConfig.priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      await this.enterpriseLogger.logPayment({
        operation: ApiOperation.SUBSCRIPTION_CREATE, userId: dto.userId, organizationId: dto.organizationId,
        endpoint: '/v1/subscriptions', method: 'POST', success: true, durationMs: Date.now() - subStartTime,
        amount: planConfig.monthlyPrice, currency: 'usd', metadata: { subscriptionId: stripeSubscription.id, plan: dto.plan },
      });
    } catch (error) {
      await this.enterpriseLogger.logPayment({
        operation: ApiOperation.SUBSCRIPTION_CREATE, userId: dto.userId, success: false,
        errorMessage: error.message, durationMs: Date.now() - subStartTime,
      });
      throw error;
    }

    // Create local subscription record
    const subscription = this.subscriptionRepository.create({
      userId: dto.userId,
      organizationId: dto.organizationId,
      plan: dto.plan,
      status: SubscriptionStatus.INCOMPLETE,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: planConfig.priceId,
      monthlyPrice: planConfig.monthlyPrice,
      patientLimit: planConfig.patientLimit,
      providerLimit: planConfig.providerLimit,
      currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
    });

    const saved = await this.subscriptionRepository.save(subscription);

    await this.auditService.log({
      action: 'SUBSCRIPTION_CREATED',
      userId: dto.userId,
      resourceType: 'subscription',
      resourceId: saved.id,
      details: { plan: dto.plan },
    });

    return saved;
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async getSubscriptionByOrganization(organizationId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { organizationId },
    });
  }

  async cancelSubscription(id: string, userId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (this.stripe && subscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    subscription.status = SubscriptionStatus.CANCELED;
    subscription.canceledAt = new Date();

    const updated = await this.subscriptionRepository.save(subscription);

    await this.auditService.log({
      action: 'SUBSCRIPTION_CANCELLED',
      userId,
      resourceType: 'subscription',
      resourceId: id,
    });

    return updated;
  }

  private async createInvoiceFromStripe(stripeInvoice: Stripe.Invoice): Promise<Invoice> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeCustomerId: stripeInvoice.customer as string },
    });

    const invoiceData: any = {
      userId: subscription?.userId,
      organizationId: subscription?.organizationId,
      status: (stripeInvoice as any).paid ? InvoiceStatus.PAID : InvoiceStatus.OPEN,
      stripeInvoiceId: stripeInvoice.id,
      stripePaymentIntentId: (stripeInvoice as any).payment_intent as string,
      subtotal: stripeInvoice.subtotal / 100,
      tax: (stripeInvoice as any).tax ? (stripeInvoice as any).tax / 100 : 0,
      total: stripeInvoice.total / 100,
      currency: stripeInvoice.currency,
      periodStart: stripeInvoice.period_start ? new Date(stripeInvoice.period_start * 1000) : null,
      periodEnd: stripeInvoice.period_end ? new Date(stripeInvoice.period_end * 1000) : null,
      paidAt: (stripeInvoice as any).paid ? new Date() : null,
      invoicePdfUrl: stripeInvoice.invoice_pdf || undefined,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || undefined,
    };

    const invoice = this.invoiceRepository.create(invoiceData);
    return this.invoiceRepository.save(invoice) as unknown as Invoice;
  }

  // CPT Billing Records
  async createBillingRecord(dto: CreateBillingRecordDto): Promise<BillingRecord> {
    const billingPeriodStart = new Date(dto.serviceDate);
    billingPeriodStart.setDate(1);

    const billingPeriodEnd = new Date(billingPeriodStart);
    billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);
    billingPeriodEnd.setDate(0);

    // Check eligibility based on CPT code
    await this.validateCPTCodeEligibility(dto);

    const amount = this.CPT_RATES[dto.cptCode];

    const record = this.billingRecordRepository.create({
      ...dto,
      billingPeriodStart,
      billingPeriodEnd,
      amount,
      status: BillingStatus.PENDING,
    });

    return this.billingRecordRepository.save(record);
  }

  private async validateCPTCodeEligibility(dto: CreateBillingRecordDto): Promise<void> {
    const { patientId, cptCode, serviceDate } = dto;

    const billingPeriodStart = new Date(serviceDate);
    billingPeriodStart.setDate(1);
    const billingPeriodEnd = new Date(billingPeriodStart);
    billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);
    billingPeriodEnd.setDate(0);

    switch (cptCode) {
      case CPTCode.INITIAL_SETUP:
        // 99453 can only be billed once per patient
        const existingSetup = await this.billingRecordRepository.findOne({
          where: { patientId, cptCode: CPTCode.INITIAL_SETUP },
        });
        if (existingSetup) {
          throw new BadRequestException('Initial setup (99453) already billed for this patient');
        }
        break;

      case CPTCode.DEVICE_SUPPLY:
        // 99454 requires at least 16 days of readings per month
        if (dto.daysWithReadings && dto.daysWithReadings < 16) {
          throw new BadRequestException('Device supply (99454) requires at least 16 days of readings');
        }
        break;

      case CPTCode.CLINICAL_REVIEW_20:
        // 99457 requires at least 20 minutes of interaction
        if (dto.minutesSpent && dto.minutesSpent < 20) {
          throw new BadRequestException('Clinical review (99457) requires at least 20 minutes');
        }
        break;

      case CPTCode.CLINICAL_REVIEW_ADDITIONAL:
        // 99458 can be billed up to 2 times per month after 99457
        const existingBase = await this.billingRecordRepository.findOne({
          where: {
            patientId,
            cptCode: CPTCode.CLINICAL_REVIEW_20,
            billingPeriodStart: MoreThanOrEqual(billingPeriodStart),
            billingPeriodEnd: LessThanOrEqual(billingPeriodEnd),
          },
        });
        if (!existingBase) {
          throw new BadRequestException('Additional review (99458) requires base review (99457) first');
        }

        const additionalCount = await this.billingRecordRepository.count({
          where: {
            patientId,
            cptCode: CPTCode.CLINICAL_REVIEW_ADDITIONAL,
            billingPeriodStart: MoreThanOrEqual(billingPeriodStart),
            billingPeriodEnd: LessThanOrEqual(billingPeriodEnd),
          },
        });
        if (additionalCount >= 2) {
          throw new BadRequestException('Maximum of 2 additional reviews (99458) per month');
        }
        break;
    }
  }

  async getBillingRecords(options: {
    patientId?: string;
    providerId?: string;
    organizationId?: string;
    status?: BillingStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ records: BillingRecord[]; total: number }> {
    const { patientId, providerId, organizationId, status, startDate, endDate, page = 1, limit = 50 } = options;

    const queryBuilder = this.billingRecordRepository.createQueryBuilder('record');

    if (patientId) queryBuilder.andWhere('record.patientId = :patientId', { patientId });
    if (providerId) queryBuilder.andWhere('record.providerId = :providerId', { providerId });
    if (organizationId) queryBuilder.andWhere('record.organizationId = :organizationId', { organizationId });
    if (status) queryBuilder.andWhere('record.status = :status', { status });
    if (startDate && endDate) {
      queryBuilder.andWhere('record.serviceDate BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    queryBuilder
      .leftJoinAndSelect('record.patient', 'patient')
      .leftJoinAndSelect('record.provider', 'provider')
      .orderBy('record.serviceDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [records, total] = await queryBuilder.getManyAndCount();

    return { records, total };
  }

  async submitBillingRecord(id: string): Promise<BillingRecord> {
    const record = await this.billingRecordRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Billing record not found');
    }

    record.status = BillingStatus.SUBMITTED;
    record.submittedAt = new Date();

    return this.billingRecordRepository.save(record);
  }

  async getBillingStats(organizationId?: string): Promise<{
    totalRevenue: number;
    pendingAmount: number;
    recordsByStatus: Record<BillingStatus, number>;
    recordsByCPT: Record<CPTCode, number>;
  }> {
    const baseWhere = organizationId ? { organizationId } : {};

    const records = await this.billingRecordRepository.find({ where: baseWhere });

    const totalRevenue = records
      .filter(r => r.status === BillingStatus.PAID)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const pendingAmount = records
      .filter(r => r.status === BillingStatus.PENDING || r.status === BillingStatus.SUBMITTED)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const recordsByStatus = {
      [BillingStatus.PENDING]: 0,
      [BillingStatus.SUBMITTED]: 0,
      [BillingStatus.APPROVED]: 0,
      [BillingStatus.DENIED]: 0,
      [BillingStatus.PAID]: 0,
    };

    const recordsByCPT = {
      [CPTCode.INITIAL_SETUP]: 0,
      [CPTCode.DEVICE_SUPPLY]: 0,
      [CPTCode.CLINICAL_REVIEW_20]: 0,
      [CPTCode.CLINICAL_REVIEW_ADDITIONAL]: 0,
    };

    records.forEach(r => {
      recordsByStatus[r.status]++;
      recordsByCPT[r.cptCode]++;
    });

    return { totalRevenue, pendingAmount, recordsByStatus, recordsByCPT };
  }

  // Invoice Management
  async getInvoices(options: {
    userId?: string;
    organizationId?: string;
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
  }): Promise<{ invoices: Invoice[]; total: number }> {
    const { userId, organizationId, status, page = 1, limit = 20 } = options;

    const queryBuilder = this.invoiceRepository.createQueryBuilder('invoice');

    if (userId) queryBuilder.andWhere('invoice.userId = :userId', { userId });
    if (organizationId) queryBuilder.andWhere('invoice.organizationId = :organizationId', { organizationId });
    if (status) queryBuilder.andWhere('invoice.status = :status', { status });

    queryBuilder
      .orderBy('invoice.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [invoices, total] = await queryBuilder.getManyAndCount();

    return { invoices, total };
  }

  async getInvoice(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  // Customer Management
  async createStripeCustomer(dto: { email: string; name: string; organizationId?: string }, user: any): Promise<any> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const customer = await this.stripe.customers.create({
      email: dto.email,
      name: dto.name,
      metadata: {
        organizationId: dto.organizationId || '',
        createdBy: user.sub,
      },
    });

    await this.auditService.log({
      action: 'STRIPE_CUSTOMER_CREATED',
      userId: user.sub,
      details: { customerId: customer.id },
    });

    return customer;
  }

  async getStripeCustomer(customerId: string): Promise<any> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    return this.stripe.customers.retrieve(customerId);
  }

  async getCurrentCustomer(user: any): Promise<any> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId: user.sub },
    });

    if (!subscription?.stripeCustomerId) {
      return null;
    }

    return this.getStripeCustomer(subscription.stripeCustomerId);
  }

  // Checkout Session
  async createCheckoutSession(dto: { priceId: string; successUrl: string; cancelUrl: string }, user: any): Promise<any> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId: user.sub },
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: dto.priceId, quantity: 1 }],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      customer: subscription?.stripeCustomerId || undefined,
      metadata: { userId: user.sub, organizationId: user.organizationId || '' },
    });

    return { sessionId: session.id, url: session.url };
  }

  // Payment Methods
  async getPaymentMethods(user: any): Promise<any[]> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId: user.sub },
    });

    if (!subscription?.stripeCustomerId) {
      return [];
    }

    const methods = await this.stripe.paymentMethods.list({
      customer: subscription.stripeCustomerId,
      type: 'card',
    });

    return methods.data;
  }

  async addPaymentMethod(paymentMethodId: string, user: any): Promise<any> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId: user.sub },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No customer found');
    }

    const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: subscription.stripeCustomerId,
    });

    await this.auditService.log({
      action: 'PAYMENT_METHOD_ADDED',
      userId: user.sub,
      details: { paymentMethodId },
    });

    return paymentMethod;
  }

  async deletePaymentMethod(paymentMethodId: string, user: any): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    await this.stripe.paymentMethods.detach(paymentMethodId);

    await this.auditService.log({
      action: 'PAYMENT_METHOD_DELETED',
      userId: user.sub,
      details: { paymentMethodId },
    });
  }

  async setDefaultPaymentMethod(paymentMethodId: string, user: any): Promise<any> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId: user.sub },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No customer found');
    }

    await this.stripe.customers.update(subscription.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    return { success: true };
  }

  // Usage
  async getUsage(user: any, options: { startDate?: string; endDate?: string }): Promise<any> {
    const records = await this.billingRecordRepository.find({
      where: { organizationId: user.organizationId },
    });

    const totalBillable = records.reduce((sum, r) => sum + Number(r.amount), 0);
    
    return {
      totalBillable,
      recordCount: records.length,
      byCode: {
        [CPTCode.INITIAL_SETUP]: records.filter(r => r.cptCode === CPTCode.INITIAL_SETUP).length,
        [CPTCode.DEVICE_SUPPLY]: records.filter(r => r.cptCode === CPTCode.DEVICE_SUPPLY).length,
        [CPTCode.CLINICAL_REVIEW_20]: records.filter(r => r.cptCode === CPTCode.CLINICAL_REVIEW_20).length,
        [CPTCode.CLINICAL_REVIEW_ADDITIONAL]: records.filter(r => r.cptCode === CPTCode.CLINICAL_REVIEW_ADDITIONAL).length,
      },
      period: options,
    };
  }

  // Pricing Plans
  async getPricingPlans(): Promise<any[]> {
    return [
      {
        id: 'starter',
        name: 'Starter',
        price: 299,
        interval: 'month',
        features: ['Up to 50 patients', '3 providers', 'Basic analytics', 'Email support'],
        patientLimit: 50,
        providerLimit: 3,
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 799,
        interval: 'month',
        features: ['Up to 200 patients', '10 providers', 'Advanced analytics', 'Priority support', 'API access'],
        patientLimit: 200,
        providerLimit: 10,
        popular: true,
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        interval: 'month',
        features: ['Unlimited patients', 'Unlimited providers', 'Custom integrations', 'Dedicated support', 'SLA guarantee'],
        patientLimit: -1,
        providerLimit: -1,
        custom: true,
      },
    ];
  }

  async getPricingPlan(id: string): Promise<any> {
    const plans = await this.getPricingPlans();
    return plans.find(p => p.id === id);
  }

  // Setup Intent
  async createSetupIntent(user: any): Promise<any> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId: user.sub },
    });

    const setupIntent = await this.stripe.setupIntents.create({
      customer: subscription?.stripeCustomerId || undefined,
      payment_method_types: ['card'],
    });

    return { clientSecret: setupIntent.client_secret };
  }

  // Stripe Webhook
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<any> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const webhookSecret = this.configService.get('stripe.webhookSecret');
    
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.enterpriseLogger.logPayment({
      operation: ApiOperation.WEBHOOK_RECEIVED, success: true,
      endpoint: '/billing/webhook', method: 'POST',
      metadata: { eventType: event.type, eventId: event.id },
    });

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return { received: true };
  }

  private async handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = this.mapStripeStatus(stripeSubscription.status);
      subscription.currentPeriodEnd = new Date((stripeSubscription as any).current_period_end * 1000);
      await this.subscriptionRepository.save(subscription);
    }
  }

  private async handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (invoice) {
      invoice.status = InvoiceStatus.PAID;
      invoice.paidAt = new Date();
      await this.invoiceRepository.save(invoice);
    }
  }

  private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    if (invoice) {
      invoice.status = InvoiceStatus.FAILED;
      await this.invoiceRepository.save(invoice);
    }
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const mapping: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.PAST_DUE,
    };
    return mapping[status] || SubscriptionStatus.INCOMPLETE;
  }
}
