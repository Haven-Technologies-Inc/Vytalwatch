import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../common/redis';

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.version') return '1.0.0';
              return undefined;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            ping: jest.fn().mockResolvedValue('PONG'),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('check', () => {
    it('should return healthy status', async () => {
      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('checkReadiness', () => {
    it('should return healthy when database is connected', async () => {
      const result = await service.checkReadiness();
      expect(result.status).toBe('healthy');
      expect(result.services?.database?.status).toBe('healthy');
    });

    it('should return unhealthy when database fails', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockRejectedValueOnce(new Error('DB Error'));
      const result = await service.checkReadiness();
      expect(result.status).toBe('unhealthy');
      expect(result.services?.database?.status).toBe('unhealthy');
    });
  });

  describe('checkDetailed', () => {
    it('should return detailed health with memory info', async () => {
      const result = await service.checkDetailed();
      expect(['healthy', 'degraded']).toContain(result.status);
      expect(result.memory).toBeDefined();
      expect(result.memory?.heapUsed).toBeGreaterThan(0);
      expect(result.memory?.heapTotal).toBeGreaterThan(0);
      expect(result.memory?.rss).toBeGreaterThan(0);
    });
  });
});
