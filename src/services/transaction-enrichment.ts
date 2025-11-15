// ReshADX Transaction Enrichment Service
// ML-powered transaction categorization and merchant enrichment

import { EnrichedTransaction, MerchantData, CategoryData, AfricanTransactionContext, RawTransaction } from '../types/enrichment-api';

// ============================================================================
// TRANSACTION ENRICHMENT ENGINE
// ============================================================================

export class TransactionEnrichmentEngine {
  private static instance: TransactionEnrichmentEngine;
  private merchantCache: Map<string, MerchantData> = new Map();
  private categoryCache: Map<string, CategoryData> = new Map();

  private constructor() {
    this.initializeMerchantDatabase();
  }

  static getInstance(): TransactionEnrichmentEngine {
    if (!TransactionEnrichmentEngine.instance) {
      TransactionEnrichmentEngine.instance = new TransactionEnrichmentEngine();
    }
    return TransactionEnrichmentEngine.instance;
  }

  /**
   * Enrich a batch of transactions
   */
  async enrichTransactions(transactions: RawTransaction[]): Promise<EnrichedTransaction[]> {
    return Promise.all(
      transactions.map(tx => this.enrichTransaction(tx))
    );
  }

  /**
   * Enrich a single transaction
   */
  async enrichTransaction(transaction: RawTransaction): Promise<EnrichedTransaction> {
    // Run enrichment pipelines in parallel
    const [merchant, category, location, africanContext] = await Promise.all([
      this.identifyMerchant(transaction),
      this.categorizeTransaction(transaction),
      this.extractLocation(transaction),
      this.analyzeAfricanContext(transaction),
    ]);

    return {
      transaction_id: transaction.transaction_id || `tx_${Date.now()}`,
      original_description: transaction.description,
      amount: transaction.amount,
      currency: transaction.currency,
      date: transaction.date,

      merchant,
      category,
      location,
      counterparties: await this.identifyCounterparties(transaction),
      payment_meta: await this.extractPaymentMetadata(transaction),
      african_context: africanContext,

      enrichment_quality: this.calculateEnrichmentQuality(merchant, category),
      enrichment_timestamp: new Date().toISOString(),
      model_version: 'v1.5.0',
    };
  }

  /**
   * Identify merchant from transaction description
   */
  private async identifyMerchant(transaction: RawTransaction): Promise<MerchantData> {
    const description = transaction.description.toLowerCase();

    // Check cache first
    const cached = this.merchantCache.get(description);
    if (cached) return cached;

    // Extract merchant name using ML (simplified for demo)
    const merchantName = this.extractMerchantName(description);

    // Lookup merchant in database (mock data for now)
    const merchant: MerchantData = {
      name: merchantName,
      normalized_name: this.normalizeMerchantName(merchantName),
      confidence: 0.85,

      merchant_id: `merchant_${Buffer.from(merchantName).toString('base64').substring(0, 16)}`,
      merchant_category_code: this.inferMCC(description),
      business_registration_number: undefined,

      logo_url: undefined,
      brand_color: undefined,
      website: undefined,

      business_type: this.inferBusinessType(description),
      industry: this.inferIndustry(description),
      sub_industry: undefined,

      phone_number: undefined,
      email: undefined,
      social_media: undefined,

      is_chain: this.isChainMerchant(merchantName),
      parent_company: undefined,
      brand_name: merchantName,

      verified_merchant: false,
      verification_source: undefined,
    };

    // Cache for future requests
    this.merchantCache.set(description, merchant);

    return merchant;
  }

  /**
   * Extract merchant name from transaction description
   */
  private extractMerchantName(description: string): string {
    // Remove common prefixes/suffixes
    let name = description
      .replace(/^(purchase|payment|transfer|deposit|withdrawal)\s+/i, '')
      .replace(/\s+(ghana|nigeria|kenya|accra|lagos|nairobi)$/i, '')
      .replace(/\d{2,}/g, '') // Remove numbers
      .trim();

    // Capitalize first letter of each word
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Normalize merchant name for grouping
   */
  private normalizeMerchantName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }

