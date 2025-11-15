# ReshADX TypeScript SDK

Official TypeScript/JavaScript SDK for ReshADX - Open Banking API for Africa.

## Installation

```bash
npm install @reshadx/sdk
# or
yarn add @reshadx/sdk
# or
pnpm add @reshadx/sdk
```

## Quick Start

```typescript
import { ReshADX } from '@reshadx/sdk';

// Initialize the client
const reshadx = new ReshADX({
  apiKey: 'your-api-key',
  environment: 'sandbox', // or 'production'
});

// Register a new user
const { userId, tokens } = await reshadx.auth.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+233201234567',
});

// The SDK automatically sets the access token after login/register
console.log('User registered:', userId);

// Get user accounts
const { accounts } = await reshadx.accounts.list();
console.log('Accounts:', accounts);

// Get transactions
const { transactions } = await reshadx.transactions.list({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  limit: 50,
});
console.log('Transactions:', transactions);
```

## Authentication

### Register a New User

```typescript
const response = await reshadx.auth.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+233201234567',
  referralCode: 'FRIEND123', // Optional
});

// Access token is automatically set
console.log('User ID:', response.userId);
console.log('Access Token:', response.tokens.accessToken);
```

### Login

```typescript
const response = await reshadx.auth.login({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  deviceFingerprint: {
    deviceId: 'device-123',
    ipAddress: '192.168.1.1',
    userAgent: navigator.userAgent,
  },
});

console.log('User:', response.user);
console.log('Tokens:', response.tokens);
```

### Get Current User

```typescript
const user = await reshadx.auth.getCurrentUser();
console.log('Current user:', user);
```

### Logout

```typescript
reshadx.auth.logout(); // Clears local access token
```

## Account Linking

### Create Link Token

```typescript
const { linkToken, expiration } = await reshadx.link.createLinkToken({
  userId: 'user-123',
  products: ['ACCOUNTS', 'TRANSACTIONS', 'IDENTITY'],
  institutionId: 'inst_gcb_bank', // Optional
  redirectUri: 'https://yourapp.com/oauth/callback',
  language: 'en',
  countryCode: 'GH',
  webhook: 'https://yourapp.com/webhooks/reshadx',
});

// Use linkToken to initialize ReshADX Link UI
console.log('Link Token:', linkToken);
```

### Exchange Public Token

After user completes OAuth flow and you receive a public token:

```typescript
const { accessToken, itemId } = await reshadx.link.exchangePublicToken({
  publicToken: 'public-sandbox-token',
});

console.log('Item ID:', itemId);
```

## Accounts

### List All Accounts

```typescript
const { accounts, item } = await reshadx.accounts.list();

accounts.forEach(account => {
  console.log(`${account.accountName}: ${account.currency} ${account.balance / 100}`);
});
```

### Get Account Balance

```typescript
const balance = await reshadx.accounts.getBalance('account-123');
console.log(`Balance: ${balance.currency} ${balance.balance / 100}`);
console.log(`Available: ${balance.currency} ${balance.availableBalance / 100}`);
```

### Get Specific Account

```typescript
const account = await reshadx.accounts.get('account-123');
console.log('Account:', account);
```

## Transactions

### List Transactions

```typescript
const response = await reshadx.transactions.list({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  categories: ['FOOD_AND_DRINK', 'TRANSPORTATION'],
  minAmount: 1000, // GHS 10.00 (in pesewas)
  maxAmount: 50000, // GHS 500.00
  page: 1,
  limit: 50,
});

console.log('Transactions:', response.transactions);
console.log('Total:', response.pagination.total);
```

### Sync Transactions

```typescript
const result = await reshadx.transactions.sync({
  itemId: 'item-123',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});

console.log(`Added: ${result.added}, Modified: ${result.modified}, Removed: ${result.removed}`);
```

### Get Spending Analytics

```typescript
const analytics = await reshadx.transactions.getSpendingAnalytics({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  groupBy: 'category',
  accountIds: ['account-123'],
});

console.log('Total Spending:', analytics.summary.totalSpending / 100);
console.log('Top Categories:', analytics.summary.topCategories);

analytics.data.forEach(item => {
  console.log(`${item.key}: ${item.totalSpending / 100}`);
});
```

### Search Transactions

```typescript
const results = await reshadx.transactions.search({
  searchTerm: 'uber',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  page: 1,
  limit: 20,
});

console.log('Search results:', results.transactions);
```

## Credit Score

### Calculate Credit Score

```typescript
const { score, factors } = await reshadx.creditScore.calculate({
  includeAlternativeData: true,
});

console.log(`Score: ${score.score} (${score.scoreBand})`);
console.log(`Default Probability: ${score.defaultProbability}%`);

factors.forEach(factor => {
  console.log(`${factor.factor}: ${factor.impact} (weight: ${factor.weight})`);
});
```

### Get Current Credit Score

```typescript
const score = await reshadx.creditScore.get();
console.log(`Your credit score: ${score.score}`);
```

### Get Credit Recommendations

```typescript
const { recommendations } = await reshadx.creditScore.getRecommendations();

recommendations.forEach(rec => {
  console.log(`[${rec.priority}] ${rec.title}`);
  console.log(`  ${rec.description}`);
  console.log(`  Potential Impact: +${rec.potentialImpact} points`);
});
```

### Simulate Credit Score

```typescript
const simulation = await reshadx.creditScore.simulate({
  payOffDebt: 100000, // GHS 1,000
  reduceUtilization: 20, // Reduce utilization by 20%
});

console.log(`Current Score: ${simulation.currentScore}`);
console.log(`Projected Score: ${simulation.projectedScore}`);
console.log(`Improvement: +${simulation.improvement} points in ${simulation.timeframe}`);
```

