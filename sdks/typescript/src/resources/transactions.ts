/**
 * ReshADX TypeScript SDK - Transactions Resource
 */

import { HttpClient } from '../utils/http';
import {
  GetTransactionsRequest,
  GetTransactionsResponse,
  Transaction,
  SyncTransactionsRequest,
  SyncTransactionsResponse,
  SpendingAnalyticsRequest,
  SpendingAnalyticsResponse,
} from '../types';

export class Transactions {
  constructor(private http: HttpClient) {}

  /**
   * Get transactions with optional filters
   */
  async list(request: GetTransactionsRequest = {}): Promise<GetTransactionsResponse> {
    return this.http.get<GetTransactionsResponse>('/transactions', { params: request });
  }

  /**
   * Get specific transaction details
   */
  async get(transactionId: string): Promise<Transaction> {
    return this.http.get<Transaction>(`/transactions/${transactionId}`);
  }

  /**
   * Sync transactions for an item
   */
  async sync(request: SyncTransactionsRequest): Promise<SyncTransactionsResponse> {
    return this.http.post<SyncTransactionsResponse>('/transactions/sync', request);
  }

  /**
   * Get spending analytics
   */
  async getSpendingAnalytics(request: SpendingAnalyticsRequest): Promise<SpendingAnalyticsResponse> {
    return this.http.get<SpendingAnalyticsResponse>('/transactions/analytics/spending', {
      params: request,
    });
  }

  /**
   * Get income analytics
   */
  async getIncomeAnalytics(request: {
    startDate: string;
    endDate: string;
    groupBy: 'day' | 'week' | 'month' | 'category';
  }): Promise<any> {
    return this.http.get('/transactions/analytics/income', { params: request });
  }

  /**
   * Get cash flow analytics
   */
  async getCashFlowAnalytics(request: {
    startDate: string;
    endDate: string;
    groupBy: 'day' | 'week' | 'month';
  }): Promise<any> {
    return this.http.get('/transactions/analytics/cashflow', { params: request });
  }

  /**
   * Categorize a transaction manually
   */
  async categorize(transactionId: string, category: string, subcategory?: string): Promise<Transaction> {
    return this.http.patch<Transaction>(`/transactions/${transactionId}/categorize`, {
      category,
      subcategory,
    });
  }

  /**
   * Search transactions
   */
  async search(query: {
    searchTerm: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<GetTransactionsResponse> {
    return this.http.get<GetTransactionsResponse>('/transactions/search', { params: query });
  }
}
