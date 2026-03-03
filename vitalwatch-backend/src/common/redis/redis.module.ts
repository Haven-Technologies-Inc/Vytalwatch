import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get('redis.host') || 'localhost',
          port: configService.get('redis.port') || 6379,
          password: configService.get('redis.password') || undefined,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
        });

        client.on('error', (err) => {
          console.error('Redis connection error:', err.message);
        });

        client.on('connect', () => {
          console.log('Redis connected successfully');
        });

        client.connect().catch((err) => {
          console.error('Redis initial connection failed:', err.message);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
