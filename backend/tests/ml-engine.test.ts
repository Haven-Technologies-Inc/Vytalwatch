/**
 * ReshADX - ML Engine Test Suite
 * Tests credit scoring, fraud detection, and categorization engines with generated data
 */

import { CreditScoringEngine } from '../src/services/ml/credit-scoring.engine';
import { FraudDetectionEngine } from '../src/services/ml/fraud-detection.engine';
import { CategorizationEngine } from '../src/services/ml/categorization.engine';

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate realistic African user profile
 */
function generateUserProfile(scenario: 'good' | 'average' | 'poor' = 'average') {
  const userId = `test-user-${Math.random().toString(36).substring(7)}`;

  const profiles = {
    good: {
      userId,
      income: 8000, // GHS 8,000/month
      employmentStatus: 'EMPLOYED' as const,
      employmentDuration: 48, // 4 years
      accountAge: 36, // 3 years
      location: 'Accra',
    },
    average: {
      userId,
      income: 3500, // GHS 3,500/month
      employmentStatus: 'EMPLOYED' as const,
      employmentDuration: 18, // 1.5 years
      accountAge: 12, // 1 year
      location: 'Kumasi',
    },
    poor: {
      userId,
      income: 1200, // GHS 1,200/month
      employmentStatus: 'SELF_EMPLOYED' as const,
      employmentDuration: 6, // 6 months
      accountAge: 3, // 3 months
      location: 'Tamale',
    },
  };

  return profiles[scenario];
}

/**
 * Generate traditional credit data
 */
function generateTraditionalCreditData(scenario: 'good' | 'average' | 'poor' = 'average') {
  const data = {
    good: {
      paymentHistory: {
        onTimePayments: 95,
        latePayments: 2,
        missedPayments: 0,
        totalPayments: 97,
      },
      creditUtilization: 25, // 25% utilization
      creditAge: 48, // 4 years
      recentInquiries: 1,
      accountTypes: 3,
    },
    average: {
      paymentHistory: {
        onTimePayments: 18,
        latePayments: 3,
        missedPayments: 1,
        totalPayments: 22,
      },
      creditUtilization: 65, // 65% utilization
      creditAge: 18, // 1.5 years
      recentInquiries: 3,
      accountTypes: 2,
    },
    poor: {
      paymentHistory: {
        onTimePayments: 5,
        latePayments: 4,
        missedPayments: 3,
        totalPayments: 12,
      },
      creditUtilization: 95, // 95% utilization
      creditAge: 6, // 6 months
      recentInquiries: 8,
      accountTypes: 1,
    },
  };

  return data[scenario];
}

/**
 * Generate alternative data (African-specific)
 */
