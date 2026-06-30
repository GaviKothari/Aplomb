import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('r2.bucketName') ?? 'aplomb-media';
    this.publicUrl = config.get<string>('r2.publicUrl') ?? '';

    const endpoint = config.get<string>('r2.endpoint');
    const accessKeyId = config.get<string>('r2.accessKeyId') ?? '';
    this.logger.log(`R2 init — endpoint: ${endpoint}, bucket: ${this.bucket}, hasKey: ${!!accessKeyId}`);

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true, // R2 requires path-style; virtual-hosted causes SSL mismatch
      credentials: {
        accessKeyId,
        secretAccessKey: config.get<string>('r2.secretAccessKey') ?? '',
      },
    });
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return key;
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.warn(`Failed to delete object ${key}: ${err.message}`);
    }
  }
}
