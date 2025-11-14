/**
 * ReshADX - Link Controller (COMPLETE IMPLEMENTATION)
 */
import { Request, Response } from 'express';
import { LinkService } from '../services/link.service';
import { logger } from '../utils/logger';

const linkService = new LinkService();

export class LinkController {
  async createLinkToken(req: Request, res: Response): Promise<Response> {
    try {
      const { linkToken, expiration } = await linkService.createLinkToken({
        userId: req.user?.userId || req.body.userId,
        products: req.body.products,
        countryCode: req.body.countryCode,
        language: req.body.language,
        webhook: req.body.webhook,
        redirectUri: req.body.redirectUri,
      });
      return res.status(200).json({ success: true, data: { linkToken, expiration } });
    } catch (error) {
      logger.error('Create link token error', { error });
      return res.status(500).json({ success: false, error: { code: 'LINK_TOKEN_ERROR', message: error instanceof Error ? error.message : 'Failed' } });
    }
  }

  async exchangePublicToken(req: Request, res: Response): Promise<Response> {
    try {
      const { accessToken, itemId } = await linkService.exchangePublicToken(req.body.publicToken);
      return res.status(200).json({ success: true, data: { accessToken, itemId } });
    } catch (error) {
      logger.error('Exchange token error', { error });
      return res.status(400).json({ success: false, error: { code: 'EXCHANGE_ERROR', message: error instanceof Error ? error.message : 'Failed' } });
    }
  }

  async getInstitutions(req: Request, res: Response): Promise<Response> {
    try {
      const result = await linkService.getInstitutions({
        country: req.query.country as string,
        type: req.query.type as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch institutions' } });
    }
  }

  async getInstitutionById(req: Request, res: Response): Promise<Response> {
    try {
      const institution = await linkService.getInstitutionById(req.params.institutionId);
      return res.status(200).json({ success: true, data: { institution } });
    } catch (error) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Institution not found' } });
    }
  }

  async initiateOAuth(req: Request, res: Response): Promise<Response> {
    try {
      const result = await linkService.initiateOAuth({
        institutionId: req.body.institutionId,
        userId: req.user!.userId,
        redirectUri: req.body.redirectUri,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, error: { code: 'OAUTH_ERROR', message: error instanceof Error ? error.message : 'Failed' } });
    }
  }

  async handleOAuthCallback(req: Request, res: Response): Promise<Response> {
    try {
      const result = await linkService.handleOAuthCallback(req.body.code, req.body.state);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(400).json({ success: false, error: { code: 'OAUTH_ERROR', message: error instanceof Error ? error.message : 'Failed' } });
    }
  }

  async initiateUSSD(req: Request, res: Response): Promise<Response> {
    try {
      const result = await linkService.initiateUSSD({
        phoneNumber: req.body.phoneNumber,
        institutionId: req.body.institutionId,
        userId: req.user!.userId,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, error: { code: 'USSD_ERROR', message: error instanceof Error ? error.message : 'Failed' } });
    }
  }

  async verifyUSSD(req: Request, res: Response): Promise<Response> {
    try {
      const result = await linkService.verifyUSSD(req.body.sessionId, req.body.code);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(400).json({ success: false, error: { code: 'VERIFICATION_ERROR', message: error instanceof Error ? error.message : 'Failed' } });
    }
  }

  async updateItem(req: Request, res: Response): Promise<Response> {
    try {
      const { linkToken, expiration } = await linkService.createLinkToken({
        userId: req.user!.userId,
        products: ['auth', 'transactions'],
      });
      return res.status(200).json({ success: true, data: { linkToken, expiration } });
    } catch (error) {
      return res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Failed' } });
    }
  }
}
