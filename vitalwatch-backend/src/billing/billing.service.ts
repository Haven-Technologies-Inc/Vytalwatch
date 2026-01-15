import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, SubscriptionStatus, PlanType } from './entities/subscription.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { BillingRecord, CPTCode, BillingStatus } from './entities/billing-record.entity';
import { AuditService } from '../audit/audit.service';

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
  ) {
    this.initializeStripe();
    this.initializePriceIds();
  }

  private initializeStripe(): void {
    const secretKey = this.configService.get('stripe.secretKey');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
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
    const customer = await this.stripe.customers.create({
      metadata: {
        userId: dto.userId,
        organizationId: dto.organizationId || '',
      },
    });

    // Create subscription in Stripe
    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: planConfig.priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

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
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
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

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private async handleInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeCustomerId: stripeInvoice.customer as string },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.ACTIVE;
      await this.subscriptionRepository.save(subscription);
    }

    // Create invoice record
    await this.createInvoiceFromStripe(stripeInvoice);
  }

  private async handleInvoicePaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeCustomerId: stripeInvoice.customer as string },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.PAST_DUE;
      await this.subscriptionRepository.save(subscription);
    }
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = stripeSubscription.status as SubscriptionStatus;
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      await this.subscriptionRepository.save(subscription);
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();
      await this.subscriptionRepository.save(subscription);
    }
  }

  private async createInvoiceFromStripe(stripeInvoice: Stripe.Invoice): Promise<Invoice> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeCustomerId: stripeInvoice.customer as string },
    });

    const invoice = this.invoiceRepository.create({
      userId: subscription?.userId,
      organizationId: subscription?.organizationId,
      status: stripeInvoice.paid ? InvoiceStatus.PAID : InvoiceStatus.OPEN,
      stripeInvoiceId: stripeInvoice.id,
      stripePaymentIntentId: stripeInvoice.payment_intent as string,
      subtotal: stripeInvoice.subtotal / 100,
      tax: stripeInvoice.tax ? stripeInvoice.tax / 100 : 0,
      total: stripeInvoice.total / 100,
      currency: stripeInvoice.currency,
      periodStart: stripeInvoice.period_start ? new Date(stripeInvoice.period_start * 1000) : null,
      periodEnd: stripeInvoice.period_end ? new Date(stripeInvoice.period_end * 1000) : null,
      paidAt: stripeInvoice.paid ? new Date() : null,
      invoicePdfUrl: stripeInvoice.invoice_pdf || undefined,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url || undefined,
    });

    return this.invoiceRepository.save(invoice);
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
}
