/**
 * ReshADX TypeScript SDK - Accounts Resource
 */

import { HttpClient } from '../utils/http';
import { GetAccountsResponse, Account, BalanceResponse } from '../types';

export class Accounts {
  constructor(private http: HttpClient) {}

  /**
   * Get all accounts for a user
   */
  async list(itemId?: string): Promise<GetAccountsResponse> {
    const params = itemId ? { itemId } : {};
    return this.http.get<GetAccountsResponse>('/accounts', { params });
  }

  /**
   * Get specific account details
   */
  async get(accountId: string): Promise<Account> {
    return this.http.get<Account>(`/accounts/${accountId}`);
  }

  /**
   * Get account balance
   */
  async getBalance(accountId: string): Promise<BalanceResponse> {
    return this.http.get<BalanceResponse>(`/accounts/${accountId}/balance`);
  }

  /**
   * Refresh account data
   */
  async refresh(accountId: string): Promise<Account> {
    return this.http.post<Account>(`/accounts/${accountId}/refresh`);
  }
}
