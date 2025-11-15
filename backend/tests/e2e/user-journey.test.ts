/**
 * ReshADX - End-to-End User Journey Tests
 * Tests complete user workflows from registration to transactions
 */

import request from 'supertest';
import app from '../../src/app';
import db from '../../src/database';

describe('E2E: Complete User Journey', () => {
  let accessToken: string;
  let userId: string;
  let linkToken: string;
  let publicToken: string;
  let itemId: string;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.migrate.rollback();
    await db.destroy();
  });

  describe('User Registration and Authentication Flow', () => {
    it('should complete full registration flow', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'journey@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: '+233201234567',
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      userId = registerResponse.body.data.userId;
      accessToken = registerResponse.body.data.tokens.accessToken;

      // Step 2: Verify email (simulated)
      await db('users').where({ user_id: userId }).update({
        email_verified: true,
        account_status: 'ACTIVE',
      });

      // Step 3: Login
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'journey@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      accessToken = loginResponse.body.data.tokens.accessToken;
    });
  });

  describe('Account Linking Flow', () => {
    it('should complete OAuth account linking flow', async () => {
      // Step 1: Create link token
      const linkTokenResponse = await request(app)
        .post('/api/v1/link/token/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId,
          products: ['TRANSACTIONS', 'ACCOUNTS', 'IDENTITY'],
          institutionId: 'inst_gcb_bank',
          redirectUri: 'https://example.com/callback',
        })
        .expect(200);

      expect(linkTokenResponse.body.success).toBe(true);
      linkToken = linkTokenResponse.body.data.linkToken;

      // Step 2: Simulate OAuth flow completion (in real flow, this happens in browser)
      // Create a public token (simulated)
      await db('items').insert({
        user_id: userId,
        institution_id: 'inst_gcb_bank',
        status: 'ACTIVE',
        access_token: 'encrypted-access-token',
        created_at: new Date(),
      }).returning('item_id').then(([id]) => {
        itemId = id;
      });

      publicToken = `public-test-token-${Date.now()}`;

      // Step 3: Exchange public token for access token
      const exchangeResponse = await request(app)
        .post('/api/v1/link/token/exchange')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ publicToken })
        .expect(200);

      expect(exchangeResponse.body.success).toBe(true);
      expect(exchangeResponse.body.data).toHaveProperty('itemId');
    });
  });

  describe('Account and Transaction Data Flow', () => {
    it('should retrieve accounts and transactions', async () => {
      // Step 1: Get linked accounts
      const accountsResponse = await request(app)
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(accountsResponse.body.success).toBe(true);
      expect(accountsResponse.body.data).toHaveProperty('accounts');

      // Step 2: Sync transactions
      await request(app)
        .post('/api/v1/transactions/sync')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ itemId })
        .expect(200);

      // Step 3: Get transactions
      const transactionsResponse = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ itemId })
        .expect(200);

      expect(transactionsResponse.body.success).toBe(true);
      expect(transactionsResponse.body.data).toHaveProperty('transactions');
    });

    it('should get spending analytics', async () => {
      const analyticsResponse = await request(app)
        .get('/api/v1/transactions/analytics/spending')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: 'category',
        })
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data).toHaveProperty('groupBy', 'category');
    });
  });

  describe('Credit Scoring Flow', () => {
    it('should calculate and retrieve credit score', async () => {
      // Step 1: Calculate credit score
      const calculateResponse = await request(app)
        .post('/api/v1/credit-score/calculate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ includeAlternativeData: true })
        .expect(200);

      expect(calculateResponse.body.success).toBe(true);
      expect(calculateResponse.body.data.score).toHaveProperty('score');
      expect(calculateResponse.body.data.score.score).toBeGreaterThanOrEqual(300);
      expect(calculateResponse.body.data.score.score).toBeLessThanOrEqual(850);

      // Step 2: Get credit score factors
      const factorsResponse = await request(app)
        .get('/api/v1/credit-score/factors')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(factorsResponse.body.success).toBe(true);
      expect(factorsResponse.body.data).toHaveProperty('factors');

      // Step 3: Get credit recommendations
      const recommendationsResponse = await request(app)
        .get('/api/v1/credit-score/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(recommendationsResponse.body.success).toBe(true);
      expect(recommendationsResponse.body.data).toHaveProperty('recommendations');
    });
  });

  describe('Risk Assessment Flow', () => {
    it('should perform fraud check and get risk assessment', async () => {
      // Step 1: Assess transaction risk
      const riskResponse = await request(app)
        .post('/api/v1/risk/assess')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 50000, // GHS 500
          accountId: 'test-account-id',
          deviceFingerprint: {
            deviceId: 'device-123',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          },
        })
        .expect(200);

      expect(riskResponse.body.success).toBe(true);
      expect(riskResponse.body.data.assessment).toHaveProperty('riskScore');
      expect(riskResponse.body.data.assessment).toHaveProperty('decision');

      // Step 2: Check for SIM swap
      const simSwapResponse = await request(app)
        .post('/api/v1/risk/sim-swap/check')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          deviceFingerprint: {
            deviceId: 'device-123',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          },
        })
        .expect(200);

      expect(simSwapResponse.body.success).toBe(true);
      expect(simSwapResponse.body.data).toHaveProperty('simSwapDetected');
    });
  });

  describe('Webhook Management Flow', () => {
    let webhookId: string;

    it('should create and manage webhooks', async () => {
      // Step 1: Create webhook
      const createResponse = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: ['TRANSACTIONS_UPDATED', 'ITEM_SYNCED'],
          description: 'Test webhook',
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      webhookId = createResponse.body.data.webhook.webhookId;

      // Step 2: Get webhooks
      const getResponse = await request(app)
        .get('/api/v1/webhooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.webhooks).toHaveLength(1);

      // Step 3: Test webhook
      await request(app)
        .post(`/api/v1/webhooks/${webhookId}/test`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Step 4: Delete webhook
      await request(app)
        .delete(`/api/v1/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
