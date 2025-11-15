/**
 * ReshADX TypeScript SDK - Basic Usage Example
 */

import { ReshADX } from '../src';

async function main() {
  // Initialize the client
  const reshadx = new ReshADX({
    apiKey: process.env.RESHADX_API_KEY || 'sandbox-api-key',
    environment: 'sandbox',
  });

  console.log('ReshADX SDK - Basic Usage Example\n');

  try {
    // 1. Register a new user
    console.log('1. Registering new user...');
    const registerResponse = await reshadx.auth.register({
      email: `test-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+233201234567',
    });
    console.log('✓ User registered:', registerResponse.userId);
    console.log('✓ Access token obtained\n');

    // 2. Get current user
    console.log('2. Getting user profile...');
    const user = await reshadx.auth.getCurrentUser();
    console.log('✓ User:', user.email, `(${user.accountTier})\n`);

    // 3. Create link token
    console.log('3. Creating link token...');
    const linkTokenResponse = await reshadx.link.createLinkToken({
      userId: user.userId,
      products: ['ACCOUNTS', 'TRANSACTIONS', 'IDENTITY'],
      institutionId: 'inst_gcb_bank',
      redirectUri: 'https://example.com/callback',
      countryCode: 'GH',
    });
    console.log('✓ Link token created:', linkTokenResponse.linkToken);
    console.log('✓ Expires:', linkTokenResponse.expiration, '\n');

    // 4. Get accounts (this would fail in sandbox without actual bank connection)
    try {
      console.log('4. Getting accounts...');
      const accountsResponse = await reshadx.accounts.list();
      console.log('✓ Accounts found:', accountsResponse.accounts.length);

      if (accountsResponse.accounts.length > 0) {
        const account = accountsResponse.accounts[0];
        console.log(`  - ${account.accountName}: ${account.currency} ${account.balance / 100}\n`);

        // 5. Get transactions
        console.log('5. Getting transactions...');
        const transactionsResponse = await reshadx.transactions.list({
          accountId: account.accountId,
          limit: 10,
        });
        console.log('✓ Transactions found:', transactionsResponse.transactions.length);

        if (transactionsResponse.transactions.length > 0) {
          transactionsResponse.transactions.slice(0, 3).forEach(txn => {
            console.log(`  - ${txn.date}: ${txn.description} - ${txn.currency} ${txn.amount / 100}`);
          });
        }
        console.log();
      }
    } catch (error: any) {
      console.log('⚠ No accounts linked yet (expected in sandbox)\n');
    }

    // 6. Calculate credit score (this would fail without transaction data)
    try {
      console.log('6. Calculating credit score...');
      const creditScoreResponse = await reshadx.creditScore.calculate({
        includeAlternativeData: true,
      });
      console.log('✓ Credit Score:', creditScoreResponse.score.score);
      console.log('✓ Score Band:', creditScoreResponse.score.scoreBand);
      console.log('✓ Default Probability:', `${creditScoreResponse.score.defaultProbability}%`);
      console.log('✓ Factors:', creditScoreResponse.factors.length, '\n');
    } catch (error: any) {
      console.log('⚠ Credit score calculation requires transaction data\n');
    }

    // 7. Assess risk
    try {
      console.log('7. Assessing transaction risk...');
      const riskResponse = await reshadx.risk.assess({
        amount: 500000, // GHS 5,000
        accountId: 'account-123',
        deviceFingerprint: {
          deviceId: 'device-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });
      console.log('✓ Risk Level:', riskResponse.assessment.riskLevel);
      console.log('✓ Decision:', riskResponse.assessment.decision);
      console.log('✓ Risk Score:', riskResponse.assessment.riskScore, '\n');
    } catch (error: any) {
      console.log('⚠ Risk assessment requires account data\n');
    }

    // 8. Create webhook
    console.log('8. Creating webhook...');
    const webhookResponse = await reshadx.webhooks.create({
      url: 'https://example.com/webhooks/reshadx',
      events: ['TRANSACTIONS_UPDATED', 'FRAUD_ALERT'],
      description: 'Example webhook',
    });
    console.log('✓ Webhook created:', webhookResponse.webhook.webhookId);
    console.log('✓ Secret:', webhookResponse.webhook.secret.substring(0, 10) + '...\n');

    // 9. List webhooks
    console.log('9. Listing webhooks...');
    const webhooksResponse = await reshadx.webhooks.list();
    console.log('✓ Webhooks found:', webhooksResponse.webhooks.length, '\n');

    console.log('✅ Example completed successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    if (error.statusCode) {
      console.error('   Status:', error.statusCode);
    }
  }
}

// Run the example
main();
