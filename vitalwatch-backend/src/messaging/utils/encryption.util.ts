import * as crypto from 'crypto';

export interface EncryptedData {
  encryptedContent: string;
  iv: string;
  authTag: string;
}

export class EncryptionUtil {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32; // 256 bits

  /**
   * Generates a secure encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('base64');
  }

  /**
   * Encrypts content using AES-256-GCM
   * @param content - The content to encrypt
   * @param key - The encryption key (base64 encoded)
   * @returns Encrypted data with IV and auth tag
   */
  static encrypt(content: string, key: string): EncryptedData {
    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(16);

      // Convert base64 key to buffer
      const keyBuffer = Buffer.from(key, 'base64');

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, keyBuffer, iv);

      // Encrypt the content
      let encrypted = cipher.update(content, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      return {
        encryptedContent: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts content using AES-256-GCM
   * @param encryptedData - The encrypted data object
   * @param key - The encryption key (base64 encoded)
   * @returns Decrypted content
   */
  static decrypt(encryptedData: EncryptedData, key: string): string {
    try {
      // Convert base64 strings to buffers
      const keyBuffer = Buffer.from(key, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, keyBuffer, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the content
      let decrypted = decipher.update(encryptedData.encryptedContent, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hashes content using SHA-256 for searching
   * @param content - Content to hash
   * @returns Hashed content
   */
  static hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generates a secure random token
   * @param length - Token length in bytes
   * @returns Random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derives a key from a master key and conversation ID
   * Used for per-conversation encryption keys
   * @param masterKey - Master encryption key
   * @param conversationId - Conversation ID
   * @returns Derived key
   */
  static deriveKey(masterKey: string, conversationId: string): string {
    const masterKeyBuffer = Buffer.from(masterKey, 'base64');
    const salt = Buffer.from(conversationId);

    // Use PBKDF2 for key derivation
    const derivedKey = crypto.pbkdf2Sync(
      masterKeyBuffer,
      salt,
      100000,
      this.keyLength,
      'sha256',
    );

    return derivedKey.toString('base64');
  }

  /**
   * Encrypts a file buffer
   * @param fileBuffer - File buffer to encrypt
   * @param key - Encryption key
   * @returns Encrypted file data
   */
  static encryptFile(fileBuffer: Buffer, key: string): EncryptedData {
    try {
      const iv = crypto.randomBytes(16);
      const keyBuffer = Buffer.from(key, 'base64');
      const cipher = crypto.createCipheriv(this.algorithm, keyBuffer, iv);

      const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return {
        encryptedContent: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      };
    } catch (error) {
      throw new Error(`File encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts a file buffer
   * @param encryptedData - Encrypted file data
   * @param key - Encryption key
   * @returns Decrypted file buffer
   */
  static decryptFile(encryptedData: EncryptedData, key: string): Buffer {
    try {
      const keyBuffer = Buffer.from(key, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      const encrypted = Buffer.from(encryptedData.encryptedContent, 'base64');

      const decipher = crypto.createDecipheriv(this.algorithm, keyBuffer, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch (error) {
      throw new Error(`File decryption failed: ${error.message}`);
    }
  }
}
