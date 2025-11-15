/**
 * ReshADX - Streaming Service
 * Manages real-time event subscriptions using Redis Pub/Sub
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import config from '../config';
import { logger } from '../utils/logger';

export interface StreamEvent {
  type: string;
  data: any;
}

export interface Subscription {
  unsubscribe: () => void;
}

export class StreamingService {
  private redis: Redis;
  private redisSubscriber: Redis;
  private eventEmitter: EventEmitter;
  private activeSubscriptions: Map<string, Set<string>>;

  constructor() {
    // Create Redis clients
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 3,
    });

    this.redisSubscriber = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 3,
    });

    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(1000); // Support many concurrent streams

    this.activeSubscriptions = new Map();

    // Set up Redis subscriber
    this.setupRedisSubscriber();
  }

  /**
   * Set up Redis subscriber for various event channels
   */
  private setupRedisSubscriber(): void {
    // Subscribe to event channels
    this.redisSubscriber.subscribe(
      'transactions:new',
      'transactions:updated',
      'accounts:updated',
      'balances:updated',
      'fraud:alert',
      'items:synced',
      (err, count) => {
        if (err) {
          logger.error('Failed to subscribe to Redis channels', { error: err });
        } else {
          logger.info('Subscribed to Redis channels', { channelCount: count });
        }
      }
    );

    // Handle messages
    this.redisSubscriber.on('message', (channel, message) => {
      try {
        const event = JSON.parse(message);
        this.eventEmitter.emit(channel, event);
        logger.debug('Redis event received', { channel, eventType: event.type });
      } catch (error) {
        logger.error('Failed to parse Redis message', { channel, error });
      }
    });

    // Handle errors
    this.redisSubscriber.on('error', (error) => {
      logger.error('Redis subscriber error', { error });
    });
  }

  /**
   * Subscribe to transaction updates
   */
  subscribeToTransactions(
    userId: string,
    itemId?: string,
    accountId?: string,
    callback: (event: StreamEvent) => void
  ): Subscription {
    const subscriptionId = this.generateSubscriptionId();

    // Track subscription
    this.trackSubscription(userId, subscriptionId);

    // Set up event listeners
    const transactionNewHandler = (event: any) => {
      if (this.shouldSendEvent(event, userId, itemId, accountId)) {
        callback({
          type: 'transaction.new',
          data: event,
        });
      }
    };

    const transactionUpdatedHandler = (event: any) => {
      if (this.shouldSendEvent(event, userId, itemId, accountId)) {
        callback({
          type: 'transaction.updated',
          data: event,
        });
      }
    };

    this.eventEmitter.on('transactions:new', transactionNewHandler);
    this.eventEmitter.on('transactions:updated', transactionUpdatedHandler);

    return {
      unsubscribe: () => {
        this.eventEmitter.off('transactions:new', transactionNewHandler);
        this.eventEmitter.off('transactions:updated', transactionUpdatedHandler);
        this.removeSubscription(userId, subscriptionId);
      },
    };
  }

  /**
   * Subscribe to account updates
   */
  subscribeToAccounts(
    userId: string,
    callback: (event: StreamEvent) => void
  ): Subscription {
    const subscriptionId = this.generateSubscriptionId();

    this.trackSubscription(userId, subscriptionId);

    const accountUpdatedHandler = (event: any) => {
      if (event.userId === userId) {
        callback({
          type: 'account.updated',
          data: event,
        });
      }
    };

    this.eventEmitter.on('accounts:updated', accountUpdatedHandler);

    return {
      unsubscribe: () => {
        this.eventEmitter.off('accounts:updated', accountUpdatedHandler);
        this.removeSubscription(userId, subscriptionId);
      },
    };
  }

  /**
   * Subscribe to balance updates
   */
  subscribeToBalances(
    userId: string,
    accountIds?: string[],
    callback: (event: StreamEvent) => void
  ): Subscription {
    const subscriptionId = this.generateSubscriptionId();

    this.trackSubscription(userId, subscriptionId);

    const balanceUpdatedHandler = (event: any) => {
      if (event.userId === userId) {
        if (!accountIds || accountIds.includes(event.accountId)) {
          callback({
            type: 'balance.updated',
            data: event,
          });
        }
      }
    };

    this.eventEmitter.on('balances:updated', balanceUpdatedHandler);

    return {
      unsubscribe: () => {
        this.eventEmitter.off('balances:updated', balanceUpdatedHandler);
        this.removeSubscription(userId, subscriptionId);
      },
    };
  }

  /**
   * Subscribe to fraud alerts
   */
  subscribeToFraudAlerts(
    userId: string,
    callback: (event: StreamEvent) => void
  ): Subscription {
    const subscriptionId = this.generateSubscriptionId();

    this.trackSubscription(userId, subscriptionId);

    const fraudAlertHandler = (event: any) => {
      if (event.userId === userId) {
        callback({
          type: 'fraud.alert',
          data: event,
        });
      }
    };

    this.eventEmitter.on('fraud:alert', fraudAlertHandler);

    return {
      unsubscribe: () => {
        this.eventEmitter.off('fraud:alert', fraudAlertHandler);
        this.removeSubscription(userId, subscriptionId);
      },
    };
  }

  /**
   * Publish transaction event
   */
  async publishTransactionEvent(type: 'new' | 'updated', transaction: any): Promise<void> {
    const channel = type === 'new' ? 'transactions:new' : 'transactions:updated';

    try {
      await this.redis.publish(channel, JSON.stringify(transaction));
      logger.debug('Transaction event published', { channel, transactionId: transaction.transactionId });
    } catch (error) {
      logger.error('Failed to publish transaction event', { channel, error });
    }
  }

  /**
   * Publish account event
   */
  async publishAccountEvent(account: any): Promise<void> {
    try {
      await this.redis.publish('accounts:updated', JSON.stringify(account));
      logger.debug('Account event published', { accountId: account.accountId });
    } catch (error) {
      logger.error('Failed to publish account event', { error });
    }
  }

  /**
   * Publish balance event
   */
  async publishBalanceEvent(balance: any): Promise<void> {
    try {
      await this.redis.publish('balances:updated', JSON.stringify(balance));
      logger.debug('Balance event published', { accountId: balance.accountId });
    } catch (error) {
      logger.error('Failed to publish balance event', { error });
    }
  }

  /**
   * Publish fraud alert event
   */
  async publishFraudAlert(alert: any): Promise<void> {
    try {
      await this.redis.publish('fraud:alert', JSON.stringify(alert));
      logger.debug('Fraud alert published', { alertId: alert.alertId });
    } catch (error) {
      logger.error('Failed to publish fraud alert', { error });
    }
  }

  /**
   * Get stream statistics
   */
  getStats(userId: string): any {
    const userSubscriptions = this.activeSubscriptions.get(userId);

    return {
      activeSubscriptions: userSubscriptions?.size || 0,
      totalConnections: this.activeSubscriptions.size,
      eventListenerCount: this.eventEmitter.listenerCount('transactions:new'),
    };
  }

  /**
   * Check if event should be sent to client
   */
  private shouldSendEvent(
    event: any,
    userId: string,
    itemId?: string,
    accountId?: string
  ): boolean {
    if (event.userId !== userId) {
      return false;
    }

    if (itemId && event.itemId !== itemId) {
      return false;
    }

    if (accountId && event.accountId !== accountId) {
      return false;
    }

    return true;
  }

  /**
   * Track active subscription
   */
  private trackSubscription(userId: string, subscriptionId: string): void {
    if (!this.activeSubscriptions.has(userId)) {
      this.activeSubscriptions.set(userId, new Set());
    }

    this.activeSubscriptions.get(userId)!.add(subscriptionId);
  }

  /**
   * Remove subscription tracking
   */
  private removeSubscription(userId: string, subscriptionId: string): void {
    const userSubscriptions = this.activeSubscriptions.get(userId);

    if (userSubscriptions) {
      userSubscriptions.delete(subscriptionId);

      if (userSubscriptions.size === 0) {
        this.activeSubscriptions.delete(userId);
      }
    }
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.redis.quit();
    await this.redisSubscriber.quit();
    this.eventEmitter.removeAllListeners();
  }
}
