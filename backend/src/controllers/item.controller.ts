/**
 * ReshADX - Item Controller (COMPLETE IMPLEMENTATION)
 */
import { Request, Response } from 'express';
import { ItemService } from '../services/item.service';
import { logger } from '../utils/logger';

const itemService = new ItemService();

export class ItemController {
  async getItem(req: Request, res: Response): Promise<Response> {
    try {
      const item = await itemService.getItem(req.params.itemId, req.user!.userId);
      return res.status(200).json({ success: true, data: { item } });
    } catch (error) {
      logger.error('Get item error', { error });
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error instanceof Error ? error.message : 'Item not found' } });
    }
  }

  async getUserItems(req: Request, res: Response): Promise<Response> {
    try {
      const items = await itemService.getUserItems(req.user!.userId);
      return res.status(200).json({ success: true, data: { items } });
    } catch (error) {
      logger.error('Get user items error', { error });
      return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch items' } });
    }
  }

  async deleteItem(req: Request, res: Response): Promise<Response> {
    try {
      await itemService.deleteItem(req.params.itemId, req.user!.userId);
      return res.status(200).json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      logger.error('Delete item error', { error });
      return res.status(400).json({ success: false, error: { code: 'DELETE_ERROR', message: error instanceof Error ? error.message : 'Failed to delete item' } });
    }
  }

  async syncItem(req: Request, res: Response): Promise<Response> {
    try {
      const result = await itemService.syncItem(req.params.itemId, req.user!.userId);
      return res.status(200).json({ success: true, data: result, message: 'Item synced successfully' });
    } catch (error) {
      logger.error('Sync item error', { error });
      return res.status(500).json({ success: false, error: { code: 'SYNC_ERROR', message: error instanceof Error ? error.message : 'Failed to sync item' } });
    }
  }

  async updateWebhook(req: Request, res: Response): Promise<Response> {
    try {
      await itemService.updateWebhook(req.params.itemId, req.user!.userId, req.body.webhookUrl);
      return res.status(200).json({ success: true, message: 'Webhook updated successfully' });
    } catch (error) {
      logger.error('Update webhook error', { error });
      return res.status(400).json({ success: false, error: { code: 'UPDATE_ERROR', message: error instanceof Error ? error.message : 'Failed to update webhook' } });
    }
  }

  async updateCredentials(req: Request, res: Response): Promise<Response> {
    try {
      await itemService.updateCredentials(req.params.itemId, req.user!.userId, req.body.credentials);
      return res.status(200).json({ success: true, message: 'Credentials updated successfully' });
    } catch (error) {
      logger.error('Update credentials error', { error });
      return res.status(400).json({ success: false, error: { code: 'UPDATE_ERROR', message: error instanceof Error ? error.message : 'Failed to update credentials' } });
    }
  }

  async getItemStatus(req: Request, res: Response): Promise<Response> {
    try {
      const status = await itemService.getItemStatus(req.params.itemId, req.user!.userId);
      return res.status(200).json({ success: true, data: { status } });
    } catch (error) {
      logger.error('Get item status error', { error });
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });
    }
  }

  async renewConsent(req: Request, res: Response): Promise<Response> {
    try {
      const result = await itemService.renewConsent(req.params.itemId, req.user!.userId, req.body.consentDurationDays);
      return res.status(200).json({ success: true, data: result, message: 'Consent renewed successfully' });
    } catch (error) {
      logger.error('Renew consent error', { error });
      return res.status(400).json({ success: false, error: { code: 'RENEWAL_ERROR', message: error instanceof Error ? error.message : 'Failed to renew consent' } });
    }
  }
}
