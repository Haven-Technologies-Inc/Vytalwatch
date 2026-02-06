# Dependencies for Push Notifications System

## Required NPM Packages

Install the following packages to enable push notifications:

```bash
npm install firebase-admin@^12.0.0 apn@^2.2.0 web-push@^3.6.6
npm install @nestjs/schedule@^4.0.0 @nestjs/event-emitter@^2.0.4
```

## Package Details

### firebase-admin
- **Purpose**: Firebase Cloud Messaging (FCM) for Android, iOS, and Web push notifications
- **Version**: ^12.0.0
- **Documentation**: https://firebase.google.com/docs/admin/setup
- **License**: Apache-2.0

### apn
- **Purpose**: Apple Push Notification service (APNS) for iOS devices
- **Version**: ^2.2.0
- **Documentation**: https://github.com/node-apn/node-apn
- **License**: MIT

### web-push
- **Purpose**: Web Push protocol for browser notifications
- **Version**: ^3.6.6
- **Documentation**: https://github.com/web-push-libs/web-push
- **License**: MIT

### @nestjs/schedule
- **Purpose**: Scheduled tasks for cleaning up expired tokens and processing scheduled notifications
- **Version**: ^4.0.0
- **Documentation**: https://docs.nestjs.com/techniques/task-scheduling
- **License**: MIT

### @nestjs/event-emitter
- **Purpose**: Event-driven architecture for notification lifecycle events
- **Version**: ^2.0.4
- **Documentation**: https://docs.nestjs.com/techniques/events
- **License**: MIT

## Package.json Snippet

Add these to your `package.json`:

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "apn": "^2.2.0",
    "web-push": "^3.6.6",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/event-emitter": "^2.0.4"
  }
}
```

## TypeScript Types

The packages above include TypeScript definitions. No additional @types packages are needed.

## Platform-Specific Requirements

### Firebase Cloud Messaging (FCM)
- Service account JSON from Firebase Console
- Project must be created in Firebase Console
- No additional SDKs required on backend

### Apple Push Notification Service (APNS)
- Apple Developer account required
- APNs Auth Key (P8 file) from Apple Developer Portal
- Team ID and Key ID from Apple Developer Portal
- App must have Push Notifications capability enabled

### Web Push
- VAPID keys generated with `web-push generate-vapid-keys`
- HTTPS required for production
- Service worker required on frontend

## Peer Dependencies

The following are assumed to be already installed in your NestJS project:

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "typeorm": "^0.3.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "pg": "^8.11.0"
  }
}
```

## Installation Steps

1. Install dependencies:
```bash
npm install
```

2. Generate Web Push VAPID keys:
```bash
npx web-push generate-vapid-keys
```

3. Configure environment variables (see config.example.ts)

4. Run database migrations:
```bash
npm run typeorm migration:run
```

5. Import PushNotificationsModule in app.module.ts

6. Start the application:
```bash
npm run start:dev
```

## Troubleshooting

### firebase-admin installation issues
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### APNS installation issues on Linux
```bash
# Install build dependencies
sudo apt-get install build-essential python3
npm install apn --build-from-source
```

### Web Push compilation errors
```bash
# Ensure TypeScript is up to date
npm install -D typescript@latest
```

## Security Considerations

- Never commit node_modules to version control
- Keep dependencies updated for security patches
- Use `npm audit` to check for vulnerabilities
- Use lock files (package-lock.json) for reproducible builds

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Performance

These packages are production-ready and optimized:

- **firebase-admin**: Maintains persistent connections, handles 1M+ messages/day
- **apn**: Connection pooling, automatic retry logic
- **web-push**: Lightweight, minimal memory footprint
- **@nestjs/schedule**: Efficient cron-based scheduling
- **@nestjs/event-emitter**: Event-driven, non-blocking

## Bundle Size

Approximate bundle sizes (production build):

- firebase-admin: ~2MB (with dependencies)
- apn: ~500KB
- web-push: ~300KB
- @nestjs/schedule: ~100KB
- @nestjs/event-emitter: ~50KB

Total: ~3MB (acceptable for backend service)

## Alternatives Considered

### Why firebase-admin instead of fcm-node?
- Official Google SDK
- Better maintained
- Supports latest FCM features
- Better TypeScript support

### Why apn instead of apns2?
- More mature and stable
- Better documentation
- Active maintenance
- Token-based authentication support

### Why web-push instead of push-api?
- Industry standard
- W3C compliant
- Better browser support
- Active development

## Support

For dependency-related issues:
- firebase-admin: https://github.com/firebase/firebase-admin-node/issues
- apn: https://github.com/node-apn/node-apn/issues
- web-push: https://github.com/web-push-libs/web-push/issues
- NestJS: https://github.com/nestjs/nest/issues
