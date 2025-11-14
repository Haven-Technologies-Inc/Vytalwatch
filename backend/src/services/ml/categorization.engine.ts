/**
 * ReshADX - Transaction Categorization ML Engine
 * Intelligent transaction categorization using merchant data and patterns
 */

import db from '../../database';
import { logger } from '../../utils/logger';
import { CacheService } from '../../cache';

const cache = new CacheService();

export interface CategorizationInput {
  transactionId?: string;
  merchantName?: string;
  description?: string;
  amount: number;
  transactionType: 'DEBIT' | 'CREDIT';
  mcc?: string; // Merchant Category Code
  location?: string;
}

export interface CategorizationResult {
  primaryCategory: string;
  secondaryCategory?: string;
  confidence: number; // 0-100%
  suggestedCategories: CategorySuggestion[];
  merchantInfo?: MerchantInfo;
  tags: string[];
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
}

export interface MerchantInfo {
  merchantId?: string;
  merchantName: string;
  category: string;
  logo?: string;
  knownMerchant: boolean;
}

// Transaction categories (aligned with Plaid)
export const TRANSACTION_CATEGORIES = {
  // Income
  INCOME: {
    SALARY: 'Salary',
    BUSINESS_INCOME: 'Business Income',
    INVESTMENT_INCOME: 'Investment Income',
    RENTAL_INCOME: 'Rental Income',
    GOVERNMENT_BENEFITS: 'Government Benefits',
    OTHER_INCOME: 'Other Income',
  },

  // Food & Dining
  FOOD_AND_DRINK: {
    RESTAURANTS: 'Restaurants',
    FAST_FOOD: 'Fast Food',
    GROCERIES: 'Groceries',
    BARS_AND_NIGHTLIFE: 'Bars & Nightlife',
    COFFEE_SHOPS: 'Coffee Shops',
  },

  // Shopping
  SHOPPING: {
    CLOTHING: 'Clothing & Apparel',
    ELECTRONICS: 'Electronics',
    GENERAL_MERCHANDISE: 'General Merchandise',
    ONLINE_SHOPPING: 'Online Shopping',
    PHARMACIES: 'Pharmacies',
    SPORTING_GOODS: 'Sporting Goods',
  },

  // Transportation
  TRANSPORTATION: {
    PUBLIC_TRANSIT: 'Public Transit',
    TAXI_RIDESHARE: 'Taxi & Rideshare',
    GAS_FUEL: 'Gas & Fuel',
    PARKING: 'Parking',
    VEHICLE_MAINTENANCE: 'Vehicle Maintenance',
  },

  // Bills & Utilities
  BILLS_AND_UTILITIES: {
    ELECTRICITY: 'Electricity',
    WATER: 'Water',
    INTERNET: 'Internet',
    MOBILE_PHONE: 'Mobile Phone',
    CABLE_TV: 'Cable/Streaming',
    RENT: 'Rent',
    MORTGAGE: 'Mortgage',
  },

  // Entertainment
  ENTERTAINMENT: {
    MOVIES: 'Movies & Shows',
    MUSIC: 'Music',
    SPORTS: 'Sports',
    EVENTS: 'Events & Concerts',
    STREAMING_SERVICES: 'Streaming Services',
  },

  // Health & Wellness
  HEALTH_AND_WELLNESS: {
    DOCTORS: 'Doctor Visits',
    PHARMACY: 'Pharmacy',
    GYM_FITNESS: 'Gym & Fitness',
    HEALTH_INSURANCE: 'Health Insurance',
  },

  // Financial
  FINANCIAL: {
    LOAN_PAYMENTS: 'Loan Payments',
    CREDIT_CARD_PAYMENT: 'Credit Card Payment',
    INVESTMENTS: 'Investments',
    TRANSFER_OUT: 'Transfer Out',
    TRANSFER_IN: 'Transfer In',
    BANK_FEES: 'Bank Fees',
    ATM_WITHDRAWAL: 'ATM Withdrawal',
  },

  // Mobile Money (African specific)
  MOBILE_MONEY: {
    AIRTIME: 'Airtime Purchase',
    DATA_BUNDLE: 'Data Bundle',
    MOBILE_MONEY_TRANSFER: 'Mobile Money Transfer',
    MOBILE_MONEY_WITHDRAWAL: 'Mobile Money Withdrawal',
    MOBILE_MONEY_DEPOSIT: 'Mobile Money Deposit',
  },

  // Education
  EDUCATION: {
    TUITION: 'Tuition',
    BOOKS_SUPPLIES: 'Books & Supplies',
    ONLINE_COURSES: 'Online Courses',
  },

  // Travel
  TRAVEL: {
    FLIGHTS: 'Flights',
    HOTELS: 'Hotels',
    CAR_RENTAL: 'Car Rental',
    TRAVEL_AGENCIES: 'Travel Agencies',
  },

  // Personal
  PERSONAL: {
    PERSONAL_CARE: 'Personal Care',
    CHILDCARE: 'Childcare',
    PET_CARE: 'Pet Care',
    DONATIONS: 'Donations',
    GIFTS: 'Gifts',
  },

  // Other
  OTHER: {
    UNCATEGORIZED: 'Uncategorized',
    CASH_WITHDRAWAL: 'Cash Withdrawal',
    CHECK_DEPOSIT: 'Check Deposit',
  },
};

