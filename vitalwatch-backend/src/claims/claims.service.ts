import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Claim, ClaimStatus, ClaimType } from './entities/claim.entity';
import { BillingService } from '../billing/billing.service';
import { AuditService } from '../audit/audit.service';

export interface CreateClaimDto {
  type: ClaimType;
  patientId: string;
  providerId: string;
  organizationId?: string;
  serviceDate: Date;
  serviceEndDate?: Date;
  cptCodes: Array<{
    code: string;
    description: string;
    units: number;
    charge: number;
    modifiers?: string[];
  }>;
  diagnosisCodes: Array<{
    code: string;
    description: string;
    isPrimary: boolean;
  }>;
  primaryInsuranceName?: string;
  primaryInsuranceId?: string;
  primaryGroupNumber?: string;
  secondaryInsuranceName?: string;
  secondaryInsuranceId?: string;
  billingRecordIds?: string[];
  vitalReadingIds?: string[];
  alertIds?: string[];
  clinicalNoteIds?: string[];
  notes?: string;
}

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    @InjectRepository(Claim)
    private readonly claimRepository: Repository<Claim>,
    private readonly billingService: BillingService,
    private readonly auditService: AuditService,
  ) {}

  async create(createClaimDto: CreateClaimDto, createdBy: string): Promise<Claim> {
    // Calculate total charge
    const totalCharge = createClaimDto.cptCodes.reduce(
      (sum, cpt) => sum + cpt.charge * cpt.units,
      0
    );

    // Generate unique claim number
    const claimNumber = await this.generateClaimNumber();

    const claim = this.claimRepository.create({
      ...createClaimDto,
      claimNumber,
      totalCharge,
      status: ClaimStatus.DRAFT,
    });

    const saved = await this.claimRepository.save(claim);

    await this.auditService.log({
      action: 'CLAIM_CREATED',
      userId: createdBy,
      resourceType: 'claim',
      resourceId: saved.id,
      details: { claimNumber, type: createClaimDto.type, totalCharge },
    });

    return saved;
  }

  async createFromBillingRecords(
    billingRecordIds: string[],
    patientId: string,
    providerId: string,
    insuranceInfo: any,
    createdBy: string
  ): Promise<Claim> {
    // Get billing records
    const billingRecords = await this.billingService.findByIds(billingRecordIds);

    if (billingRecords.length === 0) {
      throw new NotFoundException('No billing records found');
    }

    // Extract CPT codes and aggregate
    const cptCodes = billingRecords.map(record => ({
      code: record.cptCode,
      description: this.getCPTDescription(record.cptCode),
      units: 1,
      charge: record.amount,
      modifiers: [],
    }));

    // Get service date range
    const serviceDates = billingRecords.map(r => new Date(r.serviceDate));
    const serviceDate = new Date(Math.min(...serviceDates.map(d => d.getTime())));
    const serviceEndDate = new Date(Math.max(...serviceDates.map(d => d.getTime())));

    // Get diagnosis codes from patient conditions
    const diagnosisCodes = [
      { code: 'I10', description: 'Essential (primary) hypertension', isPrimary: true },
      // In production, fetch from patient record
    ];

    // Collect supporting data IDs
    const vitalReadingIds = billingRecords
      .filter(r => r.supportingData?.vitalReadingIds)
      .flatMap(r => r.supportingData.vitalReadingIds);

    const alertIds = billingRecords
      .filter(r => r.supportingData?.alertIds)
      .flatMap(r => r.supportingData.alertIds);

    return this.create(
      {
        type: ClaimType.RPM,
        patientId,
        providerId,
        serviceDate,
        serviceEndDate,
        cptCodes,
        diagnosisCodes,
        ...insuranceInfo,
        billingRecordIds,
        vitalReadingIds,
        alertIds,
      },
      createdBy
    );
  }

  async findById(id: string): Promise<Claim | null> {
    return this.claimRepository.findOne({
      where: { id },
      relations: ['patient', 'provider'],
    });
  }

  async findAll(options: {
    patientId?: string;
    providerId?: string;
    organizationId?: string;
    status?: ClaimStatus;
    type?: ClaimType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ claims: Claim[]; total: number }> {
    const { patientId, providerId, organizationId, status, type, startDate, endDate, page = 1, limit = 20 } = options;

    const queryBuilder = this.claimRepository.createQueryBuilder('claim');

    if (patientId) queryBuilder.andWhere('claim.patientId = :patientId', { patientId });
    if (providerId) queryBuilder.andWhere('claim.providerId = :providerId', { providerId });
    if (organizationId) queryBuilder.andWhere('claim.organizationId = :organizationId', { organizationId });
    if (status) queryBuilder.andWhere('claim.status = :status', { status });
    if (type) queryBuilder.andWhere('claim.type = :type', { type });

    if (startDate && endDate) {
      queryBuilder.andWhere('claim.serviceDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    queryBuilder
      .leftJoinAndSelect('claim.patient', 'patient')
      .leftJoinAndSelect('claim.provider', 'provider')
      .orderBy('claim.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [claims, total] = await queryBuilder.getManyAndCount();

    return { claims, total };
  }

  async submit(id: string, submittedBy: string): Promise<Claim> {
    const claim = await this.findById(id);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    claim.status = ClaimStatus.SUBMITTED;
    claim.submittedAt = new Date();
    claim.submittedBy = submittedBy;
    claim.submissionMethod = 'electronic';

    const updated = await this.claimRepository.save(claim);

    await this.auditService.log({
      action: 'CLAIM_SUBMITTED',
      userId: submittedBy,
      resourceType: 'claim',
      resourceId: id,
      details: { claimNumber: claim.claimNumber },
    });

    return updated;
  }

  async recordPayment(
    id: string,
    paidAmount: number,
    adjustedAmount: number = 0,
    patientResponsibility: number = 0
  ): Promise<Claim> {
    const claim = await this.findById(id);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    claim.paidAmount = paidAmount;
    claim.adjustedAmount = adjustedAmount;
    claim.patientResponsibility = patientResponsibility;
    claim.paymentReceivedAt = new Date();

    // Update status based on payment
    if (paidAmount >= claim.totalCharge - adjustedAmount) {
      claim.status = ClaimStatus.PAID;
    } else if (paidAmount > 0) {
      claim.status = ClaimStatus.PARTIALLY_PAID;
    }

    const updated = await this.claimRepository.save(claim);

    await this.auditService.log({
      action: 'CLAIM_PAYMENT_RECORDED',
      userId: 'system',
      resourceType: 'claim',
      resourceId: id,
      details: { paidAmount, adjustedAmount, patientResponsibility },
    });

    return updated;
  }

  async deny(id: string, denialReason: string, denialDetails?: string): Promise<Claim> {
    const claim = await this.findById(id);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    claim.status = ClaimStatus.DENIED;
    claim.denialReason = denialReason;
    claim.denialDetails = denialDetails;
    claim.responseReceivedAt = new Date();

    const updated = await this.claimRepository.save(claim);

    await this.auditService.log({
      action: 'CLAIM_DENIED',
      userId: 'system',
      resourceType: 'claim',
      resourceId: id,
      details: { denialReason },
    });

    return updated;
  }

  async appeal(id: string, appealReason: string, appealedBy: string): Promise<Claim> {
    const claim = await this.findById(id);
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.status !== ClaimStatus.DENIED) {
      throw new Error('Only denied claims can be appealed');
    }

    claim.status = ClaimStatus.APPEALED;
    claim.appealedAt = new Date();
    claim.appealReason = appealReason;

    const updated = await this.claimRepository.save(claim);

    await this.auditService.log({
      action: 'CLAIM_APPEALED',
      userId: appealedBy,
      resourceType: 'claim',
      resourceId: id,
      details: { appealReason },
    });

    return updated;
  }

  async getClaimStats(organizationId?: string): Promise<{
    total: number;
    submitted: number;
    paid: number;
    denied: number;
    totalBilled: number;
    totalCollected: number;
    collectionRate: number;
  }> {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;

    const [total, submitted, paid, denied] = await Promise.all([
      this.claimRepository.count({ where }),
      this.claimRepository.count({ where: { ...where, status: ClaimStatus.SUBMITTED } }),
      this.claimRepository.count({ where: { ...where, status: ClaimStatus.PAID } }),
      this.claimRepository.count({ where: { ...where, status: ClaimStatus.DENIED } }),
    ]);

    const claims = await this.claimRepository.find({ where });

    const totalBilled = claims.reduce((sum, claim) => sum + Number(claim.totalCharge), 0);
    const totalCollected = claims.reduce((sum, claim) => sum + Number(claim.paidAmount), 0);
    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

    return {
      total,
      submitted,
      paid,
      denied,
      totalBilled,
      totalCollected,
      collectionRate,
    };
  }

  private async generateClaimNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.claimRepository.count();
    const sequence = String(count + 1).padStart(6, '0');

    return `CLM-${year}${month}-${sequence}`;
  }

  private getCPTDescription(code: string): string {
    const descriptions: Record<string, string> = {
      '99453': 'RPM Initial Setup and Patient Education',
      '99454': 'RPM Device Supply with Daily Recording',
      '99457': 'RPM Clinical Review - First 20 Minutes',
      '99458': 'RPM Clinical Review - Additional 20 Minutes',
      '99091': 'Collection and Interpretation of Physiologic Data',
    };

    return descriptions[code] || `CPT Code ${code}`;
  }
}
