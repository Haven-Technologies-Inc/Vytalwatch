# AI Module Dependencies

## Required NPM Packages

Add the following dependencies to your `package.json`:

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/jwt": "^10.0.0",
    "typeorm": "^0.3.17",
    "pg": "^8.11.0",
    "openai": "^4.20.0",
    "socket.io": "^4.6.0",
    "tiktoken": "^1.0.10",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

## Installation

```bash
# Install all dependencies
npm install

# Or install individually
npm install openai@^4.20.0
npm install tiktoken@^1.0.10
npm install @nestjs/websockets@^10.0.0
npm install @nestjs/platform-socket.io@^10.0.0
npm install socket.io@^4.6.0
```

## Package Descriptions

### Core Dependencies

- **openai**: Official OpenAI API client for GPT-4 and other models
- **tiktoken**: Token counting library for accurate usage tracking
- **socket.io**: Real-time WebSocket communication for streaming
- **@nestjs/websockets**: NestJS WebSocket module
- **@nestjs/platform-socket.io**: Socket.IO adapter for NestJS
- **@nestjs/typeorm**: TypeORM integration for NestJS
- **typeorm**: ORM for database operations
- **pg**: PostgreSQL client

### Validation & Transformation

- **class-validator**: DTO validation decorators
- **class-transformer**: Object transformation utilities

### Configuration

- **@nestjs/config**: Configuration management
- **@nestjs/jwt**: JWT authentication

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## Database Setup

### PostgreSQL Extensions

Ensure these extensions are enabled:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search
```

### Environment Variables

Create a `.env` file with:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vitalwatch

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Grok (optional)
GROK_API_KEY=gsk_...
GROK_BASE_URL=https://api.x.ai/v1

# JWT
JWT_SECRET=your-very-secure-secret-key-change-in-production

# Redis (for production)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting (optional overrides)
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_TOKENS_PER_DAY=50000
RATE_LIMIT_MAX_COST_PER_DAY=1.0
```

## Module Import

In your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Use migrations in production
    }),
    AIModule,
    // ... other modules
  ],
})
export class AppModule {}
```

## Testing Dependencies

For testing:

```bash
npm install --save-dev @nestjs/testing jest @types/jest ts-jest
```

## Deployment Considerations

### Production Dependencies

For production, consider adding:

- **Redis**: For distributed caching and rate limiting
- **Bull**: For background job processing
- **Prometheus**: For metrics collection
- **Winston**: For advanced logging

```bash
npm install redis@^4.0.0 @nestjs/bull bull ioredis
npm install @willsoto/nestjs-prometheus prom-client
npm install winston nest-winston
```

### Docker Setup

Example `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
```

## Performance Optimization

### Database Indexes

The migration file includes optimized indexes. Monitor query performance with:

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Caching Strategy

For production, replace in-memory caching with Redis:

```typescript
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    RedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),
  ],
})
export class AIModule {}
```

## Monitoring & Observability

Recommended tools:

- **Sentry**: Error tracking
- **DataDog**: Application monitoring
- **New Relic**: Performance monitoring
- **Grafana**: Metrics visualization

## Security Checklist

- [ ] Enable HTTPS in production
- [ ] Set secure JWT secret
- [ ] Enable CORS with specific origins
- [ ] Implement API key rotation
- [ ] Enable database encryption at rest
- [ ] Set up automated backups
- [ ] Enable audit logging
- [ ] Implement rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable SQL injection protection
- [ ] Implement CSRF protection
- [ ] Set up firewall rules

## Support

For dependency issues:

1. Check npm version: `npm --version` (should be 8.x or higher)
2. Clear cache: `npm cache clean --force`
3. Remove node_modules: `rm -rf node_modules package-lock.json`
4. Reinstall: `npm install`

## Version Compatibility

| Package | Minimum Version | Recommended Version |
|---------|----------------|---------------------|
| Node.js | 16.x | 18.x LTS |
| npm | 8.x | 9.x |
| PostgreSQL | 13.x | 15.x |
| TypeScript | 4.9.x | 5.x |
| NestJS | 10.x | 10.x |

## Upgrade Path

When upgrading major versions:

1. Review breaking changes in changelog
2. Update dependencies incrementally
3. Run tests after each update
4. Update TypeScript types
5. Test in staging environment
6. Deploy with rollback plan