  /**
   * Infer Merchant Category Code (MCC)
   */
  private inferMCC(description: string): string {
    const desc = description.toLowerCase();

    // Food & Restaurants
    if (desc.includes('restaurant') || desc.includes('food') || desc.includes('cafe')) {
      return '5812';
    }

    // Supermarkets
    if (desc.includes('supermarket') || desc.includes('grocery') || desc.includes('shoprite')) {
      return '5411';
    }

    // Gas Stations
    if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('shell') || desc.includes('total')) {
      return '5541';
    }

    // Utilities
    if (desc.includes('ecg') || desc.includes('electricity') || desc.includes('water') || desc.includes('utility')) {
      return '4900';
    }

    // Mobile Money / Airtime
    if (desc.includes('mtn') || desc.includes('vodafone') || desc.includes('airtime') || desc.includes('data')) {
      return '4814';
    }

    // Transport
    if (desc.includes('uber') || desc.includes('bolt') || desc.includes('taxi')) {
      return '4121';
    }

    // Default
    return '5999';
  }

  /**
   * Infer business type
   */
  private inferBusinessType(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('restaurant') || desc.includes('cafe')) return 'Restaurant';
    if (desc.includes('supermarket') || desc.includes('shop')) return 'Retail';
    if (desc.includes('fuel') || desc.includes('petrol')) return 'Fuel Station';
    if (desc.includes('pharmacy')) return 'Pharmacy';
    if (desc.includes('hotel')) return 'Hospitality';
    if (desc.includes('uber') || desc.includes('bolt')) return 'Transportation';

    return 'General Merchant';
  }

  /**
   * Infer industry
   */
  private inferIndustry(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('food') || desc.includes('restaurant')) return 'Food & Beverage';
    if (desc.includes('shop') || desc.includes('market')) return 'Retail';
    if (desc.includes('fuel') || desc.includes('petrol')) return 'Energy';
    if (desc.includes('pharmacy') || desc.includes('hospital')) return 'Healthcare';
    if (desc.includes('school') || desc.includes('university')) return 'Education';

    return 'General Services';
  }

  /**
   * Check if merchant is a chain
   */
  private isChainMerchant(name: string): boolean {
    const chains = [
      'shoprite', 'game', 'checkers', 'kfc', 'burger king',
      'shell', 'total', 'starbucks', 'dominos', 'pizza hut',
      'uber', 'bolt', 'glovo'
    ];

    return chains.some(chain => name.toLowerCase().includes(chain));
  }

  /**
   * Categorize transaction using ML model
   */
  private async categorizeTransaction(transaction: RawTransaction): Promise<CategoryData> {
    const description = transaction.description.toLowerCase();
    const amount = transaction.amount;

    // Rule-based categorization (in production, use ML model)
    const { primary, detailed, africanCategory } = this.categorizeByRules(description, amount);

    return {
      primary,
      primary_confidence: 0.88,
      detailed,
      detailed_confidence: 0.85,
      african_category: africanCategory,
      hierarchy: this.getCategoryHierarchy(primary, detailed),
      tags: this.generateTags(description),
    };
  }

  /**
   * Rule-based categorization
   */
  private categorizeByRules(description: string, amount: number): {
    primary: any;
    detailed: string;
    africanCategory: any;
  } {
    const desc = description.toLowerCase();

    // INCOME
    if (desc.includes('salary') || desc.includes('payment received') || desc.includes('credit')) {
      return {
        primary: 'INCOME',
        detailed: 'Salary',
        africanCategory: undefined,
      };
    }

    // MOBILE MONEY / AIRTIME
    if (desc.includes('mtn') || desc.includes('vodafone') || desc.includes('airtime')) {
      return {
        primary: 'GENERAL_SERVICES',
        detailed: 'Mobile Services',
        africanCategory: desc.includes('airtime') ? 'AIRTIME_PURCHASE' : 'MOBILE_MONEY_TOPUP',
      };
    }

    // FOOD & DRINK
    if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('food')) {
      return {
        primary: 'FOOD_AND_DRINK',
        detailed: 'Restaurants',
        africanCategory: desc.includes('chop bar') || desc.includes('waakye') ? 'STREET_FOOD' : undefined,
      };
    }

    // TRANSPORTATION
    if (desc.includes('uber') || desc.includes('bolt') || desc.includes('taxi') || desc.includes('trotro')) {
      return {
        primary: 'TRANSPORTATION',
        detailed: 'Ride Share',
        africanCategory: desc.includes('trotro') ? 'TROTRO_FARE' : desc.includes('okada') ? 'OKADA_FARE' : undefined,
      };
    }

    // UTILITIES
    if (desc.includes('ecg') || desc.includes('electricity') || desc.includes('water') || desc.includes('utility')) {
      return {
        primary: 'RENT_AND_UTILITIES',
        detailed: 'Electric',
        africanCategory: undefined,
      };
    }

    // EDUCATION
    if (desc.includes('school') || desc.includes('university') || desc.includes('tuition')) {
      return {
        primary: 'GENERAL_SERVICES',
        detailed: 'Education',
        africanCategory: 'SCHOOL_FEES',
      };
    }

    // RELIGIOUS
    if (desc.includes('tithe') || desc.includes('offering') || desc.includes('church') || desc.includes('mosque')) {
      return {
        primary: 'GOVERNMENT_AND_NON_PROFIT',
        detailed: 'Religious',
        africanCategory: 'TITHE_OFFERING',
      };
    }

    // SHOPPING
    if (desc.includes('supermarket') || desc.includes('shop') || desc.includes('market')) {
      return {
        primary: 'GENERAL_MERCHANDISE',
        detailed: 'Superstores',
        africanCategory: desc.includes('market') && amount < 50 ? 'MARKET_PURCHASE' : undefined,
      };
    }

    // Default
    return {
      primary: 'GENERAL_MERCHANDISE',
      detailed: 'Other General Merchandise',
      africanCategory: undefined,
    };
  }

  /**
   * Get category hierarchy
   */
  private getCategoryHierarchy(primary: string, detailed: string): string[] {
    return [primary, detailed];
  }

  /**
   * Generate tags from description
   */
  private generateTags(description: string): string[] {
    const tags: string[] = [];
    const desc = description.toLowerCase();

    if (desc.includes('online')) tags.push('online');
    if (desc.includes('mobile')) tags.push('mobile');
    if (desc.includes('cash')) tags.push('cash');
    if (desc.includes('subscription')) tags.push('subscription');
    if (desc.includes('recurring')) tags.push('recurring');

    return tags;
  }

  /**
   * Extract location data
   */
  private async extractLocation(transaction: RawTransaction): Promise<any> {
    // In production, use geolocation APIs and merchant address databases
    return {
      address: '',
      city: 'Accra',
      region: 'Greater Accra',
      country: 'GH',
      is_online: false,
      is_in_store: true,
    };
  }

  /**
   * Analyze African-specific context
   */
  private async analyzeAfricanContext(transaction: RawTransaction): Promise<AfricanTransactionContext> {
    const desc = transaction.description.toLowerCase();

    return {
      // Informal Economy
      is_informal_transaction: desc.includes('market') || desc.includes('street'),
      informal_sector_type: desc.includes('market') ? 'MARKET' : undefined,

      // Community & Social
      is_community_transaction: desc.includes('susu') || desc.includes('funeral') || desc.includes('church'),
      community_type: desc.includes('susu') ? 'SUSU' : desc.includes('funeral') ? 'FUNERAL' : undefined,

      // Remittance
      is_remittance: desc.includes('western union') || desc.includes('moneygram') || desc.includes('worldremit'),
      remittance_corridor: undefined,
      remittance_provider: undefined,

      // Agricultural
      is_agricultural: desc.includes('fertilizer') || desc.includes('seeds') || desc.includes('harvest'),
      agricultural_type: undefined,
      crop_type: undefined,

      // Mobile Money
      is_mobile_money: desc.includes('mtn') || desc.includes('vodafone') || desc.includes('momo'),
      mobile_money_type: desc.includes('airtime') ? 'AIRTIME' : desc.includes('transfer') ? 'TRANSFER' : undefined,

      // Agent Banking
      is_agent_transaction: desc.includes('agent'),
      agent_id: undefined,
      agent_location: undefined,

      // Government Services
      is_government_service: desc.includes('tax') || desc.includes('passport') || desc.includes('license'),
      government_service_type: undefined,

      // Cross-Border
      is_cross_border: false,
      origin_country: undefined,
      destination_country: undefined,
    };
  }

  /**
   * Identify counterparties
   */
  private async identifyCounterparties(transaction: RawTransaction): Promise<any[]> {
    return [];
  }

  /**
   * Extract payment metadata
   */
  private async extractPaymentMetadata(transaction: RawTransaction): Promise<any> {
    const desc = transaction.description.toLowerCase();

    return {
      payment_method: desc.includes('mobile') ? 'MOBILE_MONEY' : 'BANK_TRANSFER',
      payment_channel: 'IN_STORE',
      mobile_money_provider: desc.includes('mtn') ? 'MTN' : desc.includes('vodafone') ? 'VODAFONE' : undefined,
    };
  }

  /**
   * Calculate enrichment quality score
   */
  private calculateEnrichmentQuality(merchant: MerchantData, category: CategoryData): 'HIGH' | 'MEDIUM' | 'LOW' {
    let score = 0;

    if (merchant.confidence > 0.8) score += 40;
    else if (merchant.confidence > 0.6) score += 20;

    if (category.primary_confidence > 0.8) score += 40;
    else if (category.primary_confidence > 0.6) score += 20;

    if (merchant.verified_merchant) score += 20;

    if (score >= 80) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Initialize merchant database (mock data)
   */
  private initializeMerchantDatabase() {
    // In production, load from database
    // For now, we'll use dynamic detection
  }
}

