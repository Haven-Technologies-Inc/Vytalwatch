import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PHIAccessLog, PHIAccessType, PHIResourceType } from './entities/phi-access-log.entity';
import { PatientConsent, ConsentType, ConsentStatus } from './entities/patient-consent.entity';
import {
  BusinessAssociateAgreement,
  BAAStatus,
} from './entities/business-associate-agreement.entity';
import { DataRetentionPolicy, RetentionAction } from './entities/data-retention-policy.entity';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @InjectRepository(PHIAccessLog) private phiLogRepo: Repository<PHIAccessLog>,
    @InjectRepository(PatientConsent) private consentRepo: Repository<PatientConsent>,
    @InjectRepository(BusinessAssociateAgreement)
    private baaRepo: Repository<BusinessAssociateAgreement>,
    @InjectRepository(DataRetentionPolicy) private retentionRepo: Repository<DataRetentionPolicy>,
  ) {}

  async logPHIAccess(data: Partial<PHIAccessLog>): Promise<PHIAccessLog> {
    return this.phiLogRepo.save(this.phiLogRepo.create(data));
  }

  async getPHIAccessHistory(params: {
    userId?: string;
    patientId?: string;
    resourceType?: PHIResourceType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<PHIAccessLog[]> {
    const query = this.phiLogRepo.createQueryBuilder('log');
    if (params.userId) query.andWhere('log.userId = :userId', { userId: params.userId });
    if (params.patientId)
      query.andWhere('log.patientId = :patientId', { patientId: params.patientId });
    if (params.resourceType)
      query.andWhere('log.resourceType = :resourceType', { resourceType: params.resourceType });
    if (params.startDate)
      query.andWhere('log.createdAt >= :startDate', { startDate: params.startDate });
    if (params.endDate) query.andWhere('log.createdAt <= :endDate', { endDate: params.endDate });
    return query
      .orderBy('log.createdAt', 'DESC')
      .take(params.limit || 100)
      .getMany();
  }

  async grantConsent(
    patientId: string,
    consentType: ConsentType,
    data: Partial<PatientConsent>,
  ): Promise<PatientConsent> {
    const consent = this.consentRepo.create({
      ...data,
      patientId,
      consentType,
      status: ConsentStatus.GRANTED,
      grantedAt: new Date(),
    });
    return this.consentRepo.save(consent);
  }

  async revokeConsent(
    consentId: string,
    revokedBy: string,
    reason?: string,
  ): Promise<PatientConsent> {
    const consent = await this.consentRepo.findOneOrFail({ where: { id: consentId } });
    consent.status = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();
    consent.revokedBy = revokedBy;
    consent.revocationReason = reason;
    return this.consentRepo.save(consent);
  }

  async getPatientConsents(patientId: string): Promise<PatientConsent[]> {
    return this.consentRepo.find({ where: { patientId }, order: { createdAt: 'DESC' } });
  }

  async hasActiveConsent(patientId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.consentRepo.findOne({
      where: { patientId, consentType, status: ConsentStatus.GRANTED },
    });
    if (!consent) return false;
    if (consent.expiresAt && consent.expiresAt < new Date()) return false;
    return true;
  }

  async createBAA(data: Partial<BusinessAssociateAgreement>): Promise<BusinessAssociateAgreement> {
    return this.baaRepo.save(this.baaRepo.create(data));
  }

  async getActiveBAAs(organizationId?: string): Promise<BusinessAssociateAgreement[]> {
    const query = this.baaRepo
      .createQueryBuilder('baa')
      .where('baa.status = :status', { status: BAAStatus.ACTIVE });
    if (organizationId) query.andWhere('baa.organizationId = :organizationId', { organizationId });
    return query.getMany();
  }

  @Cron('0 0 0 * * *')
  async enforceDataRetention(): Promise<void> {
    this.logger.log('Enforcing data retention policies...');
    const policies = await this.retentionRepo.find({ where: { isActive: true } });
    for (const policy of policies) {
      const cutoffDate = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);
      this.logger.log(
        `Policy ${policy.name}: ${policy.resourceType} older than ${cutoffDate.toISOString()}`,
      );
      policy.lastExecutedAt = new Date();
      await this.retentionRepo.save(policy);
    }
  }

  @Cron('0 0 8 * * *')
  async checkExpiringConsents(): Promise<void> {
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiring = await this.consentRepo.find({
      where: { status: ConsentStatus.GRANTED, expiresAt: LessThan(soon) },
    });
    this.logger.log(`Found ${expiring.length} consents expiring within 30 days`);
  }

  @Cron('0 0 9 * * 1')
  async checkExpiringBAAs(): Promise<void> {
    const soon = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const expiring = await this.baaRepo.find({
      where: { status: BAAStatus.ACTIVE, expiresAt: LessThan(soon) },
    });
    this.logger.log(`Found ${expiring.length} BAAs expiring within 60 days`);
  }
}
