import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_MIMES: Record<string, string[]> = {
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  documents: ['image/jpeg', 'image/png', 'application/pdf'],
  gallery: ['image/jpeg', 'image/png', 'image/webp'],
  services: ['image/jpeg', 'image/png', 'image/webp'],
};

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.config.get<string>('R2_ENDPOINT')!,
      credentials: {
        accessKeyId: this.config.get<string>('R2_ACCESS_KEY_ID')!,
        secretAccessKey: this.config.get<string>('R2_SECRET_ACCESS_KEY')!,
      },
    });
    this.bucket = this.config.get<string>('R2_BUCKET_NAME')!;
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL')!;
  }

  validateMime(folder: string, contentType: string): boolean {
    const allowed = ALLOWED_MIMES[folder];
    if (!allowed) return false;
    return allowed.includes(contentType);
  }

  async getUploadUrl(folder: string, filename: string, contentType: string): Promise<{
    uploadUrl: string;
    key: string;
    publicUrl: string;
  }> {
    const key = `${folder}/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return {
      uploadUrl,
      key,
      publicUrl: `${this.publicUrl}/${key}`,
    };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