// ============================================================================
// SPENDING INSIGHTS GENERATOR
// ============================================================================

export class SpendingInsights {
  /**
   * Generate spending insights from transactions
   */
  static async generateInsights(transactions: EnrichedTransaction[], period: { start: string; end: string }): Promise<any> {
    // Calculate totals
    const totalSpend = transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const totalIncome = transactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Group by category
    const categorySpending = this.groupByCategory(transactions);

    // Top merchants
    const topMerchants = this.getTopMerchants(transactions);

    // Generate insights
    const insights = this.generateTextInsights(transactions, categorySpending);

    return {
      total_spend: totalSpend,
      total_income: totalIncome,
      net_cash_flow: totalIncome - totalSpend,
      category_spending: categorySpending,
      top_merchants: topMerchants,
      insights,
    };
  }

  /**
   * Group transactions by category
   */
  private static groupByCategory(transactions: EnrichedTransaction[]): any[] {
    const groups = new Map<string, number>();

    transactions.forEach(tx => {
      if (tx.amount < 0) {
        const category = tx.category.primary;
        const current = groups.get(category) || 0;
        groups.set(category, current + Math.abs(tx.amount));
      }
    });

    return Array.from(groups.entries())
      .map(([category, amount]) => ({
        category,
        total_amount: amount,
        percentage_of_total: 0, // Calculate after
      }))
      .sort((a, b) => b.total_amount - a.total_amount);
  }

