# Push Notifications Quick Start Guide

Get push notifications working in your VytalWatch RPM app in 5 minutes.

## Prerequisites

- Node.js 16+ installed
- PostgreSQL database running
- NestJS backend project setup

## Step 1: Install Dependencies

```bash
npm install firebase-admin apn web-push @nestjs/schedule @nestjs/event-emitter
```

## Step 2: Generate Web Push Keys

```bash
npx web-push generate-vapid-keys
```

Save the output - you'll need these keys.

## Step 3: Configure Environment Variables

Add to your `.env` file:

```env
# FCM (Get from Firebase Console)
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# APNS (Get from Apple Developer)
APNS_TEAM_ID=XXXXXXXXXX
APNS_KEY_ID=YYYYYYYYYY
APNS_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APNS_BUNDLE_ID=com.vitalwatch.app
APNS_PRODUCTION=false

# Web Push (From step 2)
WEB_PUSH_PUBLIC_KEY=BN...==
WEB_PUSH_PRIVATE_KEY=abc...xyz
WEB_PUSH_SUBJECT=mailto:support@vitalwatch.ai
```

## Step 4: Update Configuration

In `src/config/configuration.ts`, add:

```typescript
export default () => ({
  // ... existing config

  fcm: {
    projectId: process.env.FCM_PROJECT_ID,
    privateKey: process.env.FCM_PRIVATE_KEY,
    clientEmail: process.env.FCM_CLIENT_EMAIL,
  },

  apns: {
    teamId: process.env.APNS_TEAM_ID,
    keyId: process.env.APNS_KEY_ID,
    key: process.env.APNS_KEY,
    bundleId: process.env.APNS_BUNDLE_ID,
    production: process.env.APNS_PRODUCTION === 'true',
  },

  webPush: {
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
    privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
    subject: process.env.WEB_PUSH_SUBJECT,
  },
});
```

## Step 5: Run Database Migration

```bash
# Copy the SQL migration file to your migrations folder
# Then run:
npm run typeorm migration:run
```

Or manually run the SQL from `migrations/create-device-tokens-table.sql`

## Step 6: Import Module

In `src/app.module.ts`:

```typescript
import { PushNotificationsModule } from './push-notifications/push-notifications.module';

@Module({
  imports: [
    // ... other modules
    PushNotificationsModule,
  ],
})
export class AppModule {}
```

## Step 7: Test It!

Start your server:

```bash
npm run start:dev
```

Test the health endpoint:

```bash
curl http://localhost:3000/push/health
```

## Step 8: Register a Test Device

Using your frontend app, register a device:

```bash
curl -X POST http://localhost:3000/push/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_DEVICE_FCM_TOKEN",
    "platform": "android",
    "deviceInfo": {
      "deviceName": "Test Device",
      "model": "Pixel 7"
    }
  }'
```

## Step 9: Send Test Notification

```bash
curl -X POST http://localhost:3000/push/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "Push notifications are working!"
  }'
```

## Step 10: Use in Your Code

```typescript
import { Injectable } from '@nestjs/common';
import { PushNotificationsService } from './push-notifications/push-notifications.service';
import { NotificationTemplates } from './push-notifications/templates/notification-templates';

@Injectable()
export class YourService {
  constructor(
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  async sendAlert(userId: string) {
    const template = NotificationTemplates.criticalAlert({
      alertType: 'Test Alert',
      message: 'This is a test alert',
      alertId: '123',
    });

    const result = await this.pushNotificationsService.sendFromTemplate(
      userId,
      template,
    );

    console.log(`Sent to ${result.sentCount} devices`);
  }
}
```

## Common Issues

### "FCM Provider not initialized"
- Check that FCM environment variables are set correctly
- Verify private key has `\n` characters (not literal newlines)
- Ensure Firebase project exists and service account has permissions

### "APNS Provider not initialized"
- Verify APNS environment variables are set
- Check that the P8 key file contents are correct
- Ensure Team ID and Key ID match your Apple Developer account

### "No active devices found"
- Make sure you registered a device using POST /push/register
- Check that the device token is valid and not expired
- Verify the user ID matches the authenticated user

### Database errors
- Run the migration: `npm run typeorm migration:run`
- Check PostgreSQL connection
- Verify `device_tokens` table exists

## Next Steps

1. **Read the full documentation**: Check out `README.md` for comprehensive docs
2. **Explore templates**: See `templates/notification-templates.ts` for all available templates
3. **View examples**: Check `EXAMPLES.md` for real-world usage examples
4. **Configure for production**: Update APNS_PRODUCTION to true and use production certificates
5. **Set up monitoring**: Add logging and analytics for notification delivery

## Getting Help

- Check the README.md for detailed documentation
- Review EXAMPLES.md for usage patterns
- See DEPENDENCIES.md for package information
- Contact dev@vitalwatch.ai for support

## Security Checklist

Before going to production:

- [ ] Never commit .env file to version control
- [ ] Use different keys for dev/staging/production
- [ ] Enable HTTPS for all endpoints
- [ ] Set APNS_PRODUCTION=true for production
- [ ] Restrict API keys to specific IP addresses
- [ ] Enable rate limiting on endpoints
- [ ] Set up monitoring and alerting
- [ ] Test with real devices before launch

## Production Deployment Checklist

- [ ] All environment variables set in production
- [ ] Database migration completed
- [ ] FCM configured with production service account
- [ ] APNS configured with production certificates
- [ ] Web Push VAPID keys generated and configured
- [ ] Module imported in app.module.ts
- [ ] Health endpoint responds successfully
- [ ] Test notifications sent successfully
- [ ] Error logging configured
- [ ] Monitoring dashboards set up

Congratulations! You now have a fully functional push notification system. 🎉
