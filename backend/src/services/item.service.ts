/**
 * ReshADX - Item Service
 * Item management and synchronization
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { logger } from '../utils/logger';
import { CacheService } from '../cache';
import { WebhookService } from './webhook.service';

const cache = new CacheService();
const webhookService = new WebhookService();

export interface ItemDetails {
  itemId: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  status: string;
  connectionMethod: string;
  lastSync: Date | null;
  consentExpiresAt: Date | null;
  accountCount: number;
}

export class ItemService {
  /**
   * Get item details
   */
  async getItem(itemId: string, userId: string): Promise<ItemDetails> {
    try {
      const item = await db('items as i')
        .join('institutions as inst', 'i.institution_id', 'inst.institution_id')
        .where({ 'i.item_id': itemId, 'i.user_id': userId })
        .whereNull('i.deleted_at')
        .select(
          'i.*',
          'inst.name as institution_name',
          'inst.display_name as institution_display_name'
        )
        .first();

      if (!item) {
        throw new Error('Item not found');
      }

      // Get account count
      const [{ count }] = await db('accounts')
        .where({ item_id: itemId })
        .whereNull('deleted_at')
        .count('* as count');

      return {
        itemId: item.item_id,
        userId: item.user_id,
        institutionId: item.institution_id,
        institutionName: item.institution_display_name,
        status: item.status,
        connectionMethod: item.connection_method,
        lastSync: item.last_successful_sync,
        consentExpiresAt: item.consent_expires_at,
        accountCount: parseInt(count as string),
      };
    } catch (error) {
      logger.error('Error fetching item', { error, itemId });
      throw error;
    }
  }

  /**
   * Get all items for user
   */
  async getUserItems(userId: string): Promise<ItemDetails[]> {
    try {
      const items = await db('items as i')
        .join('institutions as inst', 'i.institution_id', 'inst.institution_id')
        .where({ 'i.user_id': userId })
        .whereNull('i.deleted_at')
        .select(
          'i.*',
          'inst.name as institution_name',
          'inst.display_name as institution_display_name'
        )
        .orderBy('i.created_at', 'desc');

      // Get account counts for all items
      const itemIds = items.map((item) => item.item_id);
      const accountCounts = await db('accounts')
        .whereIn('item_id', itemIds)
        .whereNull('deleted_at')
        .groupBy('item_id')
        .select('item_id')
        .count('* as count');

      const countMap = new Map(
        accountCounts.map((ac: any) => [ac.item_id, parseInt(ac.count)])
      );

      return items.map((item) => ({
        itemId: item.item_id,
        userId: item.user_id,
        institutionId: item.institution_id,
        institutionName: item.institution_display_name,
        status: item.status,
        connectionMethod: item.connection_method,
        lastSync: item.last_successful_sync,
        consentExpiresAt: item.consent_expires_at,
        accountCount: countMap.get(item.item_id) || 0,
      }));
    } catch (error) {
      logger.error('Error fetching user items', { error, userId });
      throw error;
    }
  }

  /**
   * Delete item (disconnect institution)
   */
  async deleteItem(itemId: string, userId: string): Promise<void> {
    const trx = await db.transaction();

    try {
      // Verify ownership
      const item = await trx('items')
        .where({ item_id: itemId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!item) {
        throw new Error('Item not found');
      }

      // Soft delete item
      await trx('items')
        .where({ item_id: itemId })
        .update({ deleted_at: new Date() });

      // Soft delete associated accounts
      await trx('accounts')
        .where({ item_id: itemId })
        .update({ deleted_at: new Date() });

      // Send webhook
      await webhookService.sendWebhook(userId, {
        type: 'ITEM_REMOVED',
        itemId,
        timestamp: new Date(),
      });

      await trx.commit();

      logger.info('Item deleted', { itemId, userId });
    } catch (error) {
      await trx.rollback();
      logger.error('Error deleting item', { error, itemId });
      throw error;
    }
  }

  /**
   * Sync item data from institution
   */
  async syncItem(itemId: string, userId: string): Promise<{
    success: boolean;
    accountsSynced: number;
    transactionsSynced: number;
  }> {
    try {
      // Verify ownership
      const item = await db('items')
        .where({ item_id: itemId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!item) {
        throw new Error('Item not found');
      }

      if (item.status !== 'ACTIVE') {
        throw new Error(`Item status is ${item.status}. Cannot sync.`);
      }

      // Update sync status
      await db('items')
        .where({ item_id: itemId })
        .update({
          sync_status: 'SYNCING',
          last_sync_attempt: new Date(),
        });

      // Get institution
      const institution = await db('institutions')
        .where({ institution_id: item.institution_id })
        .first();

      // Perform sync based on integration type
      let result;
      switch (institution.integration_type) {
        case 'API':
          result = await this.syncViaAPI(item, institution);
          break;
        case 'OAUTH':
          result = await this.syncViaOAuth(item, institution);
          break;
        case 'SCREEN_SCRAPING':
          result = await this.syncViaScreenScraping(item, institution);
          break;
        default:
          throw new Error(`Unsupported integration type: ${institution.integration_type}`);
      }

      // Update sync status
      await db('items')
        .where({ item_id: itemId })
        .update({
          sync_status: 'SYNCED',
          last_successful_sync: new Date(),
          consecutive_failures: 0,
        });

      // Send webhook
      await webhookService.sendWebhook(userId, {
        type: 'TRANSACTIONS_UPDATED',
        itemId,
        accountsUpdated: result.accountsSynced,
        newTransactions: result.transactionsSynced,
        timestamp: new Date(),
      });

      logger.info('Item synced successfully', {
        itemId,
        accountsSynced: result.accountsSynced,
        transactionsSynced: result.transactionsSynced,
      });

      return {
        success: true,
        accountsSynced: result.accountsSynced,
        transactionsSynced: result.transactionsSynced,
      };
    } catch (error) {
      // Update failure count
      await db('items')
        .where({ item_id: itemId })
        .update({
          sync_status: 'FAILED',
          consecutive_failures: db.raw('consecutive_failures + 1'),
        });

      logger.error('Error syncing item', { error, itemId });
      throw error;
    }
  }

  /**
   * Update webhook URL for item
   */
  async updateWebhook(
    itemId: string,
    userId: string,
    webhookUrl: string
  ): Promise<void> {
    try {
      const result = await db('items')
        .where({ item_id: itemId, user_id: userId })
        .whereNull('deleted_at')
        .update({ webhook_url: webhookUrl });

      if (result === 0) {
        throw new Error('Item not found');
      }

      logger.info('Webhook updated', { itemId, webhookUrl });
    } catch (error) {
      logger.error('Error updating webhook', { error, itemId });
      throw error;
    }
  }

  /**
   * Update credentials for item
   */
  async updateCredentials(
    itemId: string,
    userId: string,
    credentials: any
  ): Promise<void> {
    try {
      // Verify ownership
      const item = await db('items')
        .where({ item_id: itemId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!item) {
        throw new Error('Item not found');
      }

      // In production, encrypt and store credentials
      // For now, just update status
      await db('items')
        .where({ item_id: itemId })
        .update({
          status: 'ACTIVE',
          last_status_change: new Date(),
        });

      // Trigger immediate sync
      await this.syncItem(itemId, userId);

      logger.info('Credentials updated', { itemId });
    } catch (error) {
      logger.error('Error updating credentials', { error, itemId });
      throw error;
    }
  }

  /**
   * Get item status
   */
  async getItemStatus(itemId: string, userId: string): Promise<{
    status: string;
    lastSync: Date | null;
    nextSync: Date | null;
    consecutiveFailures: number;
    errorMessage: string | null;
  }> {
    try {
      const item = await db('items')
        .where({ item_id: itemId, user_id: userId })
        .whereNull('deleted_at')
        .first();

      if (!item) {
        throw new Error('Item not found');
      }

      return {
        status: item.status,
        lastSync: item.last_successful_sync,
        nextSync: item.next_scheduled_sync,
        consecutiveFailures: item.consecutive_failures,
        errorMessage: item.error_message,
      };
    } catch (error) {
      logger.error('Error fetching item status', { error, itemId });
      throw error;
    }
  }

  /**
   * Renew consent for item
   */
  async renewConsent(
    itemId: string,
    userId: string,
    durationDays: number = 90
  ): Promise<{ consentExpiresAt: Date }> {
    try {
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + durationDays);

      const result = await db('items')
        .where({ item_id: itemId, user_id: userId })
        .whereNull('deleted_at')
        .update({
          consent_expires_at: newExpiryDate,
          consent_granted_at: new Date(),
          renewal_count: db.raw('renewal_count + 1'),
        })
        .returning('consent_expires_at');

      if (result.length === 0) {
        throw new Error('Item not found');
      }

      logger.info('Consent renewed', { itemId, newExpiryDate });

      return { consentExpiresAt: result[0].consent_expires_at };
    } catch (error) {
      logger.error('Error renewing consent', { error, itemId });
      throw error;
    }
  }

  /**
   * Sync via API integration
   */
  private async syncViaAPI(item: any, institution: any): Promise<{
    accountsSynced: number;
    transactionsSynced: number;
  }> {
    // In production, this would call the institution's API
    // For now, simulate sync
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      accountsSynced: 2,
      transactionsSynced: 50,
    };
  }

  /**
   * Sync via OAuth integration
   */
  private async syncViaOAuth(item: any, institution: any): Promise<{
    accountsSynced: number;
    transactionsSynced: number;
  }> {
    // In production, this would use OAuth tokens to call APIs
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      accountsSynced: 3,
      transactionsSynced: 75,
    };
  }

  /**
   * Sync via screen scraping
   */
  private async syncViaScreenScraping(item: any, institution: any): Promise<{
    accountsSynced: number;
    transactionsSynced: number;
  }> {
    // In production, this would use headless browser
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      accountsSynced: 1,
      transactionsSynced: 30,
    };
  }
}
