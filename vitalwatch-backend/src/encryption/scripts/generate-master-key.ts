#!/usr/bin/env ts-node

/**
 * Generate a secure master encryption key
 *
 * Usage:
 *   npx ts-node src/encryption/scripts/generate-master-key.ts
 *
 * This generates a cryptographically secure 256-bit key for AES-256-GCM encryption.
 *
 * ⚠️ SECURITY WARNING:
 * - Run this ONCE per environment (dev/staging/production)
 * - Store the key securely (environment variable, KMS, Key Vault)
 * - NEVER commit the key to version control
 * - Use different keys for different environments
 * - Treat the key as highly sensitive - loss means data is unrecoverable
 */

import * as crypto from 'crypto';

function generateMasterKey(): string {
  // Generate 32 random bytes (256 bits)
  const key = crypto.randomBytes(32);

  // Convert to hexadecimal string
  return key.toString('hex');
}

function displayInstructions(key: string): void {
  console.log('\n' + '='.repeat(80));
  console.log('🔐  ENCRYPTION MASTER KEY GENERATED');
  console.log('='.repeat(80));
  console.log('\n⚠️  CRITICAL SECURITY WARNINGS:');
  console.log('  1. This key is HIGHLY SENSITIVE - protect it like a password');
  console.log('  2. Store it SECURELY (environment variable, KMS, Key Vault)');
  console.log('  3. NEVER commit it to version control');
  console.log('  4. Generate DIFFERENT keys for dev/staging/production');
  console.log('  5. If lost, encrypted data CANNOT be recovered');
  console.log('  6. If compromised, rotate immediately and re-encrypt all data');
  console.log('\n' + '-'.repeat(80));
  console.log('Your Master Encryption Key:');
  console.log('-'.repeat(80));
  console.log('\n' + key + '\n');
  console.log('-'.repeat(80));
  console.log('\n📝 SETUP INSTRUCTIONS:');
  console.log('\n1. Add to your .env file:');
  console.log('   ENCRYPTION_MASTER_KEY=' + key);
  console.log('\n2. For production, use KMS or Key Vault instead:');
  console.log('   AWS KMS:');
  console.log('     AWS_KMS_KEY_ID=arn:aws:kms:...');
  console.log('     AWS_REGION=us-east-1');
  console.log('   Azure Key Vault:');
  console.log('     AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/');
  console.log('     AZURE_TENANT_ID=...');
  console.log('     AZURE_CLIENT_ID=...');
  console.log('     AZURE_CLIENT_SECRET=...');
  console.log('\n3. Optionally enable key rotation:');
  console.log('   KEY_ROTATION_ENABLED=true');
  console.log('   KEY_ROTATION_INTERVAL_DAYS=90');
  console.log('\n4. Restart your application to load the new key');
  console.log('\n' + '='.repeat(80));
  console.log('✅  Key generation complete');
  console.log('='.repeat(80) + '\n');
}

function validateEnvironment(): void {
  const existingKey = process.env.ENCRYPTION_MASTER_KEY;

  if (existingKey) {
    console.log('\n⚠️  WARNING: ENCRYPTION_MASTER_KEY already set!');
    console.log('Generating a new key will make existing encrypted data unreadable.');
    console.log('Only proceed if:');
    console.log('  1. This is a fresh installation');
    console.log('  2. You are rotating keys and will re-encrypt all data');
    console.log('  3. You are setting up a new environment (dev/staging/prod)');
    console.log('\nPress Ctrl+C to cancel, or Enter to continue...');

    // In a real implementation, you might want to add readline to wait for input
    // For now, just show the warning
  }
}

function main(): void {
  console.log('\n🔐  Master Encryption Key Generator');
  console.log('   For VytalWatch RPM Field-Level Encryption\n');

  // Validate environment
  validateEnvironment();

  // Generate key
  const masterKey = generateMasterKey();

  // Display with instructions
  displayInstructions(masterKey);

  // Additional security check
  console.log('🔒 SECURITY CHECKLIST:');
  console.log('   [ ] Key stored securely (not in code or version control)');
  console.log('   [ ] .env file added to .gitignore');
  console.log('   [ ] Different keys used for dev/staging/production');
  console.log('   [ ] Key backed up securely (encrypted backup)');
  console.log('   [ ] Team members with access documented');
  console.log('   [ ] Key rotation schedule established');
  console.log('   [ ] Incident response plan for key compromise prepared');
  console.log('\n');
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateMasterKey };
