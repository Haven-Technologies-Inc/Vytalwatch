/**
 * ReshADX - GCB Bank API Integration
 * Complete integration with Ghana Commercial Bank API
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import config from '../../config';

export interface GCBCredentials {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  environment: 'sandbox' | 'production';
}

export interface GCBAccount {
  accountNumber: string;
  accountName: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT';
  currency: string;
  balance: number;
  availableBalance: number;
  branch: string;
  status: 'ACTIVE' | 'DORMANT' | 'CLOSED';
}

export interface GCBTransaction {
  transactionId: string;
  accountNumber: string;
  amount: number;
  currency: string;
  transactionType: 'DEBIT' | 'CREDIT';
  description: string;
  valueDate: string;
  postingDate: string;
  balance: number;
  reference: string;
}

export class GCBBankAdapter {
  private client: AxiosInstance;
  private credentials: GCBCredentials;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(credentials: GCBCredentials) {
    this.credentials = credentials;

    const baseURL = credentials.environment === 'production'
      ? 'https://api.gcb.com.gh/v1'
      : 'https://sandbox-api.gcb.com.gh/v1';

    this.client = axios.create({
      baseURL,
      headers: {
        'X-API-Key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
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
      const response = await this.client.post('/auth/token', {
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        grant_type: 'client_credentials',
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      return this.accessToken;
    } catch (error: any) {
      logger.error('GCB Bank: Failed to get access token', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to authenticate with GCB Bank API');
    }
  }

  /**
   * Get customer accounts
   */
  async getAccounts(customerId: string): Promise<GCBAccount[]> {
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
        accountType: account.account_type,
        currency: account.currency || 'GHS',
        balance: parseFloat(account.balance) * 100, // Convert to pesewas
        availableBalance: parseFloat(account.available_balance) * 100,
        branch: account.branch_code,
        status: account.status,
      }));
    } catch (error: any) {
      logger.error('GCB Bank: Failed to get accounts', {
        error: error.response?.data || error.message,
        customerId,
      });
      throw new Error('Failed to get customer accounts');
    }
  }

  /**
   * Get account balance
   */
  async getBalance(accountNumber: string): Promise<{
    balance: number;
    availableBalance: number;
    currency: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountNumber}/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return {
        balance: parseFloat(response.data.balance) * 100,
        availableBalance: parseFloat(response.data.available_balance) * 100,
        currency: response.data.currency || 'GHS',
      };
    } catch (error: any) {
      logger.error('GCB Bank: Failed to get balance', {
        error: error.response?.data || error.message,
        accountNumber,
      });
      throw new Error('Failed to get account balance');
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
  ): Promise<GCBTransaction[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountNumber}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          start_date: startDate,
          end_date: endDate,
          limit,
          offset,
        },
      });

      return response.data.transactions.map((txn: any) => ({
        transactionId: txn.transaction_id,
        accountNumber: txn.account_number,
        amount: parseFloat(txn.amount) * 100,
        currency: txn.currency || 'GHS',
        transactionType: txn.debit_credit_indicator === 'D' ? 'DEBIT' : 'CREDIT',
        description: txn.description,
        valueDate: txn.value_date,
        postingDate: txn.posting_date,
        balance: parseFloat(txn.balance) * 100,
        reference: txn.reference,
      }));
    } catch (error: any) {
      logger.error('GCB Bank: Failed to get transactions', {
        error: error.response?.data || error.message,
        accountNumber,
      });
      throw new Error('Failed to get transaction history');
    }
  }

  /**
   * Initiate fund transfer
   */
  async initiateTransfer(
    fromAccount: string,
    toAccount: string,
    amount: number,
    reference: string,
    description?: string
  ): Promise<string> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.post(
        '/transfers',
        {
          from_account: fromAccount,
          to_account: toAccount,
          amount: (amount / 100).toFixed(2),
          currency: 'GHS',
          reference,
          description: description || 'ReshADX transfer',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      logger.info('GCB Bank: Transfer initiated', {
        transactionId: response.data.transaction_id,
        amount,
      });

      return response.data.transaction_id;
    } catch (error: any) {
      logger.error('GCB Bank: Transfer failed', {
        error: error.response?.data || error.message,
        fromAccount,
        toAccount,
        amount,
      });
      throw new Error('Failed to initiate transfer');
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transactionId: string): Promise<{
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    transactionId: string;
    amount: number;
    currency: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/transfers/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return {
        status: response.data.status,
        transactionId: response.data.transaction_id,
        amount: parseFloat(response.data.amount) * 100,
        currency: response.data.currency,
      };
    } catch (error: any) {
      logger.error('GCB Bank: Failed to get transfer status', {
        error: error.response?.data || error.message,
        transactionId,
      });
      throw new Error('Failed to get transfer status');
    }
  }

  /**
   * Validate account number
   */
  async validateAccount(accountNumber: string): Promise<{
    valid: boolean;
    accountName?: string;
    accountType?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountNumber}/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return {
        valid: response.data.valid,
        accountName: response.data.account_name,
        accountType: response.data.account_type,
      };
    } catch (error: any) {
      logger.error('GCB Bank: Account validation failed', {
        error: error.response?.data || error.message,
        accountNumber,
      });
      return { valid: false };
    }
  }

  /**
   * Get customer statement
   */
  async getStatement(
    accountNumber: string,
    startDate: string,
    endDate: string,
    format: 'PDF' | 'CSV' = 'PDF'
  ): Promise<Buffer> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountNumber}/statement`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          start_date: startDate,
          end_date: endDate,
          format: format.toLowerCase(),
        },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      logger.error('GCB Bank: Failed to get statement', {
        error: error.response?.data || error.message,
        accountNumber,
      });
      throw new Error('Failed to get account statement');
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
      logger.error('GCB Bank: Signature verification failed', { error });
      return false;
    }
  }
}

/**
 * Factory function to create GCB Bank adapter
 */
export function createGCBAdapter(): GCBBankAdapter {
  const credentials: GCBCredentials = {
    clientId: config.integrations?.gcb?.clientId || process.env.GCB_CLIENT_ID || '',
    clientSecret: config.integrations?.gcb?.clientSecret || process.env.GCB_CLIENT_SECRET || '',
    apiKey: config.integrations?.gcb?.apiKey || process.env.GCB_API_KEY || '',
    environment: (config.env === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
  };

  return new GCBBankAdapter(credentials);
}
