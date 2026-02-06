# Push Notifications System for VytalWatch RPM

A comprehensive, production-ready push notification system supporting multiple platforms (iOS, Android, Web) with advanced features like scheduling, rate limiting, and delivery tracking.

## Features

### Core Capabilities
- ✅ Multi-platform support (iOS, Android, Web)
- ✅ Device token management with validation and expiration
- ✅ Notification scheduling and delayed delivery
- ✅ Batch sending to multiple users
- ✅ Topic-based notifications
- ✅ Delivery tracking and status monitoring
- ✅ Automatic retry logic with exponential backoff
- ✅ Badge count management (iOS)
- ✅ Notification history and analytics

### Advanced Features
- ✅ Platform-specific payload formatting
- ✅ Deep linking to specific app screens
- ✅ Custom sounds, icons, and colors
- ✅ Notification grouping and threading
- ✅ Rate limiting (50 notifications per user per hour)
- ✅ Token expiration handling
- ✅ Quiet hours support
- ✅ Category-based muting
- ✅ Analytics tracking (opens, dismissals)
- ✅ GDPR compliance (opt-in, opt-out)
- ✅ Comprehensive audit logging

## Architecture

### Providers
- **FCM Provider** - Firebase Cloud Messaging for Android, iOS, and Web
- **APNS Provider** - Apple Push Notification Service for iOS (fallback)
- **Web Push Provider** - W3C Web Push Protocol for browsers

### Components
- **DeviceToken Entity** - Stores device tokens with user preferences
- **PushNotificationsService** - Core service managing all operations
- **PushNotificationsController** - REST API endpoints
- **NotificationTemplates** - Pre-built templates for common notifications

## Configuration

Add the following to your `.env` file:

```env
# Firebase Cloud Messaging (FCM)
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Apple Push Notification Service (APNS)
APNS_TEAM_ID=YOUR_TEAM_ID
APNS_KEY_ID=YOUR_KEY_ID
APNS_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APNS_BUNDLE_ID=com.vitalwatch.app
APNS_PRODUCTION=true

# Web Push (VAPID)
WEB_PUSH_PUBLIC_KEY=YOUR_PUBLIC_KEY
WEB_PUSH_PRIVATE_KEY=YOUR_PRIVATE_KEY
WEB_PUSH_SUBJECT=mailto:support@vitalwatch.ai
```

Update your `config/configuration.ts`:

```typescript
export default () => ({
  // ... other config
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

## Installation

1. Install required dependencies:
```bash
npm install firebase-admin apn web-push
npm install @nestjs/schedule @nestjs/event-emitter
```

2. Import the module in `app.module.ts`:
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

3. Run database migrations:
```bash
npm run typeorm migration:generate -- -n AddPushNotifications
npm run typeorm migration:run
```

## API Endpoints

### Device Management

#### Register Device
```http
POST /push/register
Content-Type: application/json
Authorization: Bearer <token>

{
  "token": "device_fcm_token_here",
  "platform": "ios|android|web",
  "deviceInfo": {
    "deviceId": "unique-device-id",
    "deviceName": "iPhone 14 Pro",
    "model": "iPhone14,3",
    "osVersion": "16.0",
    "appVersion": "1.0.0"
  },
  "preferences": {
    "soundEnabled": true,
    "vibrationEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "quietHoursTimezone": "America/New_York"
  }
}
```

#### Get User Devices
```http
GET /push/devices?platform=ios&enabledOnly=true
Authorization: Bearer <token>
```

#### Update Device Preferences
```http
PATCH /push/devices/:deviceId
Content-Type: application/json
Authorization: Bearer <token>

{
  "enabled": true,
  "preferences": {
    "mutedCategories": ["marketing"],
    "quietHoursStart": "23:00"
  }
}
```

#### Unregister Device
```http
DELETE /push/unregister/:deviceId
Authorization: Bearer <token>
```

### Send Notifications

#### Send to User
```http
POST /push/send
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "userId": "user-uuid",
  "title": "Health Alert",
  "body": "Your blood pressure reading is high",
  "category": "alert",
  "priority": "high",
  "data": {
    "alertId": "alert-uuid",
    "vitalType": "blood_pressure"
  },
  "deepLink": "/alerts/alert-uuid",
  "sound": "alert.wav",
  "color": "#dc2626"
}
```

#### Send Batch
```http
POST /push/send-batch
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "userIds": ["user-1", "user-2", "user-3"],
  "title": "System Announcement",
  "body": "Scheduled maintenance tonight at 2 AM EST"
}
```

#### Send to Topic
```http
POST /push/send-topic
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "topic": "all-users",
  "title": "New Feature",
  "body": "Check out our new medication reminders"
}
```

#### Schedule Notification
```http
POST /push/schedule
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "userId": "user-uuid",
  "title": "Medication Reminder",
  "body": "Time to take Lisinopril 10mg",
  "scheduledFor": "2026-02-07T09:00:00Z",
  "category": "reminder"
}
```

### Testing

#### Send Test Notification
```http
POST /push/test
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Test Notification",
  "body": "This is a test notification"
}
```

### Badge Management (iOS)

#### Update Badge Count
```http
PATCH /push/badge
Content-Type: application/json
Authorization: Bearer <token>

