import { StorageProvider } from './StorageProvider.js';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * WasabiS3Provider - Real Wasabi cloud storage implementation
 *
 * To activate this provider:
 *
 * 1. Set the following environment variables in your .env file:
 *    STORAGE_PROVIDER=wasabi
 *    WASABI_ACCESS_KEY=your_access_key_here
 *    WASABI_SECRET_KEY=your_secret_key_here
 *    WASABI_BUCKET=your_bucket_name_here
 *    WASABI_REGION=ap-southeast-1  (or your preferred region)
 *
 * 2. Update server/index.js to use this provider when STORAGE_PROVIDER === 'wasabi'
 *
 * 3. Ensure your Wasabi bucket is created and accessible
 *
 * 4. Test the connection before deploying to production
 *
 * Supported Wasabi regions:
 * - us-east-1 (Virginia)
 * - us-east-2 (N. Virginia)
 * - us-west-1 (Oregon)
 * - eu-central-1 (Amsterdam)
 * - ap-northeast-1 (Tokyo)
 * - ap-southeast-1 (Singapore)
 */

export class WasabiS3Provider extends StorageProvider {
  constructor() {
    super();

    if (!process.env.WASABI_ACCESS_KEY || !process.env.WASABI_SECRET_KEY) {
      throw new Error('Wasabi credentials not configured. Set WASABI_ACCESS_KEY and WASABI_SECRET_KEY.');
    }

    if (!process.env.WASABI_BUCKET) {
      throw new Error('Wasabi bucket not configured. Set WASABI_BUCKET.');
    }

    const region = process.env.WASABI_REGION || 'ap-southeast-1';

    this.client = new S3Client({
      region,
      endpoint: `https://s3.${region}.wasabisys.com`,
      credentials: {
        accessKeyId: process.env.WASABI_ACCESS_KEY,
        secretAccessKey: process.env.WASABI_SECRET_KEY
      }
    });

    this.bucket = process.env.WASABI_BUCKET;

    console.log(`[WASABI S3] Initialized with bucket: ${this.bucket}, region: ${region}`);
  }

  async putObject(key, readableStream, metadata = {}) {
    console.log(`[WASABI S3] putObject: key=${key}`);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: readableStream,
      Metadata: metadata
    });

    const response = await this.client.send(command);

    console.log(`[WASABI S3] putObject complete: ${key}`);

    return { key, etag: response.ETag };
  }

  async getObjectUrl(key, expirySeconds = 3600) {
    console.log(`[WASABI S3] getObjectUrl: key=${key}, expiry=${expirySeconds}s`);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: expirySeconds });

    console.log(`[WASABI S3] getObjectUrl complete: ${key}`);

    return url;
  }

  async deleteObject(key) {
    console.log(`[WASABI S3] deleteObject: key=${key}`);

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    await this.client.send(command);

    console.log(`[WASABI S3] deleteObject complete: ${key}`);
  }

  async listObjects(prefix = '') {
    console.log(`[WASABI S3] listObjects: prefix=${prefix}`);

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix
    });

    const response = await this.client.send(command);

    const objects = (response.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified
    }));

    console.log(`[WASABI S3] listObjects complete: found ${objects.length} objects`);

    return objects;
  }

  async headObject(key) {
    console.log(`[WASABI S3] headObject: key=${key}`);

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const response = await this.client.send(command);

    console.log(`[WASABI S3] headObject complete: ${key}`);

    return {
      key,
      size: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata || {}
    };
  }
}
