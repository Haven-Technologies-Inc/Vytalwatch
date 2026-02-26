import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EnterpriseLoggingService } from '../enterprise-logging/enterprise-logging.service';
import { ApiOperation, LogSeverity } from '../enterprise-logging/entities/api-audit-log.entity';

export interface ClearinghouseConfig { provider: 'availity' | 'change_healthcare' | 'trizetto' | 'waystar'; apiUrl: string; apiKey: string; submitterId: string; }
export interface SubmissionResult { transactionId: string; status: 'ACCEPTED' | 'REJECTED' | 'PENDING'; message: string; timestamp: Date; rawResponse?: any; }
export interface ClaimStatus { claimId: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PAID' | 'DENIED'; paidAmount?: number; denialReason?: string; lastUpdated: Date; }

@Injectable()
export class ClearinghouseService {
  private readonly logger = new Logger(ClearinghouseService.name);
  private config: ClearinghouseConfig | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly enterpriseLogger: EnterpriseLoggingService,
  ) {
    this.initConfig();
  }

  private initConfig() {
    const provider = this.configService.get<string>('clearinghouse.provider');
    if (provider) {
      this.config = {
        provider: provider as any,
        apiUrl: this.configService.get<string>('clearinghouse.apiUrl') || '',
        apiKey: this.configService.get<string>('clearinghouse.apiKey') || '',
        submitterId: this.configService.get<string>('clearinghouse.submitterId') || '',
      };
      this.logger.log('Clearinghouse configured: ' + provider);
    }
  }

  isConfigured(): boolean { return !!this.config; }

  async submitClaim(ediContent: string, claimIds: string[]): Promise<SubmissionResult> {
    if (!this.config) throw new Error('Clearinghouse not configured');
    const startTime = Date.now();

    try {
      const response = await axios.post(this.config.apiUrl + '/claims/submit', {
        submitterId: this.config.submitterId,
        transactionType: '837P',
        content: Buffer.from(ediContent).toString('base64'),
        claimIds,
      }, {
        headers: { 'Authorization': 'Bearer ' + this.config.apiKey, 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const result = {
        transactionId: response.data.transactionId || 'TXN-' + Date.now(),
        status: response.data.status === 'success' ? 'ACCEPTED' : 'PENDING' as const,
        message: response.data.message || 'Submitted successfully',
        timestamp: new Date(),
        rawResponse: response.data,
      };

      await this.enterpriseLogger.logClearinghouse({
        operation: ApiOperation.CLAIM_SUBMIT, success: true,
        endpoint: '/claims/submit', method: 'POST',
        responseStatus: response.status, durationMs: Date.now() - startTime,
        metadata: { transactionId: result.transactionId, claimCount: claimIds.length, provider: this.config.provider },
      });

      return result;
    } catch (error: any) {
      this.logger.error('Claim submission failed', error.message);
      await this.enterpriseLogger.logClearinghouse({
        operation: ApiOperation.CLAIM_SUBMIT, success: false, severity: LogSeverity.ERROR,
        endpoint: '/claims/submit', method: 'POST', durationMs: Date.now() - startTime,
        errorMessage: error.message, metadata: { claimCount: claimIds.length },
      });
      return { transactionId: 'ERR-' + Date.now(), status: 'REJECTED', message: error.message || 'Submission failed', timestamp: new Date() };
    }
  }

  async checkClaimStatus(transactionId: string): Promise<ClaimStatus[]> {
    if (!this.config) throw new Error('Clearinghouse not configured');

    try {
      const response = await axios.get(this.config.apiUrl + '/claims/status/' + transactionId, {
        headers: { 'Authorization': 'Bearer ' + this.config.apiKey },
        timeout: 15000,
      });
      return response.data.claims || [];
    } catch (error: any) {
      this.logger.error('Status check failed', error.message);
      return [];
    }
  }

  async getRemittance(fromDate: string, toDate: string): Promise<any[]> {
    if (!this.config) throw new Error('Clearinghouse not configured');

    try {
      const response = await axios.get(this.config.apiUrl + '/remittance', {
        params: { submitterId: this.config.submitterId, fromDate, toDate },
        headers: { 'Authorization': 'Bearer ' + this.config.apiKey },
      });
      return response.data.remittances || [];
    } catch (error: any) {
      this.logger.error('Remittance fetch failed', error.message);
      return [];
    }
  }
}
