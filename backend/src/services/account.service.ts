/**
 * ReshADX - Account Service  
 * Financial account management
 */

import db from '../database';
import { logger } from '../utils/logger';

export class AccountService {
  /**
   * Get all accounts for user
   */
  async getAccounts(userId: string, filters: any = {}): Promise<any[]> {
    try {
      let query = db('accounts as a')
        .join('items as i', 'a.item_id', 'i.item_id')
        .join('institutions as inst', 'a.institution_id', 'inst.institution_id')
        .where({ 'a.user_id': userId })
        .whereNull('a.deleted_at')
        .select(
          'a.*',
          'inst.name as institution_name',
          'inst.display_name as institution_display_name',
          'i.status as item_status'
        );

      if (filters.itemId) {
        query = query.where({ 'a.item_id': filters.itemId });
      }

      if (filters.type) {
        query = query.where({ 'a.account_type': filters.type });
      }

      if (filters.status) {
        query = query.where({ 'a.status': filters.status });
      }

      const accounts = await query.orderBy('a.created_at', 'desc');

      return accounts.map(this.formatAccount);
    } catch (error) {
      logger.error('Error fetching accounts', { error, userId });
      throw error;
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(accountId: string, userId: string): Promise<any> {
    try {
      const account = await db('accounts as a')
        .join('institutions as inst', 'a.institution_id', 'inst.institution_id')
        .where({ 'a.account_id': accountId, 'a.user_id': userId })
        .whereNull('a.deleted_at')
        .select('a.*', 'inst.display_name as institution_name')
        .first();

      if (!account) {
        throw new Error('Account not found');
      }

      return this.formatAccount(account);
    } catch (error) {
      logger.error('Error fetching account', { error, accountId });
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(accountId: string, userId: string): Promise<any> {
    try {
      const account = await db('accounts')
        .where({ account_id: accountId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!account) {
        throw new Error('Account not found');
      }

      return {
        current: account.current_balance / 100,
        available: account.available_balance / 100,
        pending: account.pending_balance / 100,
        currency: account.currency,
        asOf: account.balance_as_of,
      };
    } catch (error) {
      logger.error('Error fetching balance', { error, accountId });
      throw error;
    }
  }

  /**
   * Get balance history
   */
  async getBalanceHistory(accountId: string, userId: string, filters: any = {}): Promise<any[]> {
    try {
      const account = await db('accounts')
        .where({ account_id: accountId, user_id: userId })
        .first();

      if (!account) {
        throw new Error('Account not found');
      }

      // Return from balance_history JSONB field
      const history = account.balance_history || [];
      
      return history.map((entry: any) => ({
        date: entry.date,
        balance: entry.balance / 100,
        currency: account.currency,
      }));
    } catch (error) {
      logger.error('Error fetching balance history', { error, accountId });
      throw error;
    }
  }

  /**
   * Format account for API response
   */
  private formatAccount(account: any): any {
    return {
      accountId: account.account_id,
      itemId: account.item_id,
      institutionName: account.institution_display_name || account.institution_name,
      accountName: account.account_name,
      officialName: account.official_name,
      accountType: account.account_type,
      accountSubtype: account.account_subtype,
      mask: account.account_number_masked,
      balance: {
        current: account.current_balance / 100,
        available: account.available_balance / 100,
        pending: account.pending_balance / 100,
        currency: account.currency,
      },
      status: account.status,
      isMobileMoney: account.account_type === 'MOBILE_MONEY',
      mobileNumber: account.mobile_number_masked,
      createdAt: account.created_at,
    };
  }
}
