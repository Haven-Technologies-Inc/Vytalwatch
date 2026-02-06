import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Consent, ConsentType, ConsentStatus } from './entities/consent.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateConsentDto {
  userId: string;
  type: ConsentType;
  version: string;
  consentText: string;
  consentUrl?: string;
  signatureMethod: string;
  signatureData?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  witnessedBy?: string;
  witnessName?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  notes?: string;
}

export interface RevokeConsentDto {
  reason: string;
  revokedBy: string;
}

export interface ConsentQueryOptions {
  userId?: string;
  type?: ConsentType | ConsentType[];
  status?: ConsentStatus | ConsentStatus[];
  version?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ConsentsService {
  private readonly logger = new Logger(ConsentsService.name);

  constructor(
    @InjectRepository(Consent)
    private readonly consentRepository: Repository<Consent>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createConsentDto: CreateConsentDto): Promise<Consent> {
    // Check if there's an existing active consent of this type
    const existing = await this.consentRepository.findOne({
      where: {
        userId: createConsentDto.userId,
        type: createConsentDto.type,
        status: ConsentStatus.GRANTED,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Active consent of type ${createConsentDto.type} already exists for this user`
      );
    }

    const consent = this.consentRepository.create({
      ...createConsentDto,
      status: ConsentStatus.GRANTED,
      signedAt: new Date(),
    });

    const saved = await this.consentRepository.save(consent);

    await this.auditService.log({
      action: 'CONSENT_GRANTED',
      userId: createConsentDto.userId,
      resourceType: 'consent',
      resourceId: saved.id,
      details: {
        type: createConsentDto.type,
        version: createConsentDto.version,
        method: createConsentDto.signatureMethod,
      },
      ipAddress: createConsentDto.ipAddress,
      userAgent: createConsentDto.userAgent,
    });

    return saved;
  }

  async findById(id: string): Promise<Consent | null> {
    return this.consentRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findAll(options: ConsentQueryOptions): Promise<{ consents: Consent[]; total: number }> {
    const { userId, type, status, version, page = 1, limit = 50 } = options;

    const queryBuilder = this.consentRepository.createQueryBuilder('consent');

    if (userId) queryBuilder.andWhere('consent.userId = :userId', { userId });

    if (type) {
      if (Array.isArray(type)) {
        queryBuilder.andWhere('consent.type IN (:...types)', { types: type });
      } else {
        queryBuilder.andWhere('consent.type = :type', { type });
      }
    }

    if (status) {
      if (Array.isArray(status)) {
        queryBuilder.andWhere('consent.status IN (:...statuses)', { statuses: status });
      } else {
        queryBuilder.andWhere('consent.status = :status', { status });
      }
    }

    if (version) queryBuilder.andWhere('consent.version = :version', { version });

    queryBuilder
      .leftJoinAndSelect('consent.user', 'user')
      .orderBy('consent.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [consents, total] = await queryBuilder.getManyAndCount();

    return { consents, total };
  }

  async getUserConsents(userId: string, activeOnly: boolean = false): Promise<Consent[]> {
    const where: any = { userId };

    if (activeOnly) {
      where.status = ConsentStatus.GRANTED;
    }

    return this.consentRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async hasConsent(userId: string, type: ConsentType): Promise<boolean> {
    const consent = await this.consentRepository.findOne({
      where: {
        userId,
        type,
        status: ConsentStatus.GRANTED,
      },
    });

    // Check if consent is expired
    if (consent && consent.expiresAt && consent.expiresAt < new Date()) {
      await this.expireConsent(consent.id);
      return false;
    }

    return !!consent;
  }

  async revoke(id: string, revokeDto: RevokeConsentDto): Promise<Consent> {
    const consent = await this.findById(id);
    if (!consent) {
      throw new NotFoundException('Consent not found');
    }

    if (consent.status === ConsentStatus.REVOKED) {
      throw new BadRequestException('Consent already revoked');
    }

    consent.status = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();
    consent.revokedBy = revokeDto.revokedBy;
    consent.revocationReason = revokeDto.reason;

    const updated = await this.consentRepository.save(consent);

    await this.auditService.log({
      action: 'CONSENT_REVOKED',
      userId: consent.userId,
      resourceType: 'consent',
      resourceId: id,
      details: {
        type: consent.type,
        reason: revokeDto.reason,
        revokedBy: revokeDto.revokedBy,
      },
    });

    // Notify user and relevant parties
    await this.sendConsentRevocationNotification(consent);

    return updated;
  }

  async expireConsent(id: string): Promise<Consent> {
    const consent = await this.findById(id);
    if (!consent) {
      throw new NotFoundException('Consent not found');
    }

    consent.status = ConsentStatus.EXPIRED;

    const updated = await this.consentRepository.save(consent);

    await this.auditService.log({
      action: 'CONSENT_EXPIRED',
      userId: consent.userId,
      resourceType: 'consent',
      resourceId: id,
      details: { type: consent.type },
    });

    return updated;
  }

  async renew(oldConsentId: string, newConsentDto: CreateConsentDto): Promise<Consent> {
    const oldConsent = await this.findById(oldConsentId);
    if (!oldConsent) {
      throw new NotFoundException('Original consent not found');
    }

    // Expire old consent
    await this.expireConsent(oldConsentId);

    // Create new consent
    const newConsent = await this.create({
      ...newConsentDto,
      metadata: {
        ...newConsentDto.metadata,
        previousConsentId: oldConsentId,
      },
    });

    return newConsent;
  }

  async requireConsent(userId: string, requiredTypes: ConsentType[]): Promise<ConsentType[]> {
    const missingConsents: ConsentType[] = [];

    for (const type of requiredTypes) {
      const hasIt = await this.hasConsent(userId, type);
      if (!hasIt) {
        missingConsents.push(type);
      }
    }

    return missingConsents;
  }

  async getConsentStats(organizationId?: string): Promise<{
    total: number;
    granted: number;
    revoked: number;
    expired: number;
    pending: number;
    byType: Record<ConsentType, number>;
  }> {
    const queryBuilder = this.consentRepository.createQueryBuilder('consent');

    if (organizationId) {
      queryBuilder.where("consent.metadata->>'organizationId' = :organizationId", { organizationId });
    }

    const consents = await queryBuilder.getMany();

    const byType: Record<string, number> = {};
    Object.values(ConsentType).forEach(type => {
      byType[type] = 0;
    });

    let granted = 0;
    let revoked = 0;
    let expired = 0;
    let pending = 0;

    consents.forEach(consent => {
      byType[consent.type]++;
      switch (consent.status) {
        case ConsentStatus.GRANTED:
          granted++;
          break;
        case ConsentStatus.REVOKED:
          revoked++;
          break;
        case ConsentStatus.EXPIRED:
          expired++;
          break;
        case ConsentStatus.PENDING:
          pending++;
          break;
      }
    });

    return {
      total: consents.length,
      granted,
      revoked,
      expired,
      pending,
      byType: byType as Record<ConsentType, number>,
    };
  }

  // Check and expire outdated consents (run periodically)
  async processExpiredConsents(): Promise<void> {
    const now = new Date();

    const expiredConsents = await this.consentRepository.find({
      where: {
        status: ConsentStatus.GRANTED,
      },
    });

    let count = 0;
    for (const consent of expiredConsents) {
      if (consent.expiresAt && consent.expiresAt < now) {
        await this.expireConsent(consent.id);
        count++;
      }
    }

    if (count > 0) {
      this.logger.log(`Expired ${count} consents`);
    }
  }

  private async sendConsentRevocationNotification(consent: Consent): Promise<void> {
    try {
      await this.notificationsService.create({
        userId: consent.userId,
        type: 'CONSENT',
        title: 'Consent Revoked',
        message: `Your consent for ${consent.type} has been revoked`,
        metadata: { consentId: consent.id, consentType: consent.type },
      });
    } catch (error) {
      this.logger.error(`Failed to send consent revocation notification: ${error.message}`);
    }
  }
}