{
  "badgeCount": 5
}
```

#### Increment Badge
```http
POST /push/badge/increment
Content-Type: application/json
Authorization: Bearer <token>

{
  "increment": 1
}
```

#### Reset Badge
```http
POST /push/badge/reset
Authorization: Bearer <token>
```

### History

#### Get Notification History
```http
GET /push/history?page=1&limit=20&category=alert&priority=high
Authorization: Bearer <token>
```

## Usage Examples

### Using Templates

```typescript
import { PushNotificationsService } from './push-notifications/push-notifications.service';
import { NotificationTemplates } from './push-notifications/templates/notification-templates';

// In your service
constructor(
  private readonly pushNotificationsService: PushNotificationsService,
) {}

async sendMedicationReminder(userId: string, medication: Medication) {
  const template = NotificationTemplates.medicationReminder({
    medicationName: medication.name,
    dosage: medication.dosage,
    time: medication.scheduledTime,
    medicationId: medication.id,
  });

  await this.pushNotificationsService.sendFromTemplate(userId, template);
}
```

### Custom Notification

```typescript
await this.pushNotificationsService.sendNotification(userId, {
  title: 'Custom Alert',
  body: 'This is a custom notification',
  category: 'custom',
  priority: NotificationPriority.HIGH,
  data: { customField: 'value' },
  deepLink: '/custom/route',
  sound: 'custom.wav',
  color: '#00ff00',
  actions: [
    { action: 'accept', title: 'Accept', icon: 'check' },
    { action: 'decline', title: 'Decline', icon: 'close' },
  ],
});
```

### Scheduled Notification

```typescript
const scheduledFor = new Date();
scheduledFor.setHours(scheduledFor.getHours() + 2); // 2 hours from now

const scheduled = await this.pushNotificationsService.scheduleNotification(
  userId,
  {
    title: 'Appointment Reminder',
    body: 'Your appointment is in 1 hour',
    category: 'reminder',
  },
  scheduledFor,
);

// Later, cancel if needed
await this.pushNotificationsService.cancelScheduled(scheduled.id);
```

## Best Practices

### 1. Rate Limiting
The system automatically enforces a rate limit of 50 notifications per user per hour. For high-priority alerts, this can be bypassed by using the `critical` priority.

### 2. Quiet Hours
Users can set quiet hours to avoid notifications during sleep. Critical notifications always bypass quiet hours.

### 3. Token Management
- Tokens are automatically validated on registration
- Failed tokens are disabled after 5 consecutive failures
- Expired tokens are cleaned up daily at 2 AM

### 4. Error Handling
- All providers implement automatic retry with exponential backoff
- Failed notifications are logged with detailed error messages
- Fallback to alternative channels (email/SMS) for critical alerts

### 5. GDPR Compliance
- Users can opt-in/out via device preferences
- All notification history is accessible to users
- Device tokens can be deleted on request

### 6. Testing
Always test notifications in development before sending to production users:
```typescript
// Use test endpoint
POST /push/test
```

### 7. Deep Linking
Always provide deep links for better user experience:
```typescript
deepLink: '/alerts/123' // Opens specific alert in app
```

### 8. Platform-Specific Considerations

#### iOS
- Badge counts must be managed manually
- Use APNS for critical alerts requiring immediate delivery
- Set appropriate `apns-priority` (10 for immediate, 5 for power-conscious)

#### Android
- FCM handles most scenarios automatically
- Custom sounds require sound files in app resources
- Notification channels must be configured in the app

#### Web
- Requires HTTPS and user permission
- Service worker must be registered
- Notifications may not work in all browsers

## Monitoring

### Health Check
```http
GET /push/health
```

### Analytics Events
The system emits events for monitoring:
- `device.registered` - New device registered
- `device.unregistered` - Device removed
- `notification.sent` - Notification sent

Listen to these events for custom analytics:
```typescript
@OnEvent('notification.sent')
handleNotificationSent(payload: any) {
  // Track in analytics system
}
```

## Troubleshooting

### Common Issues

**1. "FCM Provider not initialized"**
- Check FCM configuration in `.env`
- Verify private key format (must include `\n` for line breaks)
- Ensure service account has correct permissions

**2. "Invalid token"**
- Token may have been unregistered by the device
- User may have uninstalled the app
- Token may have expired

**3. "Rate limit exceeded"**
- User has received 50+ notifications in the last hour
- Use `critical` priority for urgent alerts
- Consider batching notifications

**4. "Device not found"**
- Verify device was registered with correct userId
- Check if device was unregistered
- Ensure deviceId is correct

## Security

### Authentication
All endpoints require JWT authentication. Admin endpoints require `admin`, `doctor`, or `nurse` roles.

### Token Storage
Device tokens are encrypted at rest and never exposed in API responses.

### HTTPS Required
All notification providers require HTTPS for security.

## Performance

### Optimization Tips
- Use batch sending for multiple users
- Use topic messaging for broadcasts
- Schedule non-urgent notifications for off-peak hours
- Monitor delivery rates and adjust retry logic

### Scalability
- Supports horizontal scaling with distributed cron jobs
- Uses database indexes for fast token lookups
- Implements connection pooling for providers

## License

Proprietary - VytalWatch AI RPM System

## Support

For issues or questions, contact the development team at dev@vitalwatch.ai
