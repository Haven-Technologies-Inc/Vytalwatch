import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface CacheEntry {
  key: string;
  value: string;
  metadata: {
    model: string;
    tokens: number;
    cost: number;
    createdAt: number;
    expiresAt: number;
    hits: number;
  };
}

@Injectable()
export class ResponseCacheUtil {
  private static readonly logger = new Logger(ResponseCacheUtil.name);

  // In-memory cache (in production, use Redis)
  private static cache = new Map<string, CacheEntry>();

  // Cache configuration
  private static readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
  private static readonly MAX_CACHE_SIZE = 1000;

  /**
   * Generate cache key from prompt and parameters
   */
  static generateCacheKey(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number,
  ): string {
    const data = `${prompt}|${model}|${temperature}|${maxTokens}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get cached response
   */
  static get(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number,
  ): CacheEntry | null {
    const key = this.generateCacheKey(prompt, model, temperature, maxTokens);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.metadata.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`Cache expired for key: ${key.substring(0, 16)}...`);
      return null;
    }

    // Increment hit count
    entry.metadata.hits++;

    this.logger.debug(`Cache hit for key: ${key.substring(0, 16)}... (hits: ${entry.metadata.hits})`);
    return entry;
  }

  /**
   * Set cached response
   */
  static set(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number,
    response: string,
    tokens: number,
    cost: number,
    ttl: number = this.DEFAULT_TTL,
  ): void {
    const key = this.generateCacheKey(prompt, model, temperature, maxTokens);

    // Check cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key,
      value: response,
      metadata: {
        model,
        tokens,
        cost,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl,
        hits: 0,
      },
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cached response for key: ${key.substring(0, 16)}...`);
  }

  /**
   * Invalidate cache entry
   */
  static invalidate(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number,
  ): void {
    const key = this.generateCacheKey(prompt, model, temperature, maxTokens);
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.logger.debug(`Invalidated cache for key: ${key.substring(0, 16)}...`);
    }
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared cache (${size} entries)`);
  }

  /**
   * Evict least recently used entries
   */
  private static evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // Find entry with least hits and oldest creation time
    for (const [key, entry] of this.cache.entries()) {
      const score = entry.metadata.hits * 1000 + (Date.now() - entry.metadata.createdAt);
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted LRU cache entry: ${oldestKey.substring(0, 16)}...`);
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    totalEntries: number;
    hitRate: number;
    totalSavedCost: number;
  } {
    let totalHits = 0;
    let totalSavedCost = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.metadata.hits;
      totalSavedCost += entry.metadata.cost * entry.metadata.hits;
    }

    const totalRequests = this.cache.size + totalHits;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      totalHits,
      totalEntries: this.cache.size,
      hitRate: parseFloat(hitRate.toFixed(2)),
      totalSavedCost: parseFloat(totalSavedCost.toFixed(4)),
    };
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.metadata.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Check if caching is beneficial for this query
   */
  static shouldCache(prompt: string, temperature: number): boolean {
    // Don't cache if temperature is high (more randomness)
    if (temperature > 0.8) {
      return false;
    }

    // Don't cache very short prompts
    if (prompt.length < 20) {
      return false;
    }

    // Don't cache prompts that likely contain unique data (dates, specific values)
    const hasUniqueData = /\d{4}-\d{2}-\d{2}|\b\d{1,3}\.\d{1,2}\b/.test(prompt);
    if (hasUniqueData) {
      return false;
    }

    return true;
  }
}

// Run cleanup every 30 minutes
setInterval(() => ResponseCacheUtil.cleanup(), 30 * 60 * 1000);
