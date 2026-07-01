import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as https from 'https';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? path.join(os.tmpdir(), 'aplomb-uploads');

@Injectable()
export class StorageService {
  private readonly s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly useLocal: boolean;
  private readonly logger = new Logger(StorageService.name);

  constructor(config: ConfigService) {
    this.bucket    = config.get<string>('r2.bucketName') ?? 'aplomb-media';
    this.publicUrl = config.get<string>('r2.publicUrl') ?? '';

    const accountId       = config.get<string>('r2.accountId')       ?? '';
    const accessKeyId     = config.get<string>('r2.accessKeyId')     ?? '';
    const secretAccessKey = config.get<string>('r2.secretAccessKey') ?? '';
    const endpoint        = config.get<string>('r2.endpoint')
                         ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

    const r2Ready = !!(accountId && accessKeyId && secretAccessKey && endpoint && !endpoint.includes('undefined'));

    if (r2Ready) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { NodeHttpHandler } = require('@smithy/node-http-handler') as any;
      const httpsAgent = new https.Agent({ minVersion: 'TLSv1.2', maxVersion: 'TLSv1.3' });

      this.s3 = new S3Client({
        region: 'auto',
        endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
        requestHandler: new NodeHttpHandler({ httpsAgent }),
      });

      this.useLocal = false;
      this.logger.log(`[Storage] R2 ready — endpoint: ${endpoint}, bucket: ${this.bucket}`);
    } else {
      this.useLocal = true;
      this.logger.warn(
        `[Storage] R2 not configured (accountId=${accountId || 'MISSING'}, hasKey=${!!accessKeyId}). ` +
        `Falling back to local disk: ${LOCAL_UPLOAD_DIR}`,
      );
      // Ensure local upload directory exists
      fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true }).catch(() => {});
    }
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.useLocal || !this.s3) {
      return this.localWrite(key, buffer);
    }
    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }));
      return key;
    } catch (err: any) {
      this.logger.error(`[Storage] R2 upload failed for ${key}: ${err.message}. Falling back to local.`);
      return this.localWrite(key, buffer);
    }
  }

  getPublicUrl(key: string): string {
    if (this.useLocal || !this.publicUrl) {
      return `/uploads/${key}`;
    }
    return `${this.publicUrl}/${key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.useLocal || !this.s3) {
      return `/uploads/${key}`;
    }
    try {
      return await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn },
      );
    } catch (err: any) {
      this.logger.warn(`[Storage] getSignedUrl failed: ${err.message}`);
      return `/uploads/${key}`;
    }
  }

  async downloadBuffer(key: string): Promise<Buffer | null> {
    if (this.useLocal || !this.s3) {
      return this.localRead(key);
    }
    try {
      const res    = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const stream = res.Body as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (err: any) {
      this.logger.warn(`[Storage] R2 download failed for ${key}: ${err.message}. Trying local.`);
      return this.localRead(key);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.useLocal && this.s3) {
      try {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } catch (err: any) {
        this.logger.warn(`[Storage] R2 delete failed for ${key}: ${err.message}`);
      }
    }
    // Also clean up local copy if it exists
    const localPath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, path.sep));
    await fs.unlink(localPath).catch(() => {});
  }

  // ── Local disk helpers ────────────────────────────────────────────────────

  private async localWrite(key: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, path.sep));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    this.logger.log(`[Storage] Saved locally: ${filePath}`);
    return key;
  }

  private async localRead(key: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(LOCAL_UPLOAD_DIR, key.replace(/\//g, path.sep));
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }
}
