/**
 * ReshADX - Transaction Service
 * Transaction data and enrichment
 */

import db from '../database';
import { logger } from '../utils/logger';

export class TransactionService {
  /**
   * Get transactions for user
   */
  async getTransactions(userId: string, filters: any = {}): Promise<{
    transactions: any[];
    total: number;
  }> {
    try {
      let query = db('transactions as t')
        .join('accounts as a', 't.account_id', 'a.account_id')
        .where({ 't.user_id': userId })
        .select('t.*', 'a.account_name', 'a.currency');

      // Apply filters
      if (filters.accountId) {
        query = query.where({ 't.account_id': filters.accountId });
      }

      if (filters.startDate) {
        query = query.where('t.date', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('t.date', '<=', filters.endDate);
      }

      if (filters.minAmount) {
        query = query.where('t.amount', '>=', filters.minAmount * 100);
      }

      if (filters.maxAmount) {
        query = query.where('t.amount', '<=', filters.maxAmount * 100);
      }

      if (filters.category) {
        query = query.where('t.primary_category', '=', filters.category);
      }

      if (filters.search) {
        query = query.where((builder: any) => {
          builder
            .where('t.description', 'ilike', `%${filters.search}%`)
            .orWhere('t.merchant_name', 'ilike', `%${filters.search}%`);
        });
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('* as count');

      // Apply pagination
      const limit = Math.min(filters.limit || 100, 500);
      const offset = filters.offset || 0;

      const transactions = await query
        .limit(limit)
        .offset(offset)
        .orderBy('t.date', 'desc');

      return {
        transactions: transactions.map(this.formatTransaction),
        total: parseInt(count as string),
      };
    } catch (error) {
      logger.error('Error fetching transactions', { error, userId });
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string, userId: string): Promise<any> {
    try {
      const transaction = await db('transactions as t')
        .join('accounts as a', 't.account_id', 'a.account_id')
        .where({ 't.transaction_id': transactionId, 't.user_id': userId })
        .select('t.*', 'a.account_name')
        .first();

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return this.formatTransaction(transaction);
    } catch (error) {
      logger.error('Error fetching transaction', { error, transactionId });
      throw error;
    }
  }

  /**
   * Get spending analytics
   */
  async getSpendingAnalytics(userId: string, filters: any = {}): Promise<any> {
    try {
      let query = db('transactions')
        .where({ user_id: userId, transaction_type: 'DEBIT' })
        .where('amount', '>', 0);

      if (filters.accountId) {
        query = query.where({ account_id: filters.accountId });
      }

      if (filters.startDate) {
        query = query.where('date', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('date', '<=', filters.endDate);
      }

      const groupBy = filters.groupBy || 'category';

      if (groupBy === 'category') {
        const results = await query
          .select('primary_category')
          .sum('amount as total_amount')
          .count('* as transaction_count')
          .groupBy('primary_category')
          .orderBy('total_amount', 'desc');

        return {
          groupBy: 'category',
          data: results.map((r: any) => ({
            category: r.primary_category,
            amount: r.total_amount / 100,
            transactionCount: parseInt(r.transaction_count),
          })),
        };
      }

      if (groupBy === 'merchant') {
        const results = await query
          .select('merchant_name_normalized')
          .sum('amount as total_amount')
          .count('* as transaction_count')
          .groupBy('merchant_name_normalized')
          .whereNotNull('merchant_name_normalized')
          .orderBy('total_amount', 'desc')
          .limit(20);

        return {
          groupBy: 'merchant',
          data: results.map((r: any) => ({
            merchant: r.merchant_name_normalized,
            amount: r.total_amount / 100,
            transactionCount: parseInt(r.transaction_count),
          })),
        };
      }

      return { groupBy, data: [] };
    } catch (error) {
      logger.error('Error fetching spending analytics', { error, userId });
      throw error;
    }
  }

  /**
   * Get income analytics
   */
  async getIncomeAnalytics(userId: string, filters: any = {}): Promise<any> {
    try {
      let query = db('transactions')
        .where({ user_id: userId, transaction_type: 'CREDIT' })
        .where('amount', '>', 0);

      if (filters.accountId) {
        query = query.where({ account_id: filters.accountId });
      }

      if (filters.startDate) {
        query = query.where('date', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('date', '<=', filters.endDate);
      }

      const [result] = await query
        .sum('amount as total_income')
        .avg('amount as avg_income')
        .count('* as transaction_count');

      return {
        totalIncome: result.total_income / 100,
        averageIncome: result.avg_income / 100,
        transactionCount: parseInt(result.transaction_count),
      };
    } catch (error) {
      logger.error('Error fetching income analytics', { error, userId });
      throw error;
    }
  }

  /**
   * Get recurring transactions
   */
  async getRecurringTransactions(userId: string, filters: any = {}): Promise<any[]> {
    try {
      let query = db('transactions')
        .where({ user_id: userId, is_recurring: true });

      if (filters.accountId) {
        query = query.where({ account_id: filters.accountId });
      }

      const transactions = await query
        .orderBy('merchant_name_normalized')
        .orderBy('date', 'desc');

      // Group by recurring_group_id
      const grouped = new Map();
      for (const tx of transactions) {
        const groupId = tx.recurring_group_id || tx.merchant_name_normalized;
        if (!grouped.has(groupId)) {
          grouped.set(groupId, []);
        }
        grouped.get(groupId).push(tx);
      }

      return Array.from(grouped.values()).map((group: any) => ({
        merchantName: group[0].merchant_name_normalized,
        frequency: group[0].recurring_frequency,
        averageAmount: group.reduce((sum: number, t: any) => sum + t.amount, 0) / group.length / 100,
        lastAmount: group[0].amount / 100,
        lastDate: group[0].date,
        nextExpectedDate: group[0].next_expected_date,
        transactionCount: group.length,
        category: group[0].primary_category,
      }));
    } catch (error) {
      logger.error('Error fetching recurring transactions', { error, userId });
      throw error;
    }
  }

  /**
   * Format transaction for API response
   */
  private formatTransaction(tx: any): any {
    return {
      transactionId: tx.transaction_id,
      accountId: tx.account_id,
      amount: tx.amount / 100,
      currency: tx.currency,
      date: tx.date,
      type: tx.transaction_type,
      description: tx.description_clean || tx.description,
      merchantName: tx.merchant_name_normalized || tx.merchant_name,
      category: {
        primary: tx.primary_category,
        detailed: tx.detailed_category,
        african: tx.african_category,
      },
      pending: tx.is_pending,
      location: tx.location_city ? {
        city: tx.location_city,
        country: tx.location_country,
      } : null,
      paymentMethod: tx.payment_method,
      isRecurring: tx.is_recurring,
    };
  }
}
