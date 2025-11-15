/**
 * ReshADX - Stanbic Bank API Integration
 * Complete integration with Stanbic Bank (Standard Bank Group)
 * Operating across Africa: Ghana, Uganda, Kenya, Nigeria, Zambia, etc.
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import config from '../../config';

export interface StanbicCredentials {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  subscriptionKey: string;
  environment: 'sandbox' | 'production';
  countryCode?: string; // ISO 3166-1 alpha-2 (e.g., 'GH', 'UG', 'KE', 'NG')
}

export interface StanbicAccount {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT' | 'CALL_DEPOSIT' | 'BUSINESS';
  currency: string;
  balance: number;
  availableBalance: number;
  holdBalance: number;
  branchCode: string;
  productCode: string;
  productName: string;
  status: 'ACTIVE' | 'DORMANT' | 'BLOCKED' | 'CLOSED';
  openedDate: string;
  iban?: string;
  swiftBic?: string;
}

export interface StanbicTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  transactionType: 'DEBIT' | 'CREDIT';
  description: string;
  narrative: string;
  bookingDate: string;
  valueDate: string;
  runningBalance: number;
  reference: string;
  transactionCode: string;
  transactionCategory: string;
  merchantInfo?: {
    name?: string;
    category?: string;
    mcc?: string;
  };
}

export interface StanbicPaymentRequest {
  debtorAccount: string;
  creditorAccount: string;
  amount: number;
  currency: string;
  reference: string;
  creditorName?: string;
  remittanceInfo?: string;
  paymentType: 'DOMESTIC' | 'SEPA' | 'SWIFT';
  urgency?: 'NORMAL' | 'URGENT';
  creditorAgent?: {
    bankCode?: string;
    swiftBic?: string;
  };
}

export class StanbicBankAdapter {
  private client: AxiosInstance;
  private credentials: StanbicCredentials;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(credentials: StanbicCredentials) {
    this.credentials = credentials;

    const baseURL = credentials.environment === 'production'
      ? `https://api.stanbicbank.com/${credentials.countryCode?.toLowerCase() || 'gh'}/v1`
      : `https://sandbox-api.stanbicbank.com/${credentials.countryCode?.toLowerCase() || 'gh'}/v1`;

    this.client = axios.create({
      baseURL,
      headers: {
        'X-IBM-Client-Id': credentials.clientId,
        'X-IBM-Client-Secret': credentials.clientSecret,
        'Ocp-Apim-Subscription-Key': credentials.subscriptionKey,
        'X-Country-Code': credentials.countryCode || 'GH',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
      const response = await this.client.post('/oauth/token', {
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        scope: 'accounts payments',
      });

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000); // Refresh 60s before expiry

      logger.info('Stanbic: Access token obtained', {
        expiresIn,
        countryCode: this.credentials.countryCode,
      });

      return this.accessToken;
    } catch (error: any) {
      logger.error('Stanbic: Failed to get access token', {
        error: error.response?.data || error.message,
        countryCode: this.credentials.countryCode,
      });
      throw new Error('Failed to authenticate with Stanbic Bank API');
    }
  }

  /**
   * Get customer accounts
   */
  async getAccounts(customerId: string): Promise<StanbicAccount[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Customer-Id': customerId,
        },
      });

      const accounts = response.data.accounts || response.data.data?.accounts || [];

      return accounts.map((account: any) => ({
        accountId: account.account_id || account.resourceId,
        accountNumber: account.account_number || account.iban?.replace(/\s/g, '').slice(-10),
        accountName: account.account_name || account.name,
        accountType: this.mapAccountType(account.account_type || account.cashAccountType),
        currency: account.currency || 'GHS',
        balance: this.convertToMinorUnits(account.balance || account.balances?.[0]?.amount, account.currency),
        availableBalance: this.convertToMinorUnits(
          account.available_balance || account.balances?.find((b: any) => b.balanceType === 'AVAILABLE')?.amount || account.balance,
          account.currency
        ),
        holdBalance: this.convertToMinorUnits(
          account.hold_balance || account.balances?.find((b: any) => b.balanceType === 'FORWARD_AVAILABLE')?.amount || '0',
          account.currency
        ),
        branchCode: account.branch_code || account.branchId || '',
        productCode: account.product_code || account.product || '',
        productName: account.product_name || account.productName || '',
        status: this.mapAccountStatus(account.status),
        openedDate: account.opened_date || account.openingDate || new Date().toISOString(),
        iban: account.iban,
        swiftBic: account.swift_bic || account.bic,
      }));
    } catch (error: any) {
      logger.error('Stanbic: Failed to get accounts', {
        error: error.response?.data || error.message,
        customerId,
      });
      throw new Error('Failed to get customer accounts from Stanbic');
    }
  }

  /**
   * Get specific account details
   */
  async getAccountDetails(accountId: string): Promise<StanbicAccount> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const account = response.data.account || response.data;

      return {
        accountId: account.account_id || account.resourceId,
        accountNumber: account.account_number || account.iban?.replace(/\s/g, '').slice(-10),
        accountName: account.account_name || account.name,
        accountType: this.mapAccountType(account.account_type || account.cashAccountType),
        currency: account.currency || 'GHS',
        balance: this.convertToMinorUnits(account.balance || account.balances?.[0]?.amount, account.currency),
        availableBalance: this.convertToMinorUnits(
          account.available_balance || account.balances?.find((b: any) => b.balanceType === 'AVAILABLE')?.amount,
          account.currency
        ),
        holdBalance: this.convertToMinorUnits(
          account.hold_balance || account.balances?.find((b: any) => b.balanceType === 'FORWARD_AVAILABLE')?.amount || '0',
          account.currency
        ),
        branchCode: account.branch_code || account.branchId || '',
        productCode: account.product_code || account.product || '',
        productName: account.product_name || account.productName || '',
        status: this.mapAccountStatus(account.status),
        openedDate: account.opened_date || account.openingDate,
        iban: account.iban,
        swiftBic: account.swift_bic || account.bic,
      };
    } catch (error: any) {
      logger.error('Stanbic: Failed to get account details', {
        error: error.response?.data || error.message,
        accountId,
      });
      throw new Error('Failed to get account details from Stanbic');
    }
  }

  /**
   * Get account balance
   */
  async getBalance(accountId: string): Promise<{
    balance: number;
    availableBalance: number;
    holdBalance: number;
    currency: string;
    balanceDate: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountId}/balances`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const balances = response.data.balances || [];
      const currency = response.data.currency || 'GHS';

      const closingBalance = balances.find((b: any) => b.balanceType === 'CLOSING_BOOKED' || b.balanceType === 'EXPECTED');
      const availableBalance = balances.find((b: any) => b.balanceType === 'AVAILABLE' || b.balanceType === 'INTERIM_AVAILABLE');
      const forwardBalance = balances.find((b: any) => b.balanceType === 'FORWARD_AVAILABLE');

      return {
        balance: this.convertToMinorUnits(closingBalance?.amount || '0', currency),
        availableBalance: this.convertToMinorUnits(availableBalance?.amount || '0', currency),
        holdBalance: this.convertToMinorUnits(forwardBalance?.amount || '0', currency),
        currency,
        balanceDate: closingBalance?.referenceDate || new Date().toISOString().split('T')[0],
      };
    } catch (error: any) {
      logger.error('Stanbic: Failed to get balance', {
        error: error.response?.data || error.message,
        accountId,
      });
      throw new Error('Failed to get account balance from Stanbic');
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    accountId: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<StanbicTransaction[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/accounts/${accountId}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        params: {
          dateFrom: startDate,
          dateTo: endDate,
          limit,
        },
      });

      const transactions = response.data.transactions?.booked || response.data.transactions || [];

      return transactions.map((txn: any) => ({
        transactionId: txn.transaction_id || txn.transactionId || txn.entryReference,
        accountId: txn.account_id || accountId,
        amount: Math.abs(this.convertToMinorUnits(txn.amount || txn.transactionAmount?.amount, txn.currency || txn.transactionAmount?.currency)),
        currency: txn.currency || txn.transactionAmount?.currency || 'GHS',
        transactionType: this.determineTransactionType(txn),
        description: txn.description || txn.remittanceInformationUnstructured || txn.additionalInformation || '',
        narrative: txn.narrative || txn.remittanceInformationUnstructured || '',
        bookingDate: txn.booking_date || txn.bookingDate,
        valueDate: txn.value_date || txn.valueDate,
        runningBalance: this.convertToMinorUnits(
          txn.running_balance || txn.balanceAfterTransaction?.amount || '0',
          txn.currency
        ),
        reference: txn.reference || txn.endToEndId || txn.transactionId || '',
        transactionCode: txn.transaction_code || txn.proprietaryBankTransactionCode || '',
        transactionCategory: txn.transaction_category || this.categorizeTransaction(txn),
        merchantInfo: txn.merchant_name ? {
          name: txn.merchant_name,
          category: txn.merchant_category,
          mcc: txn.merchant_mcc,
        } : undefined,
      }));
    } catch (error: any) {
      logger.error('Stanbic: Failed to get transactions', {
        error: error.response?.data || error.message,
        accountId,
        startDate,
        endDate,
      });
      throw new Error('Failed to get transaction history from Stanbic');
    }
  }

  /**
   * Initiate payment
   */
  async initiatePayment(paymentRequest: StanbicPaymentRequest): Promise<{
    paymentId: string;
    status: 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    reference: string;
    transactionDate: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const payload: any = {
        instructedAmount: {
          amount: this.convertFromMinorUnits(paymentRequest.amount, paymentRequest.currency),
          currency: paymentRequest.currency,
        },
        debtorAccount: {
          identification: paymentRequest.debtorAccount,
        },
        creditorAccount: {
          identification: paymentRequest.creditorAccount,
        },
        creditorName: paymentRequest.creditorName || 'Beneficiary',
        endToEndIdentification: paymentRequest.reference,
        remittanceInformationUnstructured: paymentRequest.remittanceInfo || 'ReshADX payment',
      };

      // Add creditor bank details for inter-bank payments
      if (paymentRequest.paymentType !== 'DOMESTIC' && paymentRequest.creditorAgent) {
        payload.creditorAgent = {};

        if (paymentRequest.creditorAgent.bankCode) {
          payload.creditorAgent.bankCode = paymentRequest.creditorAgent.bankCode;
        }

        if (paymentRequest.creditorAgent.swiftBic) {
          payload.creditorAgent.bicfi = paymentRequest.creditorAgent.swiftBic;
        }
      }

      const endpoint = paymentRequest.paymentType === 'SWIFT'
        ? '/payments/cross-border'
        : paymentRequest.paymentType === 'SEPA'
        ? '/payments/sepa'
        : '/payments/domestic';

      const response = await this.client.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Request-ID': crypto.randomUUID(),
        },
      });

      logger.info('Stanbic: Payment initiated', {
        paymentId: response.data.paymentId,
        amount: paymentRequest.amount,
        paymentType: paymentRequest.paymentType,
      });

      return {
        paymentId: response.data.paymentId || response.data.payment_id,
        status: this.mapPaymentStatus(response.data.transactionStatus || response.data.status),
        reference: response.data.endToEndIdentification || paymentRequest.reference,
        transactionDate: response.data.transactionDate || new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Stanbic: Payment initiation failed', {
        error: error.response?.data || error.message,
        debtorAccount: paymentRequest.debtorAccount,
        creditorAccount: paymentRequest.creditorAccount,
        amount: paymentRequest.amount,
      });
      throw new Error('Failed to initiate payment with Stanbic');
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string, paymentType: 'DOMESTIC' | 'SEPA' | 'SWIFT' = 'DOMESTIC'): Promise<{
    paymentId: string;
    status: 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
    transactionDate: string;
    amount: number;
    currency: string;
    rejectionReason?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const endpoint = paymentType === 'SWIFT'
        ? `/payments/cross-border/${paymentId}/status`
        : paymentType === 'SEPA'
        ? `/payments/sepa/${paymentId}/status`
        : `/payments/domestic/${paymentId}/status`;

      const response = await this.client.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = response.data;

      return {
        paymentId: data.paymentId || paymentId,
        status: this.mapPaymentStatus(data.transactionStatus || data.status),
        transactionDate: data.transactionDate || data.createdAt,
        amount: this.convertToMinorUnits(data.instructedAmount?.amount || '0', data.instructedAmount?.currency),
        currency: data.instructedAmount?.currency || 'GHS',
        rejectionReason: data.statusReasonInformation || data.rejectionReason,
      };
    } catch (error: any) {
      logger.error('Stanbic: Failed to get payment status', {
        error: error.response?.data || error.message,
        paymentId,
      });
      throw new Error('Failed to get payment status from Stanbic');
    }
  }

  /**
   * Validate beneficiary account
   */
  async validateBeneficiary(accountNumber: string, bankCode?: string): Promise<{
    valid: boolean;
    accountName?: string;
    bankName?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.post('/accounts/validate', {
        accountNumber,
        bankCode: bankCode || 'SBICGHAC', // Stanbic Ghana SWIFT code
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return {
        valid: response.data.valid === true || response.data.status === 'VALID',
        accountName: response.data.accountName || response.data.account_name,
        bankName: response.data.bankName || response.data.bank_name || 'Stanbic Bank',
      };
    } catch (error: any) {
      logger.error('Stanbic: Beneficiary validation failed', {
        error: error.response?.data || error.message,
        accountNumber,
      });
      return { valid: false };
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
        .digest('base64'); // Stanbic uses base64 encoding

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Stanbic: Signature verification failed', { error });
      return false;
    }
  }

  /**
   * Helper: Map account type to standard format
   */
  private mapAccountType(type: string): 'SAVINGS' | 'CURRENT' | 'FIXED_DEPOSIT' | 'CALL_DEPOSIT' | 'BUSINESS' {
    if (!type) return 'CURRENT';

    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('SAV') || typeUpper === 'SVGS') return 'SAVINGS';
    if (typeUpper.includes('CURR') || typeUpper === 'CACC' || typeUpper.includes('CHECK')) return 'CURRENT';
    if (typeUpper.includes('FIXED') || typeUpper.includes('TERM')) return 'FIXED_DEPOSIT';
    if (typeUpper.includes('CALL')) return 'CALL_DEPOSIT';
    if (typeUpper.includes('BUS') || typeUpper.includes('CORP')) return 'BUSINESS';
    return 'CURRENT';
  }

  /**
   * Helper: Map account status
   */
  private mapAccountStatus(status: string): 'ACTIVE' | 'DORMANT' | 'BLOCKED' | 'CLOSED' {
    if (!status) return 'ACTIVE';

    const statusUpper = status.toUpperCase();
    if (statusUpper === 'ENABLED' || statusUpper === 'ACTIVE') return 'ACTIVE';
    if (statusUpper === 'DORMANT' || statusUpper === 'INACTIVE') return 'DORMANT';
    if (statusUpper === 'BLOCKED' || statusUpper === 'SUSPENDED') return 'BLOCKED';
    if (statusUpper === 'CLOSED' || statusUpper === 'DELETED') return 'CLOSED';
    return 'ACTIVE';
  }

  /**
   * Helper: Map payment status
   */
  private mapPaymentStatus(status: string): 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' {
    if (!status) return 'PENDING';

    const statusUpper = status.toUpperCase();
    if (statusUpper === 'ACCP' || statusUpper === 'ACCEPTED') return 'ACCEPTED';
    if (statusUpper === 'ACTC' || statusUpper === 'PROCESSING') return 'PROCESSING';
    if (statusUpper === 'ACSC' || statusUpper === 'COMPLETED' || statusUpper === 'SETTLED') return 'COMPLETED';
    if (statusUpper === 'RJCT' || statusUpper === 'REJECTED') return 'REJECTED';
    return 'PENDING';
  }

  /**
   * Helper: Determine transaction type from transaction data
   */
  private determineTransactionType(txn: any): 'DEBIT' | 'CREDIT' {
    // Check explicit indicator
    if (txn.creditDebitIndicator) {
      return txn.creditDebitIndicator === 'CRDT' ? 'CREDIT' : 'DEBIT';
    }

    // Check amount sign
    const amount = parseFloat(txn.amount || txn.transactionAmount?.amount || '0');
    return amount >= 0 ? 'CREDIT' : 'DEBIT';
  }

  /**
   * Helper: Categorize transaction based on code and description
   */
  private categorizeTransaction(txn: any): string {
    const code = txn.proprietaryBankTransactionCode || txn.transaction_code || '';
    const desc = (txn.description || txn.remittanceInformationUnstructured || '').toUpperCase();

    // ATM transactions
    if (code.includes('ATM') || desc.includes('ATM')) return 'ATM_WITHDRAWAL';

    // POS transactions
    if (code.includes('POS') || desc.includes('POS')) return 'POS_PURCHASE';

    // Transfers
    if (code.includes('TRF') || desc.includes('TRANSFER')) return 'TRANSFER';

    // Mobile banking
    if (desc.includes('MOBILE') || desc.includes('MOMO')) return 'MOBILE_BANKING';

    return 'OTHER';
  }

  /**
   * Helper: Convert amount to minor units (cents/pesewas)
   */
  private convertToMinorUnits(amount: string | number, currency: string): number {
    if (!amount) return 0;

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Currencies with no decimal subdivision
    const noDecimalCurrencies = ['UGX', 'RWF', 'KES']; // Some East African currencies

    if (noDecimalCurrencies.includes(currency)) {
      return Math.round(numAmount);
    }

    return Math.round(numAmount * 100);
  }

  /**
   * Helper: Convert from minor units to major units
   */
  private convertFromMinorUnits(amount: number, currency: string): string {
    const noDecimalCurrencies = ['UGX', 'RWF', 'KES'];

    if (noDecimalCurrencies.includes(currency)) {
      return amount.toString();
    }

    return (amount / 100).toFixed(2);
  }
}

/**
 * Factory function to create Stanbic Bank adapter
 */
export function createStanbicAdapter(countryCode?: string): StanbicBankAdapter {
  const credentials: StanbicCredentials = {
    clientId: config.integrations?.stanbic?.clientId || process.env.STANBIC_CLIENT_ID || '',
    clientSecret: config.integrations?.stanbic?.clientSecret || process.env.STANBIC_CLIENT_SECRET || '',
    apiKey: config.integrations?.stanbic?.apiKey || process.env.STANBIC_API_KEY || '',
    subscriptionKey: config.integrations?.stanbic?.subscriptionKey || process.env.STANBIC_SUBSCRIPTION_KEY || '',
    environment: (config.env === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
    countryCode: countryCode || config.integrations?.stanbic?.countryCode || process.env.STANBIC_COUNTRY_CODE || 'GH',
  };

  return new StanbicBankAdapter(credentials);
}
