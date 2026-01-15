/**
 * ReshADX - Link Service
 * Account linking business logic (Plaid Link equivalent)
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { CacheService } from '../cache';

const cache = new CacheService();

export interface LinkTokenRequest {
  userId: string;
  products: string[];
  countryCode?: string;
  language?: string;
  webhook?: string;
  redirectUri?: string;
}

export interface Institution {
  institutionId: string;
  name: string;
  displayName: string;
  institutionType: string;
  country: string;
  logoUrl?: string;
  primaryColor?: string;
  supportsOAuth: boolean;
  supportsApi: boolean;
  supportsUssd: boolean;
  isMobileMoney: boolean;
}

export class LinkService {
  /**
   * Create link token for initializing Link flow
   */
  async createLinkToken(request: LinkTokenRequest): Promise<{
    linkToken: string;
    expiration: Date;
  }> {
    try {
      // Generate link token
      const linkToken = `link-${config.env}-${uuidv4()}`;
      const expiration = new Date(Date.now() + 3600000); // 1 hour

      // Store link token data in cache
      const tokenData = {
        userId: request.userId,
        products: request.products || ['auth', 'transactions', 'balance'],
        countryCode: request.countryCode || 'GH',
        language: request.language || 'en',
        webhook: request.webhook,
        redirectUri: request.redirectUri,
        createdAt: new Date(),
        expiresAt: expiration,
      };

      await cache.set(`link_token:${linkToken}`, tokenData, 3600);

      logger.info('Link token created', {
        userId: request.userId,
        linkToken: linkToken.substring(0, 20) + '...',
      });

      return { linkToken, expiration };
    } catch (error) {
      logger.error('Error creating link token', { error });
      throw error;
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(publicToken: string): Promise<{
    accessToken: string;
    itemId: string;
  }> {
    try {
      // Get public token data from cache
      const tokenData = await cache.get<any>(`public_token:${publicToken}`);

      if (!tokenData) {
        throw new Error('Invalid or expired public token');
      }

      // Generate access token
      const accessToken = `access-${config.env}-${uuidv4()}`;

      // Get the item
      const item = await db('items')
        .where({ item_id: tokenData.itemId })
        .first();

      if (!item) {
        throw new Error('Item not found');
      }

      // Encrypt and store access token
      const encryptedToken = this.encryptToken(accessToken);
      await db('items')
        .where({ item_id: tokenData.itemId })
        .update({
          access_token: encryptedToken,
          status: 'ACTIVE',
        });

      // Delete public token
      await cache.del(`public_token:${publicToken}`);

      logger.info('Public token exchanged', {
        itemId: tokenData.itemId,
        userId: item.user_id,
      });

      return {
        accessToken,
        itemId: tokenData.itemId,
      };
    } catch (error) {
      logger.error('Error exchanging public token', { error });
      throw error;
    }
  }

  /**
   * Get list of supported institutions
   */
  async getInstitutions(filters: {
    country?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ institutions: Institution[]; total: number }> {
    try {
      let query = db('institutions')
        .select('*')
        .where({ status: 'ACTIVE' })
        .whereNull('deprecated_at');

      // Apply filters
      if (filters.country) {
        query = query.where({ country: filters.country });
      }

      if (filters.type && filters.type !== 'ALL') {
        query = query.where({ institution_type: filters.type });
      }

      if (filters.search) {
        query = query.where((builder) => {
          builder
            .where('name', 'ilike', `%${filters.search}%`)
            .orWhere('display_name', 'ilike', `%${filters.search}%`);
        });
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('* as count');

      // Apply pagination
      const limit = Math.min(filters.limit || 50, 100);
      const offset = filters.offset || 0;

      const institutions = await query
        .limit(limit)
        .offset(offset)
        .orderBy('display_name', 'asc');

      return {
        institutions: institutions.map(this.mapInstitution),
        total: parseInt(count as string),
      };
    } catch (error) {
      logger.error('Error fetching institutions', { error });
      throw error;
    }
  }

  /**
   * Get institution by ID
   */
  async getInstitutionById(institutionId: string): Promise<Institution> {
    try {
      const institution = await db('institutions')
        .where({ institution_id: institutionId })
        .first();

      if (!institution) {
        throw new Error('Institution not found');
      }

      return this.mapInstitution(institution);
    } catch (error) {
      logger.error('Error fetching institution', { error, institutionId });
      throw error;
    }
  }

  /**
   * Initiate OAuth flow
   */
  async initiateOAuth(request: {
    institutionId: string;
    userId: string;
    redirectUri: string;
  }): Promise<{
    oauthUrl: string;
    state: string;
  }> {
    try {
      const institution = await db('institutions')
        .where({ institution_id: request.institutionId })
        .first();

      if (!institution) {
        throw new Error('Institution not found');
      }

      if (!institution.supports_oauth) {
        throw new Error('Institution does not support OAuth');
      }

      // Generate state parameter
      const state = crypto.randomBytes(32).toString('hex');

      // Store OAuth state
      await cache.set(
        `oauth_state:${state}`,
        {
          institutionId: request.institutionId,
          userId: request.userId,
          redirectUri: request.redirectUri,
        },
        1800 // 30 minutes
      );

      // Build OAuth URL
      const oauthUrl = `${institution.oauth_authorization_url}?` +
        `client_id=${config.thirdParty[institution.name.toLowerCase()]?.apiKey || ''}&` +
        `redirect_uri=${encodeURIComponent(request.redirectUri)}&` +
        `state=${state}&` +
        `scope=accounts transactions`;

      return { oauthUrl, state };
    } catch (error) {
      logger.error('Error initiating OAuth', { error });
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code: string, state: string): Promise<{
    publicToken: string;
    itemId: string;
  }> {
    try {
      // Get OAuth state
      const stateData = await cache.get<any>(`oauth_state:${state}`);

      if (!stateData) {
        throw new Error('Invalid or expired OAuth state');
      }

      const institution = await db('institutions')
        .where({ institution_id: stateData.institutionId })
        .first();

      if (!institution) {
        throw new Error('Institution not found');
      }

      // Exchange code for access token with institution
      // This would call the actual institution's OAuth token endpoint
      // For now, we'll simulate it
      const institutionAccessToken = await this.exchangeOAuthCode(
        code,
        institution,
        stateData.redirectUri
      );

      // Create item
      const [item] = await db('items').insert({
        user_id: stateData.userId,
        institution_id: stateData.institutionId,
        access_token: this.encryptToken(institutionAccessToken),
        connection_method: 'OAUTH',
        status: 'ACTIVE',
        granted_scopes: ['auth', 'transactions', 'balance'],
        consent_granted_at: new Date(),
        consent_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      }).returning('*');

      // Generate public token
      const publicToken = `public-${config.env}-${uuidv4()}`;

      // Store public token
      await cache.set(
        `public_token:${publicToken}`,
        { itemId: item.item_id, userId: stateData.userId },
        600 // 10 minutes
      );

      // Clean up OAuth state
      await cache.del(`oauth_state:${state}`);

      logger.info('OAuth callback handled', {
        itemId: item.item_id,
        userId: stateData.userId,
      });

      return { publicToken, itemId: item.item_id };
    } catch (error) {
      logger.error('Error handling OAuth callback', { error });
      throw error;
    }
  }

  /**
   * Initiate USSD flow for offline linking
   */
  async initiateUSSD(request: {
    phoneNumber: string;
    institutionId: string;
    userId: string;
  }): Promise<{
    sessionId: string;
    ussdCode: string;
    instructions: string;
  }> {
    try {
      const institution = await db('institutions')
        .where({ institution_id: request.institutionId })
        .first();

      if (!institution) {
        throw new Error('Institution not found');
      }

      if (!institution.supports_ussd) {
        throw new Error('Institution does not support USSD');
      }

      // Generate session ID
      const sessionId = uuidv4();

      // Store USSD session
      await cache.set(
        `ussd_session:${sessionId}`,
        {
          institutionId: request.institutionId,
          userId: request.userId,
          phoneNumber: request.phoneNumber,
          status: 'PENDING',
        },
        1800 // 30 minutes
      );

      const instructions = `
        1. Dial ${institution.ussd_code} from ${request.phoneNumber}
        2. Navigate to "Link Account"
        3. Enter code: ${sessionId.substring(0, 8).toUpperCase()}
        4. Follow the prompts to authorize ReshADX
      `.trim();

      logger.info('USSD session initiated', {
        sessionId,
        userId: request.userId,
      });

      return {
        sessionId,
        ussdCode: institution.ussd_code,
        instructions,
      };
    } catch (error) {
      logger.error('Error initiating USSD', { error });
      throw error;
    }
  }

  /**
   * Verify USSD session
   */
  async verifyUSSD(sessionId: string, code: string): Promise<{
    publicToken: string;
    itemId: string;
  }> {
    try {
      // Get USSD session
      const sessionData = await cache.get<any>(`ussd_session:${sessionId}`);

      if (!sessionData) {
        throw new Error('Invalid or expired USSD session');
      }

      // Verify code (in production, this would verify with the institution)
      const expectedCode = sessionId.substring(0, 8).toUpperCase();
      if (code !== expectedCode) {
        throw new Error('Invalid verification code');
      }

      // Create item
      const [item] = await db('items').insert({
        user_id: sessionData.userId,
        institution_id: sessionData.institutionId,
        connection_method: 'USSD',
        status: 'ACTIVE',
        granted_scopes: ['auth', 'transactions', 'balance'],
        consent_granted_at: new Date(),
        consent_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        mm_wallet_number: sessionData.phoneNumber,
      }).returning('*');

      // Generate public token
      const publicToken = `public-${config.env}-${uuidv4()}`;

      await cache.set(
        `public_token:${publicToken}`,
        { itemId: item.item_id, userId: sessionData.userId },
        600
      );

      // Clean up session
      await cache.del(`ussd_session:${sessionId}`);

      logger.info('USSD verification successful', {
        itemId: item.item_id,
        userId: sessionData.userId,
      });

      return { publicToken, itemId: item.item_id };
    } catch (error) {
      logger.error('Error verifying USSD', { error });
      throw error;
    }
  }

  /**
   * Exchange OAuth code for access token (integration point)
   */
  private async exchangeOAuthCode(
    code: string,
    institution: any,
    redirectUri: string
  ): Promise<string> {
    // In production, this would call the institution's token endpoint
    // For now, simulate it
    return `inst_token_${uuidv4()}`;
  }

  /**
   * Encrypt token for storage
   * Format: iv:encrypted:authTag (all hex encoded)
   */
  private encryptToken(token: string): string {
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(config.encryption.masterKey, 'hex'),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Include IV in the stored format so it can be used for decryption
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
  }

  /**
   * Decrypt token from storage
   * Format: iv:encrypted:authTag (all hex encoded)
   */
  private decryptToken(encryptedData: string): string {
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, encryptedHex, tagHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(config.encryption.masterKey, 'hex'),
      iv
    );

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Map database institution to API format
   */
  private mapInstitution(inst: any): Institution {
    return {
      institutionId: inst.institution_id,
      name: inst.name,
      displayName: inst.display_name,
      institutionType: inst.institution_type,
      country: inst.country,
      logoUrl: inst.logo_url,
      primaryColor: inst.primary_color,
      supportsOAuth: inst.supports_oauth,
      supportsApi: inst.supports_api,
      supportsUssd: inst.supports_ussd,
      isMobileMoney: inst.is_mobile_money,
    };
  }
}
