/**
 * VytalWatch Prisma Service
 * Database client with lifecycle management
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
      errorFormat: 'colorless',
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting to PostgreSQL database...');

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      // @ts-expect-error Prisma query event logging
      this.$on('query', (e: Prisma.QueryEvent) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    await this.$connect();
    this.logger.log('Successfully connected to PostgreSQL database');
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from PostgreSQL database...');
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    ) as string[];

    return Promise.all(
      models.map((modelKey) => {
        const model = (this as unknown as Record<string, { deleteMany?: () => Promise<unknown> }>)[
          modelKey
        ];
        return model?.deleteMany?.();
      }),
    );
  }
}
