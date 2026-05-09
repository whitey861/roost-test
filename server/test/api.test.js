import { test } from 'node:test';
import assert from 'node:assert';

test('server modules load correctly', async () => {
  // Test that core modules can be imported
  const { query } = await import('../db/index.js');
  const { createStorageProvider } = await import('../storage/index.js');

  assert.ok(query, 'Database query function should exist');
  assert.ok(createStorageProvider, 'Storage provider factory should exist');
});

test('storage provider can be created', async () => {
  const { createStorageProvider } = await import('../storage/index.js');

  const provider = createStorageProvider();
  assert.ok(provider, 'Storage provider should be created');
  assert.ok(provider.putObject, 'Provider should have putObject method');
  assert.ok(provider.getObjectUrl, 'Provider should have getObjectUrl method');
});

console.log('Basic smoke tests passed!');
