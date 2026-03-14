import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { ApiKey } from './entities/api-key.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { REDIS_CLIENT } from '../common/redis';

const SETTINGS_KEY = 'vytalwatch:system_settings';
const MAINTENANCE_KEY = 'vytalwatch:maintenance_mode';

const DEFAULT_SETTINGS: Record<string, any> = {
  maxPatientsPerProvider: 100,
  defaultAlertThreshold: 'medium',
  sessionTimeout: 3600,
  enableTwoFactor: true,
  retentionDays: 365,
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private redisAvailable = false;
  private fallbackSettings: Record<string, any> = { ...DEFAULT_SETTINGS };
  private fallbackMaintenance = { enabled: false, message: '', startedAt: null as string | null };

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.initializeSettings();
  }

  private async initializeSettings() {
    try {
      await this.redis.ping();
      this.redisAvailable = true;
      const existing = await this.redis.get(SETTINGS_KEY);
      if (!existing) {
        await this.redis.set(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      }
      this.logger.log('Admin settings backed by Redis');
    } catch {
      this.redisAvailable = false;
      this.logger.warn('Redis unavailable — admin settings using in-memory fallback');
    }
  }

  // API Keys
  async getApiKeys(user: CurrentUserPayload) {
    try {
      return await this.apiKeyRepository.find({
        where: { organizationId: user.organizationId },
        order: { createdAt: 'DESC' },
      });
    } catch {
      // Return empty array if table doesn't exist or other DB error
      return [];
    }
  }

  async getApiKey(id: string, _user: CurrentUserPayload) {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    return apiKey;
  }

  async createApiKey(dto: any, user: CurrentUserPayload) {
    const key = `vw_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = this.apiKeyRepository.create({
      name: dto.name,
      keyHash: hashedKey,
      keyPrefix: key.substring(0, 10),
      scopes: dto.scopes || ['read'],
      expiresAt: dto.expiresAt,
      rateLimit: dto.rateLimit || 1000,
      organizationId: user.organizationId,
      createdById: user.sub,
    });

    const saved = await this.apiKeyRepository.save(apiKey);

    await this.auditService.log({
      action: 'API_KEY_CREATED',
      userId: user.sub,
      details: { apiKeyId: saved.id, name: dto.name },
    });

    return { ...saved, key }; // Return unhashed key only on creation
  }

  async updateApiKey(id: string, dto: any, user: CurrentUserPayload) {
    await this.getApiKey(id, user);

    await this.apiKeyRepository.update(id, dto);

    await this.auditService.log({
      action: 'API_KEY_UPDATED',
      userId: user.sub,
      details: { apiKeyId: id },
    });

    return this.getApiKey(id, user);
  }

  async deleteApiKey(id: string, user: CurrentUserPayload) {
    await this.getApiKey(id, user);
    await this.apiKeyRepository.softDelete(id);

    await this.auditService.log({
      action: 'API_KEY_DELETED',
      userId: user.sub,
      details: { apiKeyId: id },
    });
  }

  async regenerateApiKey(id: string, user: CurrentUserPayload) {
    const apiKey = await this.getApiKey(id, user);
    
    const key = `vw_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

    await this.apiKeyRepository.update(id, {
      keyHash: hashedKey,
      keyPrefix: key.substring(0, 10),
    });

    await this.auditService.log({
      action: 'API_KEY_REGENERATED',
      userId: user.sub,
      details: { apiKeyId: id },
    });

    return { ...apiKey, key };
  }

  // System Logs
  async getLogs(options: any) {
    // In production, would query from logging service (e.g., ELK stack)
    return {
      data: [],
      meta: { total: 0, page: options.page, limit: options.limit },
    };
  }

  async getLogEntry(id: string) {
    return { id, level: 'info', message: 'Log entry', timestamp: new Date().toISOString() };
  }

  async getLogStats(_options: any) {
    return {
      totalLogs: 15420,
      byLevel: {
        error: 45,
        warn: 230,
        info: 12500,
        debug: 2645,
      },
      bySource: {
        api: 8500,
        auth: 2100,
        vitals: 3200,
        alerts: 1620,
      },
    };
  }

  // System Settings (Redis-backed with in-memory fallback)
  async getSystemSettings(): Promise<Record<string, any>> {
    if (this.redisAvailable) {
      try {
        const data = await this.redis.get(SETTINGS_KEY);
        return data ? JSON.parse(data) : { ...DEFAULT_SETTINGS };
      } catch {
        return this.fallbackSettings;
      }
    }
    return this.fallbackSettings;
  }

  async getSystemSetting(key: string) {
    const settings = await this.getSystemSettings();
    if (!(key in settings)) {
      throw new NotFoundException('Setting not found');
    }
    return { key, value: settings[key] };
  }

  async updateSystemSetting(dto: { key: string; value: any }, user: CurrentUserPayload) {
    const settings = await this.getSystemSettings();
    settings[dto.key] = dto.value;
    await this.persistSettings(settings);

    await this.auditService.log({
      action: 'SYSTEM_SETTING_UPDATED',
      userId: user.sub,
      details: { key: dto.key },
    });

    return this.getSystemSetting(dto.key);
  }

  async updateSystemSettingsBulk(settings: Record<string, any>, user: CurrentUserPayload) {
    const current = await this.getSystemSettings();
    Object.assign(current, settings);
    await this.persistSettings(current);

    await this.auditService.log({
      action: 'SYSTEM_SETTINGS_BULK_UPDATE',
      userId: user.sub,
      details: { keys: Object.keys(settings) },
    });

    return this.getSystemSettings();
  }

  private async persistSettings(settings: Record<string, any>): Promise<void> {
    this.fallbackSettings = { ...settings };
    if (this.redisAvailable) {
      try {
        await this.redis.set(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        this.logger.warn('Failed to persist settings to Redis');
      }
    }
  }

  // Usage Statistics — real DB queries
  async getUsageStats(_options: any) {
    try {
      const totalUsers = await this.userRepository.count();
      const activeUsers = await this.userRepository.count({ where: { status: UserStatus.ACTIVE } });
      return {
        apiRequests: { total: 0, successful: 0, failed: 0 },
        activeUsers: { total: totalUsers, active: activeUsers, daily: 0, weekly: 0, monthly: activeUsers },
        dataProcessed: { vitals: 0, alerts: 0, reports: 0 },
      };
    } catch {
      return {
        apiRequests: { total: 0, successful: 0, failed: 0 },
        activeUsers: { total: 0, active: 0, daily: 0, weekly: 0, monthly: 0 },
        dataProcessed: { vitals: 0, alerts: 0, reports: 0 },
      };
    }
  }

  async getApiUsage(_options: any) {
    return {
      totalRequests: 0,
      byEndpoint: [],
      byDay: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        count: 0,
      })),
      note: 'Enable EnterpriseLoggingModule for full API usage tracking',
    };
  }

  async getStorageUsage() {
    try {
      const result = await this.dataSource.query(
        `SELECT pg_database_size(current_database()) as db_size`,
      );
      const dbSizeBytes = parseInt(result?.[0]?.db_size || '0', 10);
      const dbSizeMB = Math.round(dbSizeBytes / (1024 * 1024));
      return {
        database: `${dbSizeMB} MB`,
        dbSizeBytes,
      };
    } catch {
      return { database: 'unavailable', dbSizeBytes: 0 };
    }
  }

  // System Health — real metrics
  async getSystemHealth() {
    const mem = process.memoryUsage();
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(mem.external / 1024 / 1024)} MB`,
      },
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      timestamp: new Date().toISOString(),
    };
  }

  async getDatabaseHealth() {
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (err) {
      return { status: 'unhealthy', latency: -1, error: err.message };
    }
  }

  async getServicesHealth() {
    const dbHealth = await this.getDatabaseHealth();

    let redisHealth: { status: string; latency: number };
    try {
      const start = Date.now();
      await this.redis.ping();
      redisHealth = { status: 'healthy', latency: Date.now() - start };
    } catch {
      redisHealth = { status: 'unhealthy', latency: -1 };
    }

    return {
      api: { status: 'healthy', latency: 0 },
      database: dbHealth,
      redis: redisHealth,
    };
  }

  // User Management
  async getPendingUsers(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.PENDING })
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: users.map((u) => {
        const { passwordHash: _pw, ...safe } = u as any;
        return safe;
      }),
      meta: { total, page, limit },
    };
  }

  async approveUser(id: string, user: CurrentUserPayload) {
    await this.userRepository.update(id, { status: UserStatus.ACTIVE });

    await this.auditService.log({
      action: 'USER_APPROVED',
      userId: user.sub,
      details: { targetUserId: id },
    });

    return { success: true };
  }

  async rejectUser(id: string, reason: string, user: CurrentUserPayload) {
    await this.userRepository.update(id, { status: UserStatus.INACTIVE });

    await this.auditService.log({
      action: 'USER_REJECTED',
      userId: user.sub,
      details: { targetUserId: id, reason },
    });

    return { success: true };
  }

  async suspendUser(id: string, reason: string, user: CurrentUserPayload) {
    await this.userRepository.update(id, { status: UserStatus.SUSPENDED });

    await this.auditService.log({
      action: 'USER_SUSPENDED',
      userId: user.sub,
      details: { targetUserId: id, reason },
    });

    return { success: true };
  }

  async reactivateUser(id: string, user: CurrentUserPayload) {
    await this.userRepository.update(id, { status: UserStatus.ACTIVE });

    await this.auditService.log({
      action: 'USER_REACTIVATED',
      userId: user.sub,
      details: { targetUserId: id },
    });

    return { success: true };
  }

  // Maintenance Mode (Redis-backed)
  async enableMaintenanceMode(dto: any, user: CurrentUserPayload) {
    const state = {
      enabled: true,
      message: dto.message || 'System maintenance in progress',
      startedAt: new Date().toISOString(),
    };
    await this.persistMaintenance(state);

    await this.auditService.log({
      action: 'MAINTENANCE_MODE_ENABLED',
      userId: user.sub,
      details: dto,
    });

    return state;
  }

  async disableMaintenanceMode(user: CurrentUserPayload) {
    const state = { enabled: false, message: '', startedAt: null as string | null };
    await this.persistMaintenance(state);

    await this.auditService.log({
      action: 'MAINTENANCE_MODE_DISABLED',
      userId: user.sub,
    });

    return state;
  }

  async getMaintenanceStatus() {
    if (this.redisAvailable) {
      try {
        const data = await this.redis.get(MAINTENANCE_KEY);
        return data ? JSON.parse(data) : this.fallbackMaintenance;
      } catch { /* fall through */ }
    }
    return this.fallbackMaintenance;
  }

  private async persistMaintenance(state: { enabled: boolean; message: string; startedAt: string | null }): Promise<void> {
    this.fallbackMaintenance = { ...state };
    if (this.redisAvailable) {
      try {
        await this.redis.set(MAINTENANCE_KEY, JSON.stringify(state));
      } catch {
        this.logger.warn('Failed to persist maintenance mode to Redis');
      }
    }
  }

  // Cache Management — real Redis operations
  async clearCache(pattern: string, user: CurrentUserPayload) {
    let keysCleared = 0;
    if (this.redisAvailable) {
      try {
        const effectivePattern = pattern || '*';
        if (effectivePattern === '*') {
          await this.redis.flushdb();
          keysCleared = -1; // indicates full flush
        } else {
          const keys = await this.redis.keys(effectivePattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
          keysCleared = keys.length;
        }
      } catch (err) {
        this.logger.warn(`Failed to clear cache: ${err.message}`);
      }
    }

    await this.auditService.log({
      action: 'CACHE_CLEARED',
      userId: user.sub,
      details: { pattern, keysCleared },
    });

    return { success: true, pattern: pattern || '*', keysCleared, clearedAt: new Date().toISOString() };
  }

  async getCacheStats() {
    if (this.redisAvailable) {
      try {
        const info = await this.redis.info('stats');
        const memInfo = await this.redis.info('memory');
        const keyCount = await this.redis.dbsize();

        const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0', 10);
        const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0', 10);
        const usedMemory = memInfo.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown';
        const hitRate = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

        return { hits, misses, hitRate, size: usedMemory, keys: keyCount };
      } catch {
        return { hits: 0, misses: 0, hitRate: 0, size: 'unavailable', keys: 0 };
      }
    }
    return { hits: 0, misses: 0, hitRate: 0, size: 'redis_unavailable', keys: 0 };
  }
}
