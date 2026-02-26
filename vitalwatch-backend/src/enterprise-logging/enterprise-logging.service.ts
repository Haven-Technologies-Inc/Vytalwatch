import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EnterpriseApiLog, ApiProvider, ApiOperation, LogSeverity } from './entities/api-audit-log.entity';

const PHI_FIELDS = ['ssn', 'dob', 'address', 'phone', 'email', 'name', 'password', 'token', 'cardNumber'];

export interface LogApiCallParams {
  provider: ApiProvider; operation: ApiOperation; severity?: LogSeverity; correlationId?: string;
  userId?: string; organizationId?: string; patientId?: string; endpoint?: string; method?: string;
  requestBody?: any; responseBody?: any; responseStatus?: number; success: boolean;
  errorMessage?: string; errorCode?: string; durationMs?: number; amount?: number; currency?: string; metadata?: any;
}

@Injectable()
export class EnterpriseLoggingService {
  private lastLogHash: string | null = null;
  constructor(@InjectRepository(EnterpriseApiLog) private readonly repo: Repository<EnterpriseApiLog>, private readonly config: ConfigService) {
    this.repo.findOne({ order: { createdAt: 'DESC' }, select: ['logHash'] }).then(l => this.lastLogHash = l?.logHash || null);
  }

  private redact(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const r = { ...obj };
    for (const k of Object.keys(r)) {
      if (PHI_FIELDS.some(f => k.toLowerCase().includes(f))) r[k] = '[REDACTED]';
      else if (typeof r[k] === 'object') r[k] = this.redact(r[k]);
    }
    return r;
  }

  async log(p: LogApiCallParams): Promise<EnterpriseApiLog> {
    const log = this.repo.create({ ...p, severity: p.severity || LogSeverity.INFO, requestBody: this.redact(p.requestBody), responseBody: this.redact(p.responseBody), requestHash: crypto.createHash('sha256').update(JSON.stringify(p.requestBody || {})).digest('hex'), responseHash: crypto.createHash('sha256').update(JSON.stringify(p.responseBody || {})).digest('hex'), previousLogHash: this.lastLogHash, environment: this.config.get('NODE_ENV') || 'production' });
    const saved = await this.repo.save(log);
    this.lastLogHash = saved.logHash;
    return saved;
  }

  logPayment(p: Omit<LogApiCallParams, 'provider'>) { return this.log({ ...p, provider: ApiProvider.STRIPE }); }
  logTenovi(p: Omit<LogApiCallParams, 'provider'>) { return this.log({ ...p, provider: ApiProvider.TENOVI }); }
  logClearinghouse(p: Omit<LogApiCallParams, 'provider'>) { return this.log({ ...p, provider: ApiProvider.CLEARINGHOUSE }); }
  logEmail(p: Omit<LogApiCallParams, 'provider'>) { return this.log({ ...p, provider: ApiProvider.ZEPTOMAIL }); }
  logSms(p: Omit<LogApiCallParams, 'provider'>) { return this.log({ ...p, provider: ApiProvider.TWILIO }); }
  logAI(p: Omit<LogApiCallParams, 'provider'>, prov = ApiProvider.OPENAI) { return this.log({ ...p, provider: prov }); }

  async query(params: { provider?: ApiProvider; userId?: string; startDate?: Date; endDate?: Date; page?: number; limit?: number }) {
    const { page = 1, limit = 50, startDate, endDate, ...f } = params;
    const where: any = { ...f };
    if (startDate && endDate) where.createdAt = Between(startDate, endDate);
    const [data, total] = await this.repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit });
    return { data, total, page, limit };
  }

  async verifyIntegrity(): Promise<{ valid: boolean; brokenAt?: string }> {
    const logs = await this.repo.find({ order: { createdAt: 'ASC' }, take: 5000 });
    let prev: string | null = null;
    for (const l of logs) { if (l.previousLogHash !== prev) return { valid: false, brokenAt: l.id }; prev = l.logHash; }
    return { valid: true };
  }
}