export class CategorizationEngine {
  private merchantCache: Map<string, MerchantInfo> = new Map();

  /**
   * Categorize a transaction
   */
  async categorizeTransaction(input: CategorizationInput): Promise<CategorizationResult> {
    try {
      logger.debug('Categorizing transaction', {
        merchantName: input.merchantName,
        amount: input.amount,
      });

      const suggestions: CategorySuggestion[] = [];

      // Method 1: Check known merchants (highest confidence)
      if (input.merchantName) {
        const merchantCategory = await this.categorizeByMerchant(input.merchantName);
        if (merchantCategory) {
          suggestions.push({
            category: merchantCategory.category,
            confidence: 95,
            reason: 'Known merchant',
          });
        }
      }

      // Method 2: MCC code mapping
      if (input.mcc) {
        const mccCategory = this.categorizeByMCC(input.mcc);
        if (mccCategory) {
          suggestions.push({
            category: mccCategory,
            confidence: 85,
            reason: 'Merchant Category Code',
          });
        }
      }

      // Method 3: Keyword matching in description
      if (input.description || input.merchantName) {
        const text = `${input.description || ''} ${input.merchantName || ''}`.toLowerCase();
        const keywordCategory = this.categorizeByKeywords(text);
        if (keywordCategory) {
          suggestions.push({
            category: keywordCategory,
            confidence: 75,
            reason: 'Keyword match',
          });
        }
      }

      // Method 4: Amount-based patterns
      const amountCategory = this.categorizeByAmount(input.amount, input.transactionType);
      if (amountCategory) {
        suggestions.push({
          category: amountCategory,
          confidence: 60,
          reason: 'Amount pattern',
        });
      }

      // Method 5: User's transaction history (machine learning)
      if (input.transactionId) {
        const historyCategory = await this.categorizeByHistory(input);
        if (historyCategory) {
          suggestions.push({
            category: historyCategory,
            confidence: 70,
            reason: 'Similar transactions',
          });
        }
      }

      // Select best category
      suggestions.sort((a, b) => b.confidence - a.confidence);

      const primaryCategory = suggestions[0]?.category || 'OTHER.UNCATEGORIZED';
      const confidence = suggestions[0]?.confidence || 50;

      // Generate tags
      const tags = this.generateTags(input, primaryCategory);

      // Get merchant info
      let merchantInfo: MerchantInfo | undefined;
      if (input.merchantName) {
        merchantInfo = await this.getMerchantInfo(input.merchantName);
      }

      const result: CategorizationResult = {
        primaryCategory,
        confidence,
        suggestedCategories: suggestions.slice(0, 3),
        merchantInfo,
        tags,
      };

      // Store categorization for learning
      if (input.transactionId) {
        await this.storeCategorization(input.transactionId, result);
      }

      logger.debug('Transaction categorized', {
        category: primaryCategory,
        confidence,
      });

      return result;
    } catch (error) {
      logger.error('Error categorizing transaction', { error });
      throw error;
    }
  }