function generateAlternativeData(scenario: 'good' | 'average' | 'poor' = 'average') {
  const data = {
    good: {
      mobileMoneyData: {
        transactionCount: 156,
        avgTransactionAmount: 35000, // GHS 350
        largestTransaction: 250000, // GHS 2,500
        accountAge: 36, // 3 years
        failedTransactions: 2,
        reversedTransactions: 0,
      },
      telecomData: {
        accountAge: 48, // 4 years
        avgMonthlySpend: 8000, // GHS 80
        latePayments: 0,
        dataUsagePattern: 'REGULAR',
      },
      utilityPayments: {
        electricityOnTime: 11,
        electricityLate: 1,
        waterOnTime: 10,
        waterLate: 0,
      },
      employmentVerification: {
        verified: true,
        employer: 'MTN Ghana',
        salary: 8000,
        monthsEmployed: 48,
      },
      socialConnections: {
        linkedAccounts: 8,
        mutualConnections: 45,
        trustScore: 85,
      },
      savingsPattern: {
        monthlyDeposits: 6,
        avgDepositAmount: 50000, // GHS 500
        longestStreak: 5,
      },
      digitalFootprint: {
        onlinePresence: true,
        verifiedSocialMedia: true,
        professionalProfile: true,
      },
      loanHistory: {
        previousLoans: 3,
        repaidOnTime: 3,
        defaulted: 0,
      },
    },
    average: {
      mobileMoneyData: {
        transactionCount: 48,
        avgTransactionAmount: 15000,
        largestTransaction: 80000,
        accountAge: 12,
        failedTransactions: 5,
        reversedTransactions: 1,
      },
      telecomData: {
        accountAge: 18,
        avgMonthlySpend: 4000,
        latePayments: 3,
        dataUsagePattern: 'IRREGULAR',
      },
      utilityPayments: {
        electricityOnTime: 6,
        electricityLate: 4,
        waterOnTime: 5,
        waterLate: 3,
      },
      employmentVerification: {
        verified: true,
        employer: 'Local Business',
        salary: 3500,
        monthsEmployed: 18,
      },
      socialConnections: {
        linkedAccounts: 3,
        mutualConnections: 12,
        trustScore: 55,
      },
      savingsPattern: {
        monthlyDeposits: 3,
        avgDepositAmount: 15000,
        longestStreak: 2,
      },
      digitalFootprint: {
        onlinePresence: true,
        verifiedSocialMedia: false,
        professionalProfile: false,
      },
      loanHistory: {
        previousLoans: 1,
        repaidOnTime: 1,
        defaulted: 0,
      },
    },
    poor: {
      mobileMoneyData: {
        transactionCount: 12,
        avgTransactionAmount: 5000,
        largestTransaction: 25000,
        accountAge: 3,
        failedTransactions: 8,
        reversedTransactions: 3,
      },
      telecomData: {
        accountAge: 6,
        avgMonthlySpend: 1500,
        latePayments: 7,
        dataUsagePattern: 'SPORADIC',
      },
      utilityPayments: {
        electricityOnTime: 1,
        electricityLate: 8,
        waterOnTime: 0,
        waterLate: 6,
      },
      employmentVerification: {
        verified: false,
        employer: 'Self-employed',
        salary: 1200,
        monthsEmployed: 6,
      },
      socialConnections: {
        linkedAccounts: 1,
        mutualConnections: 3,
        trustScore: 25,
      },
      savingsPattern: {
        monthlyDeposits: 1,
        avgDepositAmount: 5000,
        longestStreak: 1,
      },
      digitalFootprint: {
        onlinePresence: false,
        verifiedSocialMedia: false,
        professionalProfile: false,
      },
      loanHistory: {
        previousLoans: 2,
        repaidOnTime: 0,
        defaulted: 2,
      },
    },
  };

  return data[scenario];
}

/**
 * Generate transaction for fraud detection testing
 */
