import { Injectable, Logger } from '@nestjs/common';
import { EncryptionHealthCheck } from './types';
import { KeyManagementService } from './key-management.service';
import { EncryptionService } from './encryption.service';

/**
 * Health check service for encryption system
 *
 * Monitors:
 * - Key availability
 * - Key expiration
 * - Encryption/decryption functionality
 * - Key rotation status
 */
@Injectable()
export class EncryptionHealthService {
  private readonly logger = new Logger(EncryptionHealthService.name);

  constructor(
    private readonly keyManagement: KeyManagementService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Perform comprehensive health check
   *
   * @returns Health check results
   */
  async checkHealth(): Promise<EncryptionHealthCheck> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let healthy = true;
    let keyAvailable = false;
    let keyVersion = 0;
    let keyExpiresAt: Date | undefined;
    let daysUntilExpiration: number | undefined;

    try {
      // Check key availability
      const rotationStatus = await this.keyManagement.getRotationStatus();
      keyVersion = rotationStatus.currentVersion;
      keyExpiresAt = rotationStatus.expiresAt;
      daysUntilExpiration = rotationStatus.daysUntilExpiration;
      keyAvailable = true;

      // Check key expiration
      if (daysUntilExpiration !== undefined) {
        if (daysUntilExpiration <= 0) {
          errors.push('Encryption key has expired');
          healthy = false;
        } else if (daysUntilExpiration <= 7) {
          warnings.push(`Encryption key expires in ${daysUntilExpiration} days`);
        } else if (daysUntilExpiration <= 30) {
          warnings.push(`Encryption key expires in ${daysUntilExpiration} days - consider rotating soon`);
        }
      }

      // Test encryption/decryption
      try {
        const testData = 'health-check-test-data';
        const encrypted = await this.encryptionService.encrypt(testData);
        const decrypted = await this.encryptionService.decrypt(encrypted);

        if (decrypted !== testData) {
          errors.push('Encryption/decryption test failed - data mismatch');
          healthy = false;
        }
      } catch (error) {
        errors.push(`Encryption/decryption test failed: ${error.message}`);
        healthy = false;
      }

      // Check active keys
      const activeKeys = await this.keyManagement.getActiveKeys();
      if (activeKeys.length === 0) {
        errors.push('No active encryption keys available');
        healthy = false;
      } else if (activeKeys.length > 5) {
        warnings.push(`${activeKeys.length} active keys - consider deactivating old keys`);
      }

      // Check auto-rotation status
      if (!rotationStatus.autoRotateEnabled) {
        warnings.push('Automatic key rotation is disabled');
      }
    } catch (error) {
      errors.push(`Health check failed: ${error.message}`);
      healthy = false;
      this.logger.error(`Health check error: ${error.message}`, error.stack);
    }

    const result: EncryptionHealthCheck = {
      healthy,
      keyAvailable,
      keyVersion,
      keyExpiresAt,
      daysUntilExpiration,
      warnings,
      errors,
    };

    // Log health status
    if (!healthy) {
      this.logger.error(`Encryption health check failed: ${JSON.stringify(result)}`);
    } else if (warnings.length > 0) {
      this.logger.warn(`Encryption health check warnings: ${JSON.stringify(result)}`);
    } else {
      this.logger.log('Encryption health check passed');
    }

    return result;
  }

  /**
   * Quick health check (just key availability)
   *
   * @returns True if healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.keyManagement.getCurrentKeyVersion();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detailed encryption metrics
   */
  async getMetrics(): Promise<{
    currentKeyVersion: number;
    activeKeysCount: number;
    keyExpiresAt?: Date;
    daysUntilExpiration?: number;
    autoRotateEnabled: boolean;
    gracePeriodDays: number;
    auditLogCount: number;
  }> {
    const rotationStatus = await this.keyManagement.getRotationStatus();
    const activeKeys = await this.keyManagement.getActiveKeys();
    const auditLogs = this.keyManagement.getAuditLogs(100);

    return {
      currentKeyVersion: rotationStatus.currentVersion,
      activeKeysCount: activeKeys.length,
      keyExpiresAt: rotationStatus.expiresAt,
      daysUntilExpiration: rotationStatus.daysUntilExpiration,
      autoRotateEnabled: rotationStatus.autoRotateEnabled,
      gracePeriodDays: rotationStatus.gracePeriodDays,
      auditLogCount: auditLogs.length,
    };
  }
}