  /**
   * Categorize by known merchant
   */
  private async categorizeByMerchant(merchantName: string): Promise<MerchantInfo | null> {
    // Check cache
    const cached = this.merchantCache.get(merchantName.toLowerCase());
    if (cached) return cached;

    // Check database
    const merchant = await db('merchants')
      .where('name', 'ilike', merchantName)
      .first();

    if (merchant) {
      const info: MerchantInfo = {
        merchantId: merchant.merchant_id,
        merchantName: merchant.name,
        category: merchant.category,
        logo: merchant.logo_url,
        knownMerchant: true,
      };

      this.merchantCache.set(merchantName.toLowerCase(), info);
      return info;
    }

    return null;
  }

  /**
   * Categorize by MCC (Merchant Category Code)
   */
  private categorizeByMCC(mcc: string): string | null {
    const mccMap: Record<string, string> = {
      // Food & Dining
      '5811': 'FOOD_AND_DRINK.RESTAURANTS',
      '5812': 'FOOD_AND_DRINK.RESTAURANTS',
      '5814': 'FOOD_AND_DRINK.FAST_FOOD',
      '5411': 'FOOD_AND_DRINK.GROCERIES',
      '5412': 'FOOD_AND_DRINK.GROCERIES',
      '5813': 'FOOD_AND_DRINK.BARS_AND_NIGHTLIFE',

      // Gas Stations
      '5541': 'TRANSPORTATION.GAS_FUEL',
      '5542': 'TRANSPORTATION.GAS_FUEL',

      // Utilities
      '4900': 'BILLS_AND_UTILITIES.ELECTRICITY',
      '4814': 'BILLS_AND_UTILITIES.MOBILE_PHONE',
      '4899': 'BILLS_AND_UTILITIES.INTERNET',

      // Healthcare
      '5912': 'HEALTH_AND_WELLNESS.PHARMACY',
      '8011': 'HEALTH_AND_WELLNESS.DOCTORS',
      '8021': 'HEALTH_AND_WELLNESS.DOCTORS',

      // Entertainment
      '7832': 'ENTERTAINMENT.MOVIES',
      '7922': 'ENTERTAINMENT.EVENTS',
      '7929': 'ENTERTAINMENT.MUSIC',

      // Transportation
      '4111': 'TRANSPORTATION.PUBLIC_TRANSIT',
      '4112': 'TRANSPORTATION.PUBLIC_TRANSIT',
      '4121': 'TRANSPORTATION.TAXI_RIDESHARE',
      '7523': 'TRANSPORTATION.PARKING',

      // Shopping
      '5310': 'SHOPPING.GENERAL_MERCHANDISE',
      '5311': 'SHOPPING.GENERAL_MERCHANDISE',
      '5651': 'SHOPPING.CLOTHING',
      '5732': 'SHOPPING.ELECTRONICS',

      // Travel
      '3000': 'TRAVEL.FLIGHTS',
      '3001': 'TRAVEL.FLIGHTS',
      '3501': 'TRAVEL.HOTELS',
      '3502': 'TRAVEL.HOTELS',
      '7512': 'TRAVEL.CAR_RENTAL',
    };

    return mccMap[mcc] || null;
  }