  /**
   * Get top merchants by spending
   */
  private static getTopMerchants(transactions: EnrichedTransaction[]): any[] {
    const merchants = new Map<string, { amount: number; count: number }>();

    transactions.forEach(tx => {
      if (tx.amount < 0) {
        const name = tx.merchant.name;
        const current = merchants.get(name) || { amount: 0, count: 0 };
        merchants.set(name, {
          amount: current.amount + Math.abs(tx.amount),
          count: current.count + 1,
        });
      }
    });

    return Array.from(merchants.entries())
      .map(([name, data]) => ({
        merchant_name: name,
        total_amount: data.amount,
        transaction_count: data.count,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10);
  }

  /**
   * Generate text insights
   */
  private static generateTextInsights(transactions: EnrichedTransaction[], categorySpending: any[]): string[] {
    const insights: string[] = [];

    // Top spending category
    if (categorySpending.length > 0) {
      const top = categorySpending[0];
      insights.push(`Your highest spending category is ${top.category} with GHS ${top.total_amount.toFixed(2)}`);
    }

    // Mobile money usage
    const mobileMoneyTx = transactions.filter(tx => tx.african_context.is_mobile_money);
    if (mobileMoneyTx.length > 0) {
      insights.push(`You used mobile money for ${mobileMoneyTx.length} transactions this period`);
    }

    // Informal economy participation
    const informalTx = transactions.filter(tx => tx.african_context.is_informal_transaction);
    if (informalTx.length > 0) {
      const informalAmount = informalTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      insights.push(`You spent GHS ${informalAmount.toFixed(2)} in the informal economy`);
    }

    return insights;
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const transactionEnrichment = TransactionEnrichmentEngine.getInstance();