function generateTransaction(type: 'normal' | 'suspicious' | 'fraudulent' = 'normal') {
  const baseTransaction = {
    transactionId: `txn-${Math.random().toString(36).substring(7)}`,
    userId: `user-${Math.random().toString(36).substring(7)}`,
    accountId: `acc-${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
  };

  const transactions = {
    normal: {
      ...baseTransaction,
      amount: 15000, // GHS 150
      merchantName: 'Shoprite',
      merchantCategory: 'GROCERY',
      location: {
        city: 'Accra',
        country: 'Ghana',
        latitude: 5.6037,
        longitude: -0.1870,
      },
      deviceFingerprint: {
        deviceId: 'device-abc123',
        ipAddress: '197.255.124.45',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)',
      },
      channel: 'MOBILE_APP' as const,
    },
    suspicious: {
      ...baseTransaction,
      amount: 500000, // GHS 5,000 (unusually high)
      merchantName: 'Unknown Merchant',
      merchantCategory: 'OTHER',
      location: {
        city: 'Lagos', // Different country
        country: 'Nigeria',
        latitude: 6.5244,
        longitude: 3.3792,
      },
      deviceFingerprint: {
        deviceId: 'device-xyz789', // New device
        ipAddress: '41.58.23.12', // Nigerian IP
        userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      },
      channel: 'WEB' as const,
    },
    fraudulent: {
      ...baseTransaction,
      amount: 2000000, // GHS 20,000 (very high)
      merchantName: 'Crypto Exchange',
      merchantCategory: 'CRYPTOCURRENCY',
      location: {
        city: 'Unknown',
        country: 'Unknown',
        latitude: 0,
        longitude: 0,
      },
      deviceFingerprint: {
        deviceId: 'device-suspicious', // Different device
        ipAddress: '185.220.101.1', // TOR exit node
        userAgent: 'curl/7.68.0', // Suspicious user agent
      },
      channel: 'API' as const,
    },
  };

  return transactions[type];
}

/**
 * Generate transactions for categorization testing
 */
function generateCategoryTestTransactions() {
  return [
    {
      transactionId: 'txn-1',
      amount: 25000,
      description: 'SHOPRITE ACCRA',
      merchantName: 'Shoprite',
      merchantCategory: 'GROCERY_STORES',
      mcc: '5411',
    },
    {
      transactionId: 'txn-2',
      amount: 5000,
      description: 'MTN AIRTIME',
      merchantName: 'MTN',
      merchantCategory: 'TELECOM',
      mcc: '4814',
    },
    {
      transactionId: 'txn-3',
      amount: 150000,
      description: 'SHELL FUEL STATION',
      merchantName: 'Shell',
      merchantCategory: 'GAS_STATIONS',
      mcc: '5541',
    },
    {
      transactionId: 'txn-4',
      amount: 80000,
      description: 'UBER TRIP',
      merchantName: 'Uber',
      merchantCategory: 'TRANSPORTATION',
      mcc: '4121',
    },
    {
      transactionId: 'txn-5',
      amount: 35000,
      description: 'PIZZA HUT DELIVERY',
      merchantName: 'Pizza Hut',
      merchantCategory: 'RESTAURANTS',
      mcc: '5812',
    },
    {
      transactionId: 'txn-6',
      amount: 200000,
      description: 'RENT PAYMENT',
      merchantName: 'Landlord',
      merchantCategory: 'HOUSING',
      mcc: null,
    },
    {
      transactionId: 'txn-7',
      amount: 10000,
      description: 'MOBILE MONEY TRANSFER',
      merchantName: 'MTN MoMo',
      merchantCategory: 'MOBILE_MONEY',
      mcc: null,
    },
  ];
}

// ============================================================================
// Test Functions
// ============================================================================

async function testCreditScoringEngine() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CREDIT SCORING ENGINE');
  console.log('='.repeat(80) + '\n');

  const engine = new CreditScoringEngine();

  const scenarios: Array<'good' | 'average' | 'poor'> = ['good', 'average', 'poor'];

  for (const scenario of scenarios) {
    console.log(`\n--- Testing ${scenario.toUpperCase()} Credit Profile ---\n`);

    const userProfile = generateUserProfile(scenario);
    const traditionalData = generateTraditionalCreditData(scenario);
    const alternativeData = generateAlternativeData(scenario);

    const input = {
      userId: userProfile.userId,
      traditionalCreditData: traditionalData,
      alternativeData: alternativeData,
      includeAlternativeData: true,
    };

    try {
      const result = await engine.calculateCreditScore(input);

      console.log(`User Profile:`);
      console.log(`  - Income: GHS ${userProfile.income}/month`);
      console.log(`  - Employment: ${userProfile.employmentStatus} (${userProfile.employmentDuration} months)`);
      console.log(`  - Location: ${userProfile.location}`);
      console.log();

      console.log(`Credit Score Results:`);
      console.log(`  ✓ Score: ${result.score} / 850`);
      console.log(`  ✓ Band: ${result.scoreBand}`);
      console.log(`  ✓ Default Probability: ${result.defaultProbability.toFixed(2)}%`);
      console.log(`  ✓ Traditional Score: ${result.breakdown.traditionalScore}`);
      console.log(`  ✓ Alternative Data Score: ${result.breakdown.alternativeDataScore}`);
      console.log();

      console.log(`Top Factors:`);
      result.factors.slice(0, 5).forEach((factor, i) => {
        const icon = factor.impact === 'POSITIVE' ? '🟢' : factor.impact === 'NEGATIVE' ? '🔴' : '⚪';
        console.log(`  ${icon} ${factor.factor}: ${factor.impact} (weight: ${factor.weight})`);
      });

      console.log();
      console.log(`Recommendations:`);
      result.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority}] ${rec.title}`);
        console.log(`     ${rec.description}`);
        console.log(`     Potential Impact: +${rec.potentialImpact} points`);
      });

    } catch (error: any) {
      console.error(`❌ Error testing ${scenario} profile:`, error.message);
    }
  }
}