  /**
   * Categorize by keywords in description
   */
  private categorizeByKeywords(text: string): string | null {
    const keywordMap: Record<string, string[]> = {
      // Mobile Money & Telecom (African specific)
      'MOBILE_MONEY.AIRTIME': ['airtime', 'recharge', 'top up', 'topup', 'credit'],
      'MOBILE_MONEY.DATA_BUNDLE': ['data', 'bundle', 'internet bundle'],
      'MOBILE_MONEY.MOBILE_MONEY_TRANSFER': ['momo', 'mobile money', 'mtn money', 'vodafone cash', 'airteltigo money'],

      // Food & Dining
      'FOOD_AND_DRINK.RESTAURANTS': ['restaurant', 'cafe', 'bistro', 'diner', 'eatery'],
      'FOOD_AND_DRINK.FAST_FOOD': ['kfc', 'pizza', 'burger', 'subway', 'mcdonalds'],
      'FOOD_AND_DRINK.GROCERIES': ['supermarket', 'grocery', 'shoprite', 'maxmart', 'palace', 'melcom'],
      'FOOD_AND_DRINK.COFFEE_SHOPS': ['coffee', 'starbucks', 'cafe'],

      // Transportation
      'TRANSPORTATION.TAXI_RIDESHARE': ['uber', 'bolt', 'yango', 'taxi'],
      'TRANSPORTATION.GAS_FUEL': ['shell', 'total', 'goil', 'petrol', 'fuel', 'gas station'],
      'TRANSPORTATION.PUBLIC_TRANSIT': ['metro', 'bus', 'trotro', 'transit'],

      // Bills & Utilities
      'BILLS_AND_UTILITIES.ELECTRICITY': ['ecg', 'electricity', 'power', 'prepaid'],
      'BILLS_AND_UTILITIES.WATER': ['water', 'gwcl'],
      'BILLS_AND_UTILITIES.INTERNET': ['internet', 'broadband', 'wifi'],
      'BILLS_AND_UTILITIES.MOBILE_PHONE': ['phone bill', 'mtn', 'vodafone', 'airteltigo'],
      'BILLS_AND_UTILITIES.CABLE_TV': ['dstv', 'gotv', 'startimes', 'cable', 'streaming', 'netflix'],

      // Shopping
      'SHOPPING.CLOTHING': ['clothing', 'apparel', 'fashion', 'boutique'],
      'SHOPPING.ELECTRONICS': ['electronics', 'computer', 'phone', 'laptop'],
      'SHOPPING.ONLINE_SHOPPING': ['jumia', 'amazon', 'ebay', 'tonaton'],

      // Health
      'HEALTH_AND_WELLNESS.PHARMACY': ['pharmacy', 'drug', 'medicine'],
      'HEALTH_AND_WELLNESS.GYM_FITNESS': ['gym', 'fitness', 'workout'],

      // Education
      'EDUCATION.TUITION': ['tuition', 'school fees', 'university'],
      'EDUCATION.BOOKS_SUPPLIES': ['books', 'stationery'],

      // Entertainment
      'ENTERTAINMENT.STREAMING_SERVICES': ['netflix', 'spotify', 'youtube premium', 'apple music'],
      'ENTERTAINMENT.MOVIES': ['cinema', 'silverbird', 'movie'],

      // Financial
      'FINANCIAL.ATM_WITHDRAWAL': ['atm', 'withdrawal', 'cash out'],
      'FINANCIAL.BANK_FEES': ['fee', 'charge', 'service charge'],
      'FINANCIAL.TRANSFER_OUT': ['transfer', 'send money'],

      // Income
      'INCOME.SALARY': ['salary', 'wage', 'payroll', 'payment from employer'],
    };

    for (const [category, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category;
        }
      }
    }

