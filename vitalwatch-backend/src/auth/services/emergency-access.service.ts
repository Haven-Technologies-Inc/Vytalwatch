import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../audit/audit.service';
import * as crypto from 'crypto';

export interface EmergencyAccessGrant {
  accessId: string;
  userId: string;
  patientId: string;
  grantedAt: Date;
  expiresAt: Date;
  reason: string;
}

@Injectable()
export class EmergencyAccessService {
  private readonly logger = new Logger(EmergencyAccessService.name);
  private readonly activeGrants = new Map<string, EmergencyAccessGrant>();

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async requestAccess(
    userId: string,
    patientId: string,
    reason: string,
    ip: string,
  ): Promise<EmergencyAccessGrant> {
    if (!this.configService.get('emergencyAccess.enabled')) {
      throw new ForbiddenException('Emergency access disabled');
    }

    const grant: EmergencyAccessGrant = {
      accessId: crypto.randomUUID(),
      userId,
      patientId,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      reason,
    };

    this.activeGrants.set(grant.accessId, grant);

    await this.auditService.log({
      action: 'EMERGENCY_ACCESS_GRANTED',
      userId,
      resourceType: 'patient',
      resourceId: patientId,
      details: { accessId: grant.accessId, reason, expiresAt: grant.expiresAt },
      ipAddress: ip,
    });

    this.logger.warn(
      `BREAK-GLASS: User ${userId} accessed patient ${patientId}. Reason: ${reason}`,
    );
    return grant;
  }

  validate(accessId: string, userId: string): boolean {
    const grant = this.activeGrants.get(accessId);
    if (!grant || grant.userId !== userId || new Date() > grant.expiresAt) {
      if (grant) this.activeGrants.delete(accessId);
      return false;
    }
    return true;
  }

  async revoke(accessId: string, userId: string): Promise<void> {
    this.activeGrants.delete(accessId);
    await this.auditService.log({
      action: 'EMERGENCY_ACCESS_REVOKED',
      userId,
      resourceType: 'emergency_access',
      resourceId: accessId,
    });
  }
}
