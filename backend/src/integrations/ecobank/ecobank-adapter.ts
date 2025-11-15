/**
 * ReshADX - Ecobank API Integration
 * Complete integration with Ecobank Pan-African Banking API
 * Operating in 33 African countries
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import config from '../../config';

export interface EcobankCredentials {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  environment: 'sandbox' | 'production';
  countryCode?: string; // ISO 3166-1 alpha-2 (e.g., 'GH', 'NG', 'CI')
}

export interface EcobankAccount {
  accountNumber: string;
  accountName: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT' | 'BUSINESS';
  currency: string;
  balance: number;
  availableBalance: number;
  branchCode: string;
  branchName: string;
  countryCode: string;
  status: 'ACTIVE' | 'DORMANT' | 'FROZEN' | 'CLOSED';
  openingDate: string;
  iban?: string;
  bic?: string;
}

export interface EcobankTransaction {
  transactionId: string;
  accountNumber: string;
  amount: number;
  currency: string;
  transactionType: 'DEBIT' | 'CREDIT';
  description: string;
  narration: string;
  valueDate: string;
  postingDate: string;
  balance: number;
  reference: string;
  counterpartyAccount?: string;
  counterpartyName?: string;
  channel: 'BRANCH' | 'ATM' | 'MOBILE' | 'INTERNET' | 'POS' | 'TRANSFER';
}

export interface EcobankTransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  reference: string;
  beneficiaryName?: string;
  description?: string;
  transferType: 'INTRA_BANK' | 'INTER_BANK' | 'INTERNATIONAL';
  beneficiaryBank?: string;
  swiftCode?: string;
}

export class EcobankAdapter {
  private client: AxiosInstance;
  private credentials: EcobankCredentials;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(credentials: EcobankCredentials) {
    this.credentials = credentials;

    const baseURL = credentials.environment === 'production'
      ? 'https://api.ecobank.com/v2'
      : 'https://sandbox-api.ecobank.com/v2';

    this.client = axios.create({
      baseURL,
      headers: {
        'X-API-Key': credentials.apiKey,
        'X-Country-Code': credentials.countryCode || 'GH',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 45000, // Ecobank can be slower due to multi-country operations
    });
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await this.client.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        scope: 'accounts transactions transfers',
      });

      this.accessToken = response.data.access_token;
      // Ecobank tokens typically expire in 3600 seconds (1 hour)
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      logger.info('Ecobank: Access token obtained', {
        expiresIn,
        countryCode: this.credentials.countryCode,
      });

      return this.accessToken;
    } catch (error: any) {
      logger.error('Ecobank: Failed to get access token', {
        error: error.response?.data || error.message,
        countryCode: this.credentials.countryCode,
      });
      throw new Error('Failed to authenticate with Ecobank API');
    }
  }

  /**
   * Get customer accounts
   */
  async getAccounts(customerId: string): Promise<EcobankAccount[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/customers/${customerId}/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data.accounts.map((account: any) => ({
        accountNumber: account.account_number,
        accountName: account.account_name,
        accountType: this.mapAccountType(account.account_type),
        currency: account.currency || 'GHS',
        balance: this.convertToMinorUnits(account.balance, account.currency),
        availableBalance: this.convertToMinorUnits(account.available_balance, account.currency),
        branchCode: account.branch_code,
        branchName: account.branch_name,
        countryCode: account.country_code || this.credentials.countryCode || 'GH',
        status: account.status,
        openingDate: account.opening_date,
        iban: account.iban,
        bic: account.bic,
      }));
    } catch (error: any) {
      logger.error('Ecobank: Failed to get accounts', {
        error: error.response?.data || error.message,
        customerId,
      });
      throw new Error('Failed to get customer accounts from Ecobank');
    }
  }

  /**
   * Get account balance
   */
  async getBalance(accountNumber: string): Promise<{
    balance: number;
    availableBalance: number;
    currency: string;
    ledgerBalance?: number;
    minimumBalance?: number;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountNumber}/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = response.data;
      const currency = data.currency || 'GHS';

      return {
        balance: this.convertToMinorUnits(data.balance, currency),
        availableBalance: this.convertToMinorUnits(data.available_balance, currency),
        currency,
        ledgerBalance: data.ledger_balance ? this.convertToMinorUnits(data.ledger_balance, currency) : undefined,
        minimumBalance: data.minimum_balance ? this.convertToMinorUnits(data.minimum_balance, currency) : undefined,
      };
    } catch (error: any) {
      logger.error('Ecobank: Failed to get balance', {
        error: error.response?.data || error.message,
        accountNumber,
      });
      throw new Error('Failed to get account balance from Ecobank');
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    accountNumber: string,
    startDate: string,
    endDate: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<EcobankTransaction[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountNumber}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          from_date: startDate,
          to_date: endDate,
          limit,
          offset,
          sort: 'desc', // Most recent first
        },
      });

      return response.data.transactions.map((txn: any) => ({
        transactionId: txn.transaction_id || txn.reference,
        accountNumber: txn.account_number,
        amount: this.convertToMinorUnits(txn.amount, txn.currency),
        currency: txn.currency || 'GHS',
        transactionType: txn.debit_credit === 'D' || txn.type === 'DEBIT' ? 'DEBIT' : 'CREDIT',
        description: txn.description || txn.narration,
        narration: txn.narration || txn.description,
        valueDate: txn.value_date,
        postingDate: txn.posting_date || txn.value_date,
        balance: this.convertToMinorUnits(txn.balance, txn.currency),
        reference: txn.reference || txn.transaction_id,
        counterpartyAccount: txn.counterparty_account,
        counterpartyName: txn.counterparty_name,
        channel: this.mapChannel(txn.channel),
      }));
    } catch (error: any) {
      logger.error('Ecobank: Failed to get transactions', {
        error: error.response?.data || error.message,
        accountNumber,
        startDate,
        endDate,
      });
      throw new Error('Failed to get transaction history from Ecobank');
    }
  }

  /**
   * Initiate fund transfer
   */
  async initiateTransfer(transferRequest: EcobankTransferRequest): Promise<{
    transactionId: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    reference: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const payload: any = {
        source_account: transferRequest.fromAccount,
        destination_account: transferRequest.toAccount,
        amount: this.convertFromMinorUnits(transferRequest.amount, transferRequest.currency),
        currency: transferRequest.currency,
        reference: transferRequest.reference,
        narration: transferRequest.description || 'ReshADX transfer',
        transfer_type: transferRequest.transferType,
      };

      // Add beneficiary details for inter-bank/international transfers
      if (transferRequest.transferType !== 'INTRA_BANK') {
        payload.beneficiary_name = transferRequest.beneficiaryName;
        payload.beneficiary_bank = transferRequest.beneficiaryBank;

        if (transferRequest.transferType === 'INTERNATIONAL') {
          payload.swift_code = transferRequest.swiftCode;
        }
      }

      const response = await this.client.post('/transfers', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      logger.info('Ecobank: Transfer initiated', {
        transactionId: response.data.transaction_id,
        amount: transferRequest.amount,
        transferType: transferRequest.transferType,
      });

      return {
        transactionId: response.data.transaction_id,
        status: response.data.status || 'PENDING',
        reference: response.data.reference || transferRequest.reference,
      };
    } catch (error: any) {
      logger.error('Ecobank: Transfer failed', {
        error: error.response?.data || error.message,
        fromAccount: transferRequest.fromAccount,
        toAccount: transferRequest.toAccount,
        amount: transferRequest.amount,
      });
      throw new Error('Failed to initiate transfer with Ecobank');
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transactionId: string): Promise<{
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
    transactionId: string;
    amount: number;
    currency: string;
    timestamp: string;
    failureReason?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/transfers/${transactionId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = response.data;

      return {
        status: data.status,
        transactionId: data.transaction_id,
        amount: this.convertToMinorUnits(data.amount, data.currency),
        currency: data.currency,
        timestamp: data.timestamp || data.completed_at,
        failureReason: data.failure_reason,
      };
    } catch (error: any) {
      logger.error('Ecobank: Failed to get transfer status', {
        error: error.response?.data || error.message,
        transactionId,
      });
      throw new Error('Failed to get transfer status from Ecobank');
    }
  }

  /**
   * Validate account number
   */
  async validateAccount(accountNumber: string, bankCode?: string): Promise<{
    valid: boolean;
    accountName?: string;
    accountType?: string;
    currency?: string;
    bankName?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const params: any = { account_number: accountNumber };
      if (bankCode) {
        params.bank_code = bankCode;
      }

      const response = await this.client.get('/accounts/validate', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params,
      });

      return {
        valid: response.data.valid === true,
        accountName: response.data.account_name,
        accountType: response.data.account_type,
        currency: response.data.currency,
        bankName: response.data.bank_name,
      };
    } catch (error: any) {
      logger.error('Ecobank: Account validation failed', {
        error: error.response?.data || error.message,
        accountNumber,
      });

      // Return invalid if validation endpoint fails
      return { valid: false };
    }
  }

  /**
   * Get account statement
   */
  async getStatement(
    accountNumber: string,
    startDate: string,
    endDate: string,
    format: 'PDF' | 'CSV' | 'EXCEL' = 'PDF'
  ): Promise<Buffer> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountNumber}/statement`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': format === 'PDF' ? 'application/pdf' :
                   format === 'CSV' ? 'text/csv' :
                   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        params: {
          start_date: startDate,
          end_date: endDate,
          format: format.toLowerCase(),
        },
        responseType: 'arraybuffer',
      });

      logger.info('Ecobank: Statement generated', {
        accountNumber,
        format,
        startDate,
        endDate,
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      logger.error('Ecobank: Failed to get statement', {
        error: error.response?.data || error.message,
        accountNumber,
      });
      throw new Error('Failed to get account statement from Ecobank');
    }
  }

  /**
   * Get exchange rates (for multi-currency accounts)
   */
  async getExchangeRates(baseCurrency: string = 'USD'): Promise<{
    baseCurrency: string;
    rates: Record<string, number>;
    timestamp: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/rates/exchange', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          base: baseCurrency,
        },
      });

      return {
        baseCurrency: response.data.base,
        rates: response.data.rates,
        timestamp: response.data.timestamp,
      };
    } catch (error: any) {
      logger.error('Ecobank: Failed to get exchange rates', {
        error: error.response?.data || error.message,
        baseCurrency,
      });
      throw new Error('Failed to get exchange rates from Ecobank');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.credentials.clientSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Ecobank: Signature verification failed', { error });
      return false;
    }
  }

  /**
   * Helper: Map account type to standard format
   */
  private mapAccountType(type: string): 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT' | 'BUSINESS' {
    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('SAV')) return 'SAVINGS';
    if (typeUpper.includes('CURR') || typeUpper.includes('CHECK')) return 'CURRENT';
    if (typeUpper.includes('FIXED') || typeUpper.includes('DEPOSIT')) return 'FIXED_DEPOSIT';
    if (typeUpper.includes('BUS') || typeUpper.includes('CORP')) return 'BUSINESS';
    return 'CURRENT'; // Default
  }

  /**
   * Helper: Map transaction channel
   */
  private mapChannel(channel: string): 'BRANCH' | 'ATM' | 'MOBILE' | 'INTERNET' | 'POS' | 'TRANSFER' {
    const channelUpper = channel?.toUpperCase() || '';
    if (channelUpper.includes('BRANCH')) return 'BRANCH';
    if (channelUpper.includes('ATM')) return 'ATM';
    if (channelUpper.includes('MOBILE') || channelUpper.includes('APP')) return 'MOBILE';
    if (channelUpper.includes('INTERNET') || channelUpper.includes('WEB')) return 'INTERNET';
    if (channelUpper.includes('POS')) return 'POS';
    return 'TRANSFER';
  }

  /**
   * Helper: Convert amount to minor units (cents/pesewas)
   */
  private convertToMinorUnits(amount: string | number, currency: string): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Most African currencies use 2 decimal places
    // Exceptions: currencies with no decimal subdivision
    const noDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

    if (noDecimalCurrencies.includes(currency)) {
      return Math.round(numAmount);
    }

    return Math.round(numAmount * 100);
  }

  /**
   * Helper: Convert from minor units to major units
   */
  private convertFromMinorUnits(amount: number, currency: string): string {
    const noDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

    if (noDecimalCurrencies.includes(currency)) {
      return amount.toString();
    }

    return (amount / 100).toFixed(2);
  }
}

/**
 * Factory function to create Ecobank adapter
 */
export function createEcobankAdapter(countryCode?: string): EcobankAdapter {
  const credentials: EcobankCredentials = {
    clientId: config.integrations?.ecobank?.clientId || process.env.ECOBANK_CLIENT_ID || '',
    clientSecret: config.integrations?.ecobank?.clientSecret || process.env.ECOBANK_CLIENT_SECRET || '',
    apiKey: config.integrations?.ecobank?.apiKey || process.env.ECOBANK_API_KEY || '',
    environment: (config.env === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
    countryCode: countryCode || config.integrations?.ecobank?.countryCode || process.env.ECOBANK_COUNTRY_CODE || 'GH',
  };

  return new EcobankAdapter(credentials);
}