async function testFraudDetectionEngine() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING FRAUD DETECTION ENGINE');
  console.log('='.repeat(80) + '\n');

  const engine = new FraudDetectionEngine();

  const scenarios: Array<'normal' | 'suspicious' | 'fraudulent'> = ['normal', 'suspicious', 'fraudulent'];

  for (const scenario of scenarios) {
    console.log(`\n--- Testing ${scenario.toUpperCase()} Transaction ---\n`);

    const transaction = generateTransaction(scenario);

    const input = {
      userId: transaction.userId,
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      merchantName: transaction.merchantName,
      merchantCategory: transaction.merchantCategory,
      location: transaction.location,
      deviceFingerprint: transaction.deviceFingerprint,
      timestamp: transaction.timestamp,
    };

    try {
      const result = await engine.checkFraud(input);

      console.log(`Transaction Details:`);
      console.log(`  - Amount: GHS ${transaction.amount / 100}`);
      console.log(`  - Merchant: ${transaction.merchantName}`);
      console.log(`  - Location: ${transaction.location.city}, ${transaction.location.country}`);
      console.log(`  - Channel: ${transaction.channel}`);
      console.log();

      const decisionIcon = {
        APPROVE: '✅',
        REVIEW: '⚠️',
        DECLINE: '❌',
        BLOCK: '🚫',
      }[result.decision];

      console.log(`Fraud Assessment:`);
      console.log(`  ${decisionIcon} Decision: ${result.decision}`);
      console.log(`  - Risk Score: ${result.riskScore.toFixed(1)} / 100`);
      console.log(`  - Risk Level: ${result.riskLevel}`);
      console.log();

      if (result.flags.length > 0) {
        console.log(`⚠️  Flags Raised:`);
        result.flags.forEach(flag => {
          console.log(`  - ${flag}`);
        });
        console.log();
      }

      console.log(`Risk Factors:`);
      result.factors.slice(0, 5).forEach(factor => {
        console.log(`  - ${factor.factor}: ${factor.score.toFixed(1)} (weight: ${factor.weight})`);
      });

      if (result.recommendations.length > 0) {
        console.log();
        console.log(`Recommendations:`);
        result.recommendations.forEach(rec => {
          console.log(`  - ${rec}`);
        });
      }

    } catch (error: any) {
      console.error(`❌ Error testing ${scenario} transaction:`, error.message);
    }
  }
}

