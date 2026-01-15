/**
 * ReshADX - Incoming Webhooks Routes
 * Handles incoming webhooks from external services (banks, payment providers)
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

/**
 * Verify webhook signature
 */
const verifySignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Generic webhook handler
 */
router.post('/:provider', async (req: Request, res: Response) => {
  const { provider } = req.params;
  const signature = req.headers['x-webhook-signature'] as string;
  const payload = JSON.stringify(req.body);

  logger.info('Incoming webhook received', {
    provider,
    eventType: req.body?.event || req.body?.type,
  });

  try {
    // Get provider-specific secret
    const secret = config.webhooks?.secrets?.[provider];

    if (secret && signature) {
      if (!verifySignature(payload, signature, secret)) {
        logger.warn('Webhook signature verification failed', { provider });
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Process webhook based on provider
    switch (provider) {
      case 'mtn':
        await processMTNWebhook(req.body);
        break;
      case 'ecobank':
        await processEcobankWebhook(req.body);
        break;
      case 'stanbic':
        await processStanbicWebhook(req.body);
        break;
      case 'gcb':
        await processGCBWebhook(req.body);
        break;
      default:
        await processGenericWebhook(provider, req.body);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', { provider, error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * MTN Mobile Money webhook handler
 */
async function processMTNWebhook(data: any): Promise<void> {
  const eventType = data.event || data.type;

  switch (eventType) {
    case 'transaction.completed':
    case 'collection.completed':
      // Handle completed transaction
      logger.info('MTN transaction completed', { transactionId: data.referenceId });
      // TODO: Update transaction status in database
      // TODO: Trigger webhook to client
      break;

    case 'transaction.failed':
    case 'collection.failed':
      logger.warn('MTN transaction failed', { transactionId: data.referenceId, reason: data.reason });
      break;

    case 'account.updated':
      logger.info('MTN account updated', { accountId: data.accountId });
      break;

    default:
      logger.info('Unhandled MTN webhook event', { eventType });
  }
}

/**
 * Ecobank webhook handler
 */
async function processEcobankWebhook(data: any): Promise<void> {
  const eventType = data.eventType || data.type;

  switch (eventType) {
    case 'TRANSACTION_NOTIFICATION':
      logger.info('Ecobank transaction notification', {
        transactionRef: data.transactionRef,
        amount: data.amount
      });
      break;

    case 'BALANCE_UPDATE':
      logger.info('Ecobank balance update', { accountNumber: data.accountNumber });
      break;

    default:
      logger.info('Unhandled Ecobank webhook event', { eventType });
  }
}

/**
 * Stanbic webhook handler
 */
async function processStanbicWebhook(data: any): Promise<void> {
  const eventType = data.notificationType || data.type;

  switch (eventType) {
    case 'CREDIT':
    case 'DEBIT':
      logger.info('Stanbic transaction notification', {
        type: eventType,
        reference: data.transactionReference,
      });
      break;

    default:
      logger.info('Unhandled Stanbic webhook event', { eventType });
  }
}

/**
 * GCB Bank webhook handler
 */
async function processGCBWebhook(data: any): Promise<void> {
  const eventType = data.event || data.type;

  switch (eventType) {
    case 'transaction.credit':
    case 'transaction.debit':
      logger.info('GCB transaction notification', { reference: data.reference });
      break;

    default:
      logger.info('Unhandled GCB webhook event', { eventType });
  }
}

/**
 * Generic webhook handler for other providers
 */
async function processGenericWebhook(provider: string, data: any): Promise<void> {
  logger.info('Generic webhook received', { provider, data });
  // Store in database for manual processing if needed
}

export default router;