## Risk Assessment

### Assess Transaction Risk

```typescript
const { assessment } = await reshadx.risk.assess({
  amount: 500000, // GHS 5,000
  accountId: 'account-123',
  deviceFingerprint: {
    deviceId: 'device-123',
    ipAddress: '192.168.1.1',
    userAgent: navigator.userAgent,
  },
});

console.log(`Risk Level: ${assessment.riskLevel}`);
console.log(`Decision: ${assessment.decision}`);
console.log('Flags:', assessment.flags);
```

### Check SIM Swap

```typescript
const result = await reshadx.risk.checkSimSwap({
  deviceFingerprint: {
    deviceId: 'device-123',
    ipAddress: '192.168.1.1',
    userAgent: navigator.userAgent,
  },
});

if (result.simSwapDetected) {
  console.log(`⚠️ SIM Swap Detected! Risk: ${result.simSwapRisk}`);
  console.log('Recommendations:', result.recommendations);
}
```

### Get Fraud Alerts

```typescript
const { alerts } = await reshadx.risk.getAlerts({
  status: 'PENDING',
  riskLevel: 'HIGH',
});

alerts.forEach(alert => {
  console.log(`[${alert.riskLevel}] ${alert.description}`);
});
```

## Webhooks

### Create Webhook

```typescript
const { webhook } = await reshadx.webhooks.create({
  url: 'https://yourapp.com/webhooks/reshadx',
  events: ['TRANSACTIONS_UPDATED', 'ITEM_SYNCED', 'FRAUD_ALERT'],
  description: 'Production webhook',
});

console.log('Webhook ID:', webhook.webhookId);
console.log('Secret:', webhook.secret); // Store this securely!
```

### List Webhooks

```typescript
const { webhooks } = await reshadx.webhooks.list();
webhooks.forEach(webhook => {
  console.log(`${webhook.webhookId}: ${webhook.url} (${webhook.status})`);
});
```

### Verify Webhook Signature (in your webhook endpoint)

```typescript
import { Webhooks } from '@reshadx/sdk';
import express from 'express';

const app = express();

app.post('/webhooks/reshadx', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-reshadx-signature'] as string;
  const rawBody = req.body.toString();
  const webhookSecret = process.env.RESHADX_WEBHOOK_SECRET!;

  // Verify signature
  const isValid = Webhooks.verifySignature(rawBody, signature, webhookSecret);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Parse payload
  const payload = Webhooks.parsePayload(rawBody, signature, webhookSecret);

  if (!payload) {
    return res.status(400).send('Invalid payload');
  }

  console.log('Webhook event:', payload);

  // Process webhook event
  switch (payload.event) {
    case 'TRANSACTIONS_UPDATED':
      // Handle transaction updates
      break;
    case 'FRAUD_ALERT':
      // Handle fraud alert
      break;
  }

  res.status(200).send('OK');
});
```

## Items

### List Items

```typescript
const { items } = await reshadx.items.list();
items.forEach(item => {
  console.log(`${item.institutionName}: ${item.status}`);
});
```

### Sync Item

```typescript
const { syncStatus, syncId } = await reshadx.items.sync('item-123');
console.log(`Sync started: ${syncId}`);
```

### Delete Item

```typescript
await reshadx.items.delete('item-123');
console.log('Bank connection removed');
```

## Error Handling

```typescript
import { ReshADXError, ValidationError, AuthenticationError } from '@reshadx/sdk';

try {
  await reshadx.auth.login({ email: 'invalid', password: 'wrong' });
} catch (error) {
  if (error instanceof ReshADXError) {
    console.error(`Error ${error.code}: ${error.message}`);
    console.error('Status:', error.statusCode);
    console.error('Details:', error.details);

    if (error.isAuthError()) {
      // Handle authentication error
    }

    if (error.isValidationError()) {
      // Handle validation error
    }

    if (error.isRateLimitError()) {
      // Handle rate limit
    }
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import { ReshADX, Account, Transaction, CreditScore } from '@reshadx/sdk';

const reshadx = new ReshADX({ apiKey: 'key' });

// All responses are fully typed
const accounts: Account[] = (await reshadx.accounts.list()).accounts;
const transactions: Transaction[] = (await reshadx.transactions.list()).transactions;
const score: CreditScore = await reshadx.creditScore.get();
```

## Environment Configuration

```typescript
// Sandbox (default)
const reshadx = new ReshADX({
  apiKey: 'sandbox-api-key',
  environment: 'sandbox',
});

// Production
const reshadx = new ReshADX({
  apiKey: 'production-api-key',
  environment: 'production',
});

// Custom base URL
const reshadx = new ReshADX({
  apiKey: 'api-key',
  baseUrl: 'https://custom-api.example.com/v1',
});

// Custom timeout and retries
const reshadx = new ReshADX({
  apiKey: 'api-key',
  timeout: 60000, // 60 seconds
  maxRetries: 5,
});
```

## Storing and Reusing Access Tokens

```typescript
// After login, store the access token
const { tokens } = await reshadx.auth.login({ email, password });
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);

// Later, reuse the access token
const reshadx = new ReshADX({ apiKey: 'key' });
reshadx.setAccessToken(localStorage.getItem('accessToken')!);

// Now you can make authenticated requests without logging in again
const user = await reshadx.auth.getCurrentUser();
```

## License

MIT

## Support

- Documentation: https://docs.reshadx.com
- API Reference: https://api.reshadx.com/docs
- Issues: https://github.com/reshadx/reshadx/issues
- Email: support@reshadx.com
