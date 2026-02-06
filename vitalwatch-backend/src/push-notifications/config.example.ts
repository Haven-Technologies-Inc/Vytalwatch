/**
 * Push Notifications Configuration Example
 *
 * Add this to your config/configuration.ts file:
 */

export default () => ({
  // ... existing config

  // Firebase Cloud Messaging (FCM)
  // Supports: Android, iOS, Web
  // Get credentials from: https://console.firebase.google.com
  fcm: {
    projectId: process.env.FCM_PROJECT_ID,
    privateKey: process.env.FCM_PRIVATE_KEY,
    clientEmail: process.env.FCM_CLIENT_EMAIL,
  },

  // Apple Push Notification Service (APNS)
  // Supports: iOS only
  // Get credentials from: https://developer.apple.com
  apns: {
    teamId: process.env.APNS_TEAM_ID, // Your Apple Developer Team ID
    keyId: process.env.APNS_KEY_ID, // APNs Auth Key ID
    key: process.env.APNS_KEY, // APNs Auth Key (P8 file contents)
    bundleId: process.env.APNS_BUNDLE_ID || 'com.vitalwatch.app', // Your app's bundle ID
    production: process.env.APNS_PRODUCTION === 'true', // true for production, false for sandbox
  },

  // Web Push (VAPID)
  // Supports: Chrome, Firefox, Edge, Safari (16+)
  // Generate keys with: npx web-push generate-vapid-keys
  webPush: {
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
    privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
    subject: process.env.WEB_PUSH_SUBJECT || 'mailto:support@vitalwatch.ai',
  },
});

/**
 * Environment Variables (.env)
 *
 * # FCM Configuration
 * FCM_PROJECT_ID=vitalwatch-rpm
 * FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
 * FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@vitalwatch-rpm.iam.gserviceaccount.com
 *
 * # APNS Configuration
 * APNS_TEAM_ID=XXXXXXXXXX
 * APNS_KEY_ID=YYYYYYYYYY
 * APNS_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM...\n-----END PRIVATE KEY-----\n"
 * APNS_BUNDLE_ID=com.vitalwatch.app
 * APNS_PRODUCTION=true
 *
 * # Web Push Configuration
 * WEB_PUSH_PUBLIC_KEY=BN...public_key_here...==
 * WEB_PUSH_PRIVATE_KEY=abc...private_key_here...xyz
 * WEB_PUSH_SUBJECT=mailto:support@vitalwatch.ai
 */

/**
 * Setup Instructions:
 *
 * 1. FCM Setup:
 *    - Go to Firebase Console: https://console.firebase.google.com
 *    - Create a new project or select existing
 *    - Go to Project Settings > Service Accounts
 *    - Generate new private key
 *    - Copy projectId, privateKey, and clientEmail to .env
 *
 * 2. APNS Setup:
 *    - Go to Apple Developer: https://developer.apple.com/account
 *    - Go to Certificates, Identifiers & Profiles > Keys
 *    - Create new APNs key
 *    - Download P8 file and copy contents to APNS_KEY
 *    - Copy Key ID to APNS_KEY_ID
 *    - Copy Team ID to APNS_TEAM_ID
 *    - Set your app's bundle ID in APNS_BUNDLE_ID
 *
 * 3. Web Push Setup:
 *    - Run: npx web-push generate-vapid-keys
 *    - Copy public key to WEB_PUSH_PUBLIC_KEY
 *    - Copy private key to WEB_PUSH_PRIVATE_KEY
 *    - Set contact email in WEB_PUSH_SUBJECT
 *
 * 4. Testing:
 *    - Start with sandbox/development mode
 *    - Test with your device
 *    - Once working, switch to production mode
 */

/**
 * Security Notes:
 *
 * - Never commit .env file to version control
 * - Use environment-specific .env files (.env.development, .env.production)
 * - Store production keys in secure secret management system
 * - Rotate keys periodically
 * - Use different keys for different environments
 * - Restrict API keys to specific IP addresses when possible
 */

/**
 * Rate Limits:
 *
 * FCM:
 * - 1 million messages per project per day (free tier)
 * - 240 messages per minute to same device
 *
 * APNS:
 * - No official limit, but Apple recommends reasonable rates
 * - Max 5KB payload size
 *
 * Web Push:
 * - Varies by browser and push service
 * - Generally allow 100+ notifications per minute
 */