async function testCategorizationEngine() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CATEGORIZATION ENGINE');
  console.log('='.repeat(80) + '\n');

  const engine = new CategorizationEngine();
  const transactions = generateCategoryTestTransactions();

  for (const transaction of transactions) {
    const input = {
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      description: transaction.description,
      merchantName: transaction.merchantName,
      merchantCategory: transaction.merchantCategory,
      mcc: transaction.mcc,
      type: 'DEBIT' as const,
    };

    try {
      const result = await engine.categorizeTransaction(input);

      console.log(`Transaction: ${transaction.description}`);
      console.log(`  Amount: GHS ${transaction.amount / 100}`);
      console.log(`  ✓ Category: ${result.category}`);
      if (result.subcategory) {
        console.log(`  ✓ Subcategory: ${result.subcategory}`);
      }
      console.log(`  ✓ Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`  ✓ Method: ${result.method}`);
      console.log();

    } catch (error: any) {
      console.error(`❌ Error categorizing transaction:`, error.message);
    }
  }
}

// ============================================================================
// Performance Test
// ============================================================================

async function performanceTest() {
  console.log('\n' + '='.repeat(80));
  console.log('PERFORMANCE TEST');
  console.log('='.repeat(80) + '\n');

  const iterations = 100;

  // Test credit scoring performance
  console.log(`Testing Credit Scoring Engine (${iterations} iterations)...`);
  const creditEngine = new CreditScoringEngine();
  const creditStart = Date.now();

  for (let i = 0; i < iterations; i++) {
    const scenario = ['good', 'average', 'poor'][i % 3] as 'good' | 'average' | 'poor';
    await creditEngine.calculateCreditScore({
      userId: `perf-test-${i}`,
      traditionalCreditData: generateTraditionalCreditData(scenario),
      alternativeData: generateAlternativeData(scenario),
      includeAlternativeData: true,
    });
  }

  const creditDuration = Date.now() - creditStart;
  console.log(`  ✓ Completed in ${creditDuration}ms`);
  console.log(`  ✓ Average: ${(creditDuration / iterations).toFixed(2)}ms per calculation`);
  console.log(`  ✓ Throughput: ${(iterations / (creditDuration / 1000)).toFixed(0)} calculations/second`);
  console.log();

  // Test fraud detection performance
  console.log(`Testing Fraud Detection Engine (${iterations} iterations)...`);
  const fraudEngine = new FraudDetectionEngine();
  const fraudStart = Date.now();

  for (let i = 0; i < iterations; i++) {
    const scenario = ['normal', 'suspicious', 'fraudulent'][i % 3] as 'normal' | 'suspicious' | 'fraudulent';
    const txn = generateTransaction(scenario);
    await fraudEngine.checkFraud({
      userId: txn.userId,
      transactionId: txn.transactionId,
      amount: txn.amount,
      merchantName: txn.merchantName,
      merchantCategory: txn.merchantCategory,
      location: txn.location,
      deviceFingerprint: txn.deviceFingerprint,
      timestamp: txn.timestamp,
    });
  }

  const fraudDuration = Date.now() - fraudStart;
  console.log(`  ✓ Completed in ${fraudDuration}ms`);
  console.log(`  ✓ Average: ${(fraudDuration / iterations).toFixed(2)}ms per check`);
  console.log(`  ✓ Throughput: ${(iterations / (fraudDuration / 1000)).toFixed(0)} checks/second`);
  console.log();

  // Test categorization performance
  console.log(`Testing Categorization Engine (${iterations} iterations)...`);
  const categorizationEngine = new CategorizationEngine();
  const categorizationStart = Date.now();

  const testTransactions = generateCategoryTestTransactions();
  for (let i = 0; i < iterations; i++) {
    const txn = testTransactions[i % testTransactions.length];
    await categorizationEngine.categorizeTransaction({
      transactionId: `perf-${i}`,
      amount: txn.amount,
      description: txn.description,
      merchantName: txn.merchantName,
      merchantCategory: txn.merchantCategory,
      mcc: txn.mcc,
      type: 'DEBIT',
    });
  }

  const categorizationDuration = Date.now() - categorizationStart;
  console.log(`  ✓ Completed in ${categorizationDuration}ms`);
  console.log(`  ✓ Average: ${(categorizationDuration / iterations).toFixed(2)}ms per categorization`);
  console.log(`  ✓ Throughput: ${(iterations / (categorizationDuration / 1000)).toFixed(0)} categorizations/second`);
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                      ReshADX ML ENGINE TEST SUITE                             ║');
  console.log('║                    Testing with Generated African Data                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');

  try {
    // Test 1: Credit Scoring
    await testCreditScoringEngine();

    // Test 2: Fraud Detection
    await testFraudDetectionEngine();

    // Test 3: Categorization
    await testCategorizationEngine();

    // Test 4: Performance
    await performanceTest();

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

export {
  testCreditScoringEngine,
  testFraudDetectionEngine,
  testCategorizationEngine,
  performanceTest,
};
