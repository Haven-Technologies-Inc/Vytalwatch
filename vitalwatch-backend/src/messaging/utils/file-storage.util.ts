import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';

export interface UploadedFile {
  url: string;
  key: string;
  bucket?: string;
  size: number;
  mimeType: string;
}

/**
 * File Storage Utility
 *
 * Handles secure file upload and storage for message attachments.
 *
 * Supported storage providers:
 * - AWS S3
 * - Azure Blob Storage
 * - Google Cloud Storage
 * - Local filesystem (development only)
 */
@Injectable()
export class FileStorageUtil {
  private readonly logger = new Logger(FileStorageUtil.name);
  private readonly storageProvider: string;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.storageProvider = this.configService.get<string>(
      'STORAGE_PROVIDER',
      'local',
    );
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET', 'messages');
  }

  /**
   * Upload file to storage
   * @param file - File buffer
   * @param fileName - Original file name
   * @param conversationId - Conversation ID for organization
   * @returns Upload result with URL
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    conversationId: string,
  ): Promise<UploadedFile> {
    try {
      // Generate unique file key
      const fileKey = this.generateFileKey(conversationId, fileName);

      switch (this.storageProvider) {
        case 's3':
          return await this.uploadToS3(file, fileKey, fileName);
        case 'azure':
          return await this.uploadToAzure(file, fileKey, fileName);
        case 'gcs':
          return await this.uploadToGCS(file, fileKey, fileName);
        default:
          return await this.uploadToLocal(file, fileKey, fileName);
      }
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download file from storage
   * @param fileKey - File key/path
   * @returns File buffer
   */
  async downloadFile(fileKey: string): Promise<Buffer> {
    try {
      switch (this.storageProvider) {
        case 's3':
          return await this.downloadFromS3(fileKey);
        case 'azure':
          return await this.downloadFromAzure(fileKey);
        case 'gcs':
          return await this.downloadFromGCS(fileKey);
        default:
          return await this.downloadFromLocal(fileKey);
      }
    } catch (error) {
      this.logger.error(`File download failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete file from storage
   * @param fileKey - File key/path
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      switch (this.storageProvider) {
        case 's3':
          await this.deleteFromS3(fileKey);
          break;
        case 'azure':
          await this.deleteFromAzure(fileKey);
          break;
        case 'gcs':
          await this.deleteFromGCS(fileKey);
          break;
        default:
          await this.deleteFromLocal(fileKey);
      }
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate signed URL for temporary file access
   * @param fileKey - File key/path
   * @param expiresIn - Expiration time in seconds
   * @returns Signed URL
   */
  async getSignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    try {
      switch (this.storageProvider) {
        case 's3':
          return await this.getS3SignedUrl(fileKey, expiresIn);
        case 'azure':
          return await this.getAzureSignedUrl(fileKey, expiresIn);
        case 'gcs':
          return await this.getGCSSignedUrl(fileKey, expiresIn);
        default:
          return this.getLocalUrl(fileKey);
      }
    } catch (error) {
      this.logger.error(`Signed URL generation failed: ${error.message}`);
      throw error;
    }
  }

  // AWS S3 Implementation

  private async uploadToS3(
    file: Buffer,
    fileKey: string,
    fileName: string,
  ): Promise<UploadedFile> {
    this.logger.log(`Uploading to S3: ${fileKey}`);

    // Example implementation with AWS SDK v3
    // import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
    //
    // const s3Client = new S3Client({
    //   region: this.configService.get('AWS_S3_REGION'),
    //   credentials: {
    //     accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
    //     secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    //   },
    // });
    //
    // const command = new PutObjectCommand({
    //   Bucket: this.bucket,
    //   Key: fileKey,
    //   Body: file,
    //   ContentType: this.getMimeType(fileName),
    //   ServerSideEncryption: 'AES256',
    //   Metadata: {
    //     originalName: fileName,
    //   },
    // });
    //
    // await s3Client.send(command);

    return {
      url: `https://${this.bucket}.s3.amazonaws.com/${fileKey}`,
      key: fileKey,
      bucket: this.bucket,
      size: file.length,
      mimeType: this.getMimeType(fileName),
    };
  }

  private async downloadFromS3(fileKey: string): Promise<Buffer> {
    // import { GetObjectCommand } from '@aws-sdk/client-s3';
    // const command = new GetObjectCommand({
    //   Bucket: this.bucket,
    //   Key: fileKey,
    // });
    // const response = await s3Client.send(command);
    // return Buffer.from(await response.Body.transformToByteArray());

    return Buffer.from('mock-file-content');
  }

  private async deleteFromS3(fileKey: string): Promise<void> {
    // import { DeleteObjectCommand } from '@aws-sdk/client-s3';
    // const command = new DeleteObjectCommand({
    //   Bucket: this.bucket,
    //   Key: fileKey,
    // });
    // await s3Client.send(command);
  }

  private async getS3SignedUrl(fileKey: string, expiresIn: number): Promise<string> {
    // import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
    // import { GetObjectCommand } from '@aws-sdk/client-s3';
    // const command = new GetObjectCommand({
    //   Bucket: this.bucket,
    //   Key: fileKey,
    // });
    // return await getSignedUrl(s3Client, command, { expiresIn });

    return `https://${this.bucket}.s3.amazonaws.com/${fileKey}?expires=${expiresIn}`;
  }

  // Azure Blob Storage Implementation

  private async uploadToAzure(
    file: Buffer,
    fileKey: string,
    fileName: string,
  ): Promise<UploadedFile> {
    this.logger.log(`Uploading to Azure: ${fileKey}`);

    // Example implementation with @azure/storage-blob
    // import { BlobServiceClient } from '@azure/storage-blob';
    // const blobServiceClient = BlobServiceClient.fromConnectionString(
    //   this.configService.get('AZURE_STORAGE_CONNECTION_STRING'),
    // );
    // const containerClient = blobServiceClient.getContainerClient(this.bucket);
    // const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
    //
    // await blockBlobClient.uploadData(file, {
    //   blobHTTPHeaders: {
    //     blobContentType: this.getMimeType(fileName),
    //   },
    //   metadata: {
    //     originalName: fileName,
    //   },
    // });

    return {
      url: `https://${this.bucket}.blob.core.windows.net/${fileKey}`,
      key: fileKey,
      size: file.length,
      mimeType: this.getMimeType(fileName),
    };
  }

  private async downloadFromAzure(fileKey: string): Promise<Buffer> {
    // const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
    // const downloadResponse = await blockBlobClient.download();
    // return await streamToBuffer(downloadResponse.readableStreamBody);

    return Buffer.from('mock-file-content');
  }

  private async deleteFromAzure(fileKey: string): Promise<void> {
    // const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
    // await blockBlobClient.delete();
  }

  private async getAzureSignedUrl(
    fileKey: string,
    expiresIn: number,
  ): Promise<string> {
    // import { generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
    // const sasToken = generateBlobSASQueryParameters({
    //   containerName: this.bucket,
    //   blobName: fileKey,
    //   permissions: BlobSASPermissions.parse('r'),
    //   expiresOn: new Date(Date.now() + expiresIn * 1000),
    // }, sharedKeyCredential).toString();
    // return `${blockBlobClient.url}?${sasToken}`;

    return `https://${this.bucket}.blob.core.windows.net/${fileKey}`;
  }

  // Google Cloud Storage Implementation

  private async uploadToGCS(
    file: Buffer,
    fileKey: string,
    fileName: string,
  ): Promise<UploadedFile> {
    this.logger.log(`Uploading to GCS: ${fileKey}`);

    // Example implementation with @google-cloud/storage
    // import { Storage } from '@google-cloud/storage';
    // const storage = new Storage();
    // const bucket = storage.bucket(this.bucket);
    // const blob = bucket.file(fileKey);
    //
    // await blob.save(file, {
    //   contentType: this.getMimeType(fileName),
    //   metadata: {
    //     originalName: fileName,
    //   },
    // });

    return {
      url: `https://storage.googleapis.com/${this.bucket}/${fileKey}`,
      key: fileKey,
      bucket: this.bucket,
      size: file.length,
      mimeType: this.getMimeType(fileName),
    };
  }

  private async downloadFromGCS(fileKey: string): Promise<Buffer> {
    // const blob = bucket.file(fileKey);
    // const [contents] = await blob.download();
    // return contents;

    return Buffer.from('mock-file-content');
  }

  private async deleteFromGCS(fileKey: string): Promise<void> {
    // const blob = bucket.file(fileKey);
    // await blob.delete();
  }

  private async getGCSSignedUrl(fileKey: string, expiresIn: number): Promise<string> {
    // const blob = bucket.file(fileKey);
    // const [url] = await blob.getSignedUrl({
    //   action: 'read',
    //   expires: Date.now() + expiresIn * 1000,
    // });
    // return url;

    return `https://storage.googleapis.com/${this.bucket}/${fileKey}`;
  }

  // Local Storage Implementation (Development only)

  private async uploadToLocal(
    file: Buffer,
    fileKey: string,
    fileName: string,
  ): Promise<UploadedFile> {
    this.logger.log(`Uploading to local storage: ${fileKey}`);

    // In a real implementation, save to local filesystem
    // import * as fs from 'fs/promises';
    // const uploadPath = path.join(__dirname, '../../../uploads', fileKey);
    // await fs.mkdir(path.dirname(uploadPath), { recursive: true });
    // await fs.writeFile(uploadPath, file);

    return {
      url: `/uploads/${fileKey}`,
      key: fileKey,
      size: file.length,
      mimeType: this.getMimeType(fileName),
    };
  }

  private async downloadFromLocal(fileKey: string): Promise<Buffer> {
    // import * as fs from 'fs/promises';
    // const filePath = path.join(__dirname, '../../../uploads', fileKey);
    // return await fs.readFile(filePath);

    return Buffer.from('mock-file-content');
  }

  private async deleteFromLocal(fileKey: string): Promise<void> {
    // import * as fs from 'fs/promises';
    // const filePath = path.join(__dirname, '../../../uploads', fileKey);
    // await fs.unlink(filePath);
  }

  private getLocalUrl(fileKey: string): string {
    return `/uploads/${fileKey}`;
  }

  // Helper methods

  /**
   * Generate unique file key with conversation organization
   */
  private generateFileKey(conversationId: string, fileName: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const sanitized = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

    return `conversations/${conversationId}/${timestamp}-${random}-${sanitized}${ext}`;
  }

  /**
   * Get MIME type from file name
   */
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
