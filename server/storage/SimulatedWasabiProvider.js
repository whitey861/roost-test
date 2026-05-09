import { StorageProvider } from './StorageProvider.js';
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

export class SimulatedWasabiProvider extends StorageProvider {
  constructor(storagePath = './simulated_storage') {
    super();
    this.storagePath = storagePath;
    this.ensureStorageDir();
  }

  async ensureStorageDir() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
    } catch (err) {
      console.error('Failed to create storage directory:', err);
    }
  }

  async putObject(key, readableStream, metadata = {}) {
    console.log(`[SIMULATED WASABI] putObject: key=${key}, metadata=${JSON.stringify(metadata)}`);

    const filePath = path.join(this.storagePath, key);
    const dirPath = path.dirname(filePath);

    await fs.mkdir(dirPath, { recursive: true });

    const writeStream = createWriteStream(filePath);
    await pipeline(readableStream, writeStream);

    // Store metadata alongside
    const metadataPath = `${filePath}.meta.json`;
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`[SIMULATED WASABI] putObject complete: ${key}`);

    return { key, size: (await fs.stat(filePath)).size };
  }

  async getObjectUrl(key, expirySeconds = 3600) {
    console.log(`[SIMULATED WASABI] getObjectUrl: key=${key}, expiry=${expirySeconds}s`);

    const filePath = path.join(this.storagePath, key);

    try {
      await fs.access(filePath);
      // Return a simulated download URL
      const url = `/api/storage/download/${encodeURIComponent(key)}`;
      console.log(`[SIMULATED WASABI] getObjectUrl complete: ${url}`);
      return url;
    } catch (err) {
      throw new Error(`Object not found: ${key}`);
    }
  }

  async deleteObject(key) {
    console.log(`[SIMULATED WASABI] deleteObject: key=${key}`);

    const filePath = path.join(this.storagePath, key);
    const metadataPath = `${filePath}.meta.json`;

    try {
      await fs.unlink(filePath);
      await fs.unlink(metadataPath).catch(() => {}); // Ignore if metadata doesn't exist
      console.log(`[SIMULATED WASABI] deleteObject complete: ${key}`);
    } catch (err) {
      console.error(`[SIMULATED WASABI] deleteObject failed:`, err);
      throw err;
    }
  }

  async listObjects(prefix = '') {
    console.log(`[SIMULATED WASABI] listObjects: prefix=${prefix}`);

    const searchPath = path.join(this.storagePath, prefix);
    const objects = [];

    try {
      const files = await this.walkDir(searchPath);

      for (const file of files) {
        if (!file.endsWith('.meta.json')) {
          const stats = await fs.stat(file);
          const key = path.relative(this.storagePath, file);

          objects.push({
            key,
            size: stats.size,
            lastModified: stats.mtime
          });
        }
      }

      console.log(`[SIMULATED WASABI] listObjects complete: found ${objects.length} objects`);
      return objects;
    } catch (err) {
      console.error(`[SIMULATED WASABI] listObjects failed:`, err);
      return [];
    }
  }

  async headObject(key) {
    console.log(`[SIMULATED WASABI] headObject: key=${key}`);

    const filePath = path.join(this.storagePath, key);

    try {
      const stats = await fs.stat(filePath);
      const metadataPath = `${filePath}.meta.json`;

      let metadata = {};
      try {
        const metaContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metaContent);
      } catch (err) {
        // Metadata file might not exist
      }

      console.log(`[SIMULATED WASABI] headObject complete: ${key}`);

      return {
        key,
        size: stats.size,
        lastModified: stats.mtime,
        metadata
      };
    } catch (err) {
      throw new Error(`Object not found: ${key}`);
    }
  }

  async walkDir(dir) {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...await this.walkDir(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Directory might not exist yet
    }

    return files;
  }

  // Helper method for simulated downloads
  async getObjectStream(key) {
    const filePath = path.join(this.storagePath, key);
    return createReadStream(filePath);
  }
}
