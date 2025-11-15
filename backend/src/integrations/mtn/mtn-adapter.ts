/**
 * ReshADX - MTN Mobile Money API Integration
 * Complete integration with MTN MoMo API for Ghana, Nigeria, Uganda, etc.
 */

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import config from '../../config';

export interface MTNCredentials {
  apiKey: string;
  apiSecret: string;
  subscriptionKey: string;
  environment: 'sandbox' | 'production';
  country: 'GH' | 'NG' | 'UG' | 'CI' | 'CM';
}

export interface MTNTransactionResponse {
  amount: string;
  currency: string;
  financialTransactionId: string;
  externalId: string;
  payer: {
    partyIdType: string;
    partyId: string;
  };
  payerMessage?: string;
  payeeNote?: string;
  status: 'SUCCESSFUL' | 'PENDING' | 'FAILED';
}

export interface MTNBalance {
  availableBalance: string;
  currency: string;
}

export class MTNMoMoAdapter {
  private client: AxiosInstance;
  private credentials: MTNCredentials;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(credentials: MTNCredentials) {
    this.credentials = credentials;

    const baseURL = credentials.environment === 'production'
      ? `https://proxy.momoapi.mtn.com`
      : `https://sandbox.momodeveloper.mtn.com`;

    this.client = axios.create({
      baseURL,
      headers: {
        'Ocp-Apim-Subscription-Key': credentials.subscriptionKey,
        'X-Target-Environment': credentials.environment,
      },
      timeout: 30000,
    });
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const authString = Buffer.from(
        `${this.credentials.apiKey}:${this.credentials.apiSecret}`
      ).toString('base64');

      const response = await this.client.post('/collection/token/', null, {
        headers: {
          'Authorization': `Basic ${authString}`,
        },
      });

      this.accessToken = response.data.access_token;
      // Token expires in 1 hour
      this.tokenExpiry = new Date(Date.now() + 3600 * 1000);

      return this.accessToken;
    } catch (error) {
      logger.error('MTN MoMo: Failed to get access token', { error });
      throw new Error('Failed to authenticate with MTN MoMo API');
    }
  }

  /**
   * Request payment from customer (Collections)
   */
  async requestToPay(
    amount: number,
    phoneNumber: string,
    reference: string,
    message?: string
  ): Promise<string> {
    try {
      const token = await this.getAccessToken();
      const transactionId = uuidv4();

      const payload = {
        amount: (amount / 100).toFixed(2), // Convert from pesewas to GHS
        currency: this.getCurrency(),
        externalId: reference,
        payer: {
          partyIdType: 'MSISDN',
          partyId: this.formatPhoneNumber(phoneNumber),
        },
        payerMessage: message || 'Payment request',
        payeeNote: `ReshADX transaction ${reference}`,
      };

      await this.client.post('/collection/v1_0/requesttopay', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': transactionId,
          'X-Callback-Url': `${config.server.url}/webhooks/mtn/callback`,
        },
      });

      logger.info('MTN MoMo: Payment request initiated', { transactionId, amount, phoneNumber });

      return transactionId;
    } catch (error: any) {
      logger.error('MTN MoMo: Payment request failed', {
        error: error.response?.data || error.message,
        amount,
        phoneNumber,
      });
      throw new Error('Failed to request payment from MTN MoMo');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<MTNTransactionResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `/collection/v1_0/requesttopay/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('MTN MoMo: Failed to get transaction status', {
        error: error.response?.data || error.message,
        transactionId,
      });
      throw new Error('Failed to get transaction status');
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<MTNBalance> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/collection/v1_0/account/balance', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('MTN MoMo: Failed to get balance', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to get account balance');
    }
  }

  /**
   * Validate account holder (Know Your Customer)
   */
  async validateAccountHolder(phoneNumber: string): Promise<{
    name: string;
    gender: string;
    birthdate: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(
        `/collection/v1_0/accountholder/msisdn/${this.formatPhoneNumber(phoneNumber)}/basicuserinfo`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('MTN MoMo: Failed to validate account holder', {
        error: error.response?.data || error.message,
        phoneNumber,
      });
      throw new Error('Failed to validate account holder');
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const token = await this.getAccessToken();

      // Note: MTN MoMo API doesn't have a direct transaction history endpoint
      // In production, you would need to maintain your own transaction log
      // or use webhook callbacks to track transactions

      logger.warn('MTN MoMo: Transaction history endpoint not available, using local storage');

      return [];
    } catch (error: any) {
      logger.error('MTN MoMo: Failed to get transaction history', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to get transaction history');
    }
  }

  /**
   * Transfer funds (Disbursements)
   */
  async transfer(
    amount: number,
    phoneNumber: string,
    reference: string,
    message?: string
  ): Promise<string> {
    try {
      const token = await this.getAccessToken();
      const transactionId = uuidv4();

      const payload = {
        amount: (amount / 100).toFixed(2),
        currency: this.getCurrency(),
        externalId: reference,
        payee: {
          partyIdType: 'MSISDN',
          partyId: this.formatPhoneNumber(phoneNumber),
        },
        payerMessage: message || 'Transfer from ReshADX',
        payeeNote: `Transfer ${reference}`,
      };

      await this.client.post('/disbursement/v1_0/transfer', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': transactionId,
          'X-Callback-Url': `${config.server.url}/webhooks/mtn/callback`,
        },
      });

      logger.info('MTN MoMo: Transfer initiated', { transactionId, amount, phoneNumber });

      return transactionId;
    } catch (error: any) {
      logger.error('MTN MoMo: Transfer failed', {
        error: error.response?.data || error.message,
        amount,
        phoneNumber,
      });
      throw new Error('Failed to transfer funds');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.credentials.apiSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('MTN MoMo: Signature verification failed', { error });
      return false;
    }
  }

  /**
   * Get currency code based on country
   */
  private getCurrency(): string {
    const currencyMap: Record<string, string> = {
      GH: 'GHS', // Ghana Cedi
      NG: 'NGN', // Nigerian Naira
      UG: 'UGX', // Ugandan Shilling
      CI: 'XOF', // West African CFA Franc
      CM: 'XAF', // Central African CFA Franc
    };

    return currencyMap[this.credentials.country] || 'GHS';
  }

  /**
   * Format phone number for MTN API (remove leading +)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/^\+/, '');
  }

  /**
   * Handle webhook callback
   */
  async handleWebhook(payload: any): Promise<void> {
    try {
      logger.info('MTN MoMo: Webhook received', { payload });

      // Process the webhook based on status
      if (payload.status === 'SUCCESSFUL') {
        // Update transaction in database
        logger.info('MTN MoMo: Transaction successful', { transactionId: payload.financialTransactionId });
      } else if (payload.status === 'FAILED') {
        logger.error('MTN MoMo: Transaction failed', { transactionId: payload.financialTransactionId });
      }
    } catch (error) {
      logger.error('MTN MoMo: Webhook processing failed', { error, payload });
      throw error;
    }
  }
}

/**
 * Factory function to create MTN MoMo adapter
 */
export function createMTNAdapter(country: 'GH' | 'NG' | 'UG' | 'CI' | 'CM' = 'GH'): MTNMoMoAdapter {
  const credentials: MTNCredentials = {
    apiKey: config.integrations?.mtn?.apiKey || process.env.MTN_API_KEY || '',
    apiSecret: config.integrations?.mtn?.apiSecret || process.env.MTN_API_SECRET || '',
    subscriptionKey: config.integrations?.mtn?.subscriptionKey || process.env.MTN_SUBSCRIPTION_KEY || '',
    environment: (config.env === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
    country,
  };

  return new MTNMoMoAdapter(credentials);
}
