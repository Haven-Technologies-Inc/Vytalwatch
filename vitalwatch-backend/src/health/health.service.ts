import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis';

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services?: Record<string, ServiceHealth>;
  memory?: { heapUsed: number; heapTotal: number; rss: number };
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      version: this.configService.get('app.version') || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness(): Promise<HealthStatus> {
    const [dbHealth, redisHealth] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    const overallStatus = this.aggregateStatus([dbHealth, redisHealth]);

    return {
      status: overallStatus,
      version: this.configService.get('app.version') || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      services: { database: dbHealth, redis: redisHealth },
    };
  }

  async checkDetailed(): Promise<HealthStatus> {
    const [dbHealth, redisHealth, influxHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkInfluxDB(),
    ]);

    const overallStatus = this.aggregateStatus([dbHealth, redisHealth, influxHealth]);
    const mem = process.memoryUsage();

    return {
      status: overallStatus,
      version: this.configService.get('app.version') || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth,
        influxdb: influxHealth,
      },
      memory: { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, rss: mem.rss },
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', latency: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const result = await this.redis.ping();
      if (result === 'PONG') {
        return { status: 'healthy', latency: Date.now() - start };
      }
      return {
        status: 'degraded',
        latency: Date.now() - start,
        message: `Unexpected response: ${result}`,
      };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  private async checkInfluxDB(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const influxUrl = this.configService.get<string>('influxdb.url');
      if (!influxUrl) {
        return { status: 'degraded', message: 'InfluxDB URL not configured' };
      }

      const response = await fetch(`${influxUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return { status: 'healthy', latency: Date.now() - start };
      }
      return {
        status: 'degraded',
        latency: Date.now() - start,
        message: `HTTP ${response.status}`,
      };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  private aggregateStatus(services: ServiceHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (services.some((s) => s.status === 'unhealthy')) return 'unhealthy';
    if (services.some((s) => s.status === 'degraded')) return 'degraded';
    return 'healthy';
  }
}
