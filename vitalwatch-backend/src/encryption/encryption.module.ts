import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';
import { EncryptionHealthService } from './encryption-health.service';
import { EncryptionTransformer } from './decorators/encrypted-column.decorator';

/**
 * Encryption Module
 *
 * Provides field-level PHI encryption services throughout the application
 *
 * Features:
 * - AES-256-GCM encryption
 * - Automatic key rotation
 * - Key versioning
 * - Health monitoring
 * - HIPAA compliance
 *
 * Usage:
 * Import this module in your AppModule:
 *
 * ```typescript
 * @Module({
 *   imports: [
 *     EncryptionModule,
 *     // ... other modules
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * Then use @EncryptedColumn() decorator in your entities:
 *
 * ```typescript
 * @Entity()
 * export class User {
 *   @EncryptedColumn()
 *   ssn: string;
 *
 *   @EncryptedColumn({ columnOptions: { nullable: true } })
 *   dateOfBirth: Date;
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    KeyManagementService,
    EncryptionService,
    EncryptionHealthService,
  ],
  exports: [
    KeyManagementService,
    EncryptionService,
    EncryptionHealthService,
  ],
})
export class EncryptionModule implements OnModuleInit {
  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Initialize the encryption system when module loads
   */
  async onModuleInit() {
    // Set the encryption service instance for the transformer
    EncryptionTransformer.setEncryptionService(this.encryptionService);
  }
}