    return null;
  }

  /**
   * Categorize by amount patterns
   */
  private categorizeByAmount(amount: number, type: 'DEBIT' | 'CREDIT'): string | null {
    // Convert from smallest unit (pesewas) to GHS
    const amountGHS = amount / 100;

    if (type === 'CREDIT') {
      // Large deposits likely salary
      if (amountGHS >= 1000) {
        return 'INCOME.SALARY';
      }
    } else {
      // Small amounts often airtime/data
      if (amountGHS >= 1 && amountGHS <= 50) {
        return 'MOBILE_MONEY.AIRTIME';
      }

      // Medium amounts could be groceries
      if (amountGHS >= 50 && amountGHS <= 500) {
        return 'FOOD_AND_DRINK.GROCERIES';
      }

      // Large round numbers often rent/bills
      if (amountGHS >= 500 && amountGHS % 100 === 0) {
        return 'BILLS_AND_UTILITIES.RENT';
      }
    }

    return null;
  }

  /**
   * Categorize based on user's transaction history
   */
  private async categorizeByHistory(input: CategorizationInput): Promise<string | null> {
    if (!input.merchantName) return null;

    // Find similar transactions by this user
    const similar = await db('transactions')
      .where('merchant_name', 'ilike', input.merchantName)
      .whereNotNull('primary_category')
      .select('primary_category')
      .limit(10);

    if (similar.length === 0) return null;

    // Find most common category
    const categoryCounts: Record<string, number> = {};
    for (const txn of similar) {
      categoryCounts[txn.primary_category] = (categoryCounts[txn.primary_category] || 0) + 1;
    }

    const mostCommon = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

    if (mostCommon && mostCommon[1] >= 3) {
      return mostCommon[0];
    }

    return null;
  }

  /**
   * Generate tags for transaction
   */
  private generateTags(input: CategorizationInput, category: string): string[] {
    const tags: string[] = [];

    // Add category-based tags
    const [primary, secondary] = category.split('.');
    if (primary) tags.push(primary.toLowerCase());
    if (secondary) tags.push(secondary.toLowerCase().replace(/_/g, '-'));

    // Add type tag
    tags.push(input.transactionType.toLowerCase());

    // Add amount-based tags
    const amountGHS = input.amount / 100;
    if (amountGHS > 1000) tags.push('large-amount');
    else if (amountGHS < 10) tags.push('small-amount');

    // Add merchant tag
    if (input.merchantName) {
      tags.push('merchant');
    }

    return tags;
  }

  /**
   * Get merchant info
   */
  private async getMerchantInfo(merchantName: string): Promise<MerchantInfo> {
    const merchant = await this.categorizeByMerchant(merchantName);

    if (merchant) {
      return merchant;
    }

    return {
      merchantName,
      category: 'OTHER.UNCATEGORIZED',
      knownMerchant: false,
    };
  }

  /**
   * Store categorization for machine learning
   */
  private async storeCategorization(
    transactionId: string,
    result: CategorizationResult
  ): Promise<void> {
    try {
      await db('transactions')
        .where({ transaction_id: transactionId })
        .update({
          primary_category: result.primaryCategory,
          secondary_category: result.secondaryCategory,
          category_confidence: result.confidence,
        });

      // Store for ML training
      await db('categorization_history').insert({
        transaction_id: transactionId,
        predicted_category: result.primaryCategory,
        confidence: result.confidence,
        suggestions: JSON.stringify(result.suggestedCategories),
        created_at: new Date(),
      });
    } catch (error) {
      logger.error('Error storing categorization', { error, transactionId });
    }
  }

  /**
   * Bulk categorize transactions
   */
  async categorizeTransactions(transactions: any[]): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>();

    for (const txn of transactions) {
      try {
        const input: CategorizationInput = {
          transactionId: txn.transaction_id,
          merchantName: txn.merchant_name,
          description: txn.description,
          amount: txn.amount,
          transactionType: txn.transaction_type,
          mcc: txn.merchant_category_code,
        };

        const result = await this.categorizeTransaction(input);
        results.set(txn.transaction_id, result);
      } catch (error) {
        logger.error('Error categorizing transaction', {
          error,
          transactionId: txn.transaction_id,
        });
      }
    }

    return results;
  }

  /**
   * Learn from user corrections
   */
  async learnFromCorrection(
    transactionId: string,
    correctCategory: string
  ): Promise<void> {
    try {
      // Update transaction
      await db('transactions')
        .where({ transaction_id: transactionId })
        .update({
          primary_category: correctCategory,
          category_confidence: 100,
          user_verified: true,
        });

      // Store learning data
      const txn = await db('transactions')
        .where({ transaction_id: transactionId })
        .first();

      if (txn && txn.merchant_name) {
        // Update merchant mapping
        await db('merchant_category_mappings').insert({
          merchant_name: txn.merchant_name,
          category: correctCategory,
          confidence: 100,
          learned_from_user: true,
          created_at: new Date(),
        }).onConflict(['merchant_name']).merge();

        logger.info('Learned from user correction', {
          merchantName: txn.merchant_name,
          category: correctCategory,
        });
      }
    } catch (error) {
      logger.error('Error learning from correction', { error, transactionId });
      throw error;
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    let query = db('transactions')
      .where({ user_id: userId })
      .whereNotNull('primary_category');

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    const stats = await query
      .select('primary_category')
      .count('* as count')
      .sum('amount as total')
      .groupBy('primary_category')
      .orderBy('total', 'desc');

    return stats.map(s => ({
      category: s.primary_category,
      count: parseInt(s.count as string),
      total: s.total / 100, // Convert to GHS
    }));
  }
}
