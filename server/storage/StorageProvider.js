// Abstract storage provider interface
export class StorageProvider {
  async putObject(key, readableStream, metadata) {
    throw new Error('putObject must be implemented');
  }

  async getObjectUrl(key, expirySeconds = 3600) {
    throw new Error('getObjectUrl must be implemented');
  }

  async deleteObject(key) {
    throw new Error('deleteObject must be implemented');
  }

  async listObjects(prefix) {
    throw new Error('listObjects must be implemented');
  }

  async headObject(key) {
    throw new Error('headObject must be implemented');
  }
}
