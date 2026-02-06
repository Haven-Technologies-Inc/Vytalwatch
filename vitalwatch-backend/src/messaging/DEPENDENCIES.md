# Messaging System Dependencies

This document lists all required and optional dependencies for the VytalWatch Messaging System.

## Required Dependencies

These packages must be installed for the messaging system to function:

### Core NestJS and WebSocket
```bash
npm install @nestjs/websockets@^11.0.0
npm install @nestjs/platform-socket.io@^11.0.0
npm install socket.io@^4.6.0
```

### Already Included (from existing package.json)
- `@nestjs/common@^11.0.1`
- `@nestjs/core@^11.0.1`
- `@nestjs/config@^4.0.2`
- `@nestjs/typeorm@^11.0.0`
- `@nestjs/swagger@^11.2.5`
- `typeorm@^0.3.28`
- `class-validator@^0.14.3`
- `class-transformer@^0.5.1`
- `pg@^8.17.1` (PostgreSQL driver)

## Optional Dependencies

### File Upload Support
```bash
npm install @nestjs/platform-express
npm install --save-dev @types/multer
```
Already included in your package.json

### AWS S3 Storage (if using AWS for file storage)
```bash
npm install @aws-sdk/client-s3@^3.0.0
npm install @aws-sdk/s3-request-presigner@^3.0.0
```

### Azure Blob Storage (if using Azure)
```bash
npm install @azure/storage-blob@^12.17.0
```

### Google Cloud Storage (if using GCS)
```bash
npm install @google-cloud/storage@^7.7.0
```

### Redis for WebSocket Scaling (recommended for production)
```bash
npm install @socket.io/redis-adapter@^8.2.1
# ioredis already installed in your package.json
```

### Virus Scanning
```bash
# ClamAV integration
npm install clamscan@^2.2.1

# Or VirusTotal API
npm install axios@^1.6.0
```

### Rate Limiting (already included)
- `@nestjs/throttler` - already in package.json via ThrottlerModule

## Installation Commands

### Minimum Installation (Required)
```bash
cd /home/user/RMP/vitalwatch-backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Full Installation (All Features)
```bash
cd /home/user/RMP/vitalwatch-backend

# WebSocket support
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# AWS S3 support
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Redis adapter for scaling
npm install @socket.io/redis-adapter

# Virus scanning
npm install clamscan
```

### Verify Installation

After installation, verify all dependencies are installed:

```bash
npm list @nestjs/websockets
npm list @nestjs/platform-socket.io
npm list socket.io
```

## Package.json Updates

Add these scripts to your `package.json` if not already present:

```json
{
  "scripts": {
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts"
  }
}
```

## Version Compatibility

The messaging system is tested with:

- Node.js: >= 18.0.0
- NestJS: >= 11.0.0
- TypeORM: >= 0.3.20
- PostgreSQL: >= 14.0
- Socket.IO: >= 4.6.0
- Redis (optional): >= 6.0.0

## TypeScript Configuration

Ensure your `tsconfig.json` includes these compiler options:

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

## Environment Variables

Required environment variables (add to `.env`):

```env
# Database (should already exist)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=vytalwatch

# Messaging (REQUIRED)
MESSAGING_ENCRYPTION_KEY=<generate-this>
FRONTEND_URL=http://localhost:3000

# Optional
STORAGE_PROVIDER=s3|azure|gcs|local
AWS_S3_BUCKET=your-bucket
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

ENABLE_VIRUS_SCAN=true
VIRUS_SCANNER_TYPE=mock|clamav|virustotal
```

## Breaking Changes

If upgrading from a previous version:

1. **WebSocket dependency change**: Switched to `@nestjs/platform-socket.io` from `@nestjs/platform-ws`
2. **TypeORM 0.3+**: Updated to use new TypeORM syntax
3. **NestJS 11+**: Updated decorators and module imports

## Troubleshooting Dependencies

### Cannot find module '@nestjs/websockets'

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### TypeORM import errors

Make sure you're using TypeORM 0.3+ syntax:

```typescript
// Old (0.2.x)
import { getRepository } from 'typeorm';

// New (0.3.x)
import { Repository } from 'typeorm';
@InjectRepository(Entity)
private repository: Repository<Entity>
```

### Socket.IO version conflicts

Ensure all Socket.IO packages are compatible versions:

```bash
npm install socket.io@^4.6.0 @nestjs/platform-socket.io@^11.0.0
```

### Redis adapter issues

Check Redis is running:

```bash
redis-cli ping
# Should return: PONG
```

## Production Dependencies Only

For production deployment (smaller bundle size):

```bash
npm install --production
```

This will skip devDependencies like:
- `@types/*` packages
- Testing libraries
- Build tools

## Docker Installation

If using Docker, add to your `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app files
COPY . .

# Build
RUN npm run build

CMD ["npm", "run", "start:prod"]
```

## Uninstallation

To remove messaging system dependencies:

```bash
npm uninstall @nestjs/websockets @nestjs/platform-socket.io socket.io
npm uninstall @socket.io/redis-adapter
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## License Compliance

All dependencies use compatible licenses:
- NestJS: MIT
- Socket.IO: MIT
- TypeORM: MIT
- AWS SDK: Apache 2.0
- Azure SDK: MIT

## Security Updates

Keep dependencies up to date:

```bash
# Check for outdated packages
npm outdated

# Update to latest compatible versions
npm update

# Check for security vulnerabilities
npm audit

# Fix security issues automatically
npm audit fix
```

## Support

For dependency issues:
- NestJS: https://github.com/nestjs/nest/issues
- Socket.IO: https://github.com/socketio/socket.io/issues
- TypeORM: https://github.com/typeorm/typeorm/issues
