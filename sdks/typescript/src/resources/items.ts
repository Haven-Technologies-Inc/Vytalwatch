/**
 * ReshADX TypeScript SDK - Items Resource
 */

import { HttpClient } from '../utils/http';
import { Item } from '../types';

export class Items {
  constructor(private http: HttpClient) {}

  /**
   * Get all items for current user
   */
  async list(): Promise<{ items: Item[] }> {
    return this.http.get('/items');
  }

  /**
   * Get specific item details
   */
  async get(itemId: string): Promise<{ item: Item }> {
    return this.http.get(`/items/${itemId}`);
  }

  /**
   * Delete an item (remove bank connection)
   */
  async delete(itemId: string): Promise<{ success: boolean }> {
    return this.http.delete(`/items/${itemId}`);
  }

  /**
   * Trigger item sync
   */
  async sync(itemId: string): Promise<{
    syncStatus: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    syncId: string;
  }> {
    return this.http.post(`/items/${itemId}/sync`);
  }

  /**
   * Get item sync status
   */
  async getSyncStatus(itemId: string, syncId: string): Promise<{
    syncStatus: string;
    progress: number;
    accountsSynced: number;
    transactionsSynced: number;
    error?: string;
  }> {
    return this.http.get(`/items/${itemId}/sync/${syncId}`);
  }

  /**
   * Update item webhook URL
   */
  async updateWebhook(itemId: string, webhookUrl: string): Promise<{ success: boolean }> {
    return this.http.patch(`/items/${itemId}`, { webhookUrl });
  }
}
