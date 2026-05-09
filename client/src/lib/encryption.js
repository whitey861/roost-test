// Web Crypto API encryption utilities

export async function generateEncryptionKey(password) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Derive key from password using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exportedKey = await crypto.subtle.exportKey('raw', key);

  return {
    key,
    salt: Array.from(salt),
    keyBytes: Array.from(new Uint8Array(exportedKey))
  };
}

export async function encryptChunk(chunk, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    chunk
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return result;
}

export async function importKey(keyBytes) {
  return await crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyBytes),
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function calculateChecksum(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const ENCRYPTION_OPTIONS = {
  none: {
    value: 'none',
    label: 'No Encryption',
    description: 'Your files are uploaded as-is. Wasabi is a reputable provider but your data is readable by anyone with bucket access. Good for non-sensitive content.'
  },
  aes256_local: {
    value: 'aes256_local',
    label: 'AES-256 Local Key',
    description: 'Files are encrypted on your machine before upload using a password you provide. Only you can decrypt them — if you lose the password, the files are unrecoverable. Best for sensitive data where you control the key.'
  },
  aes256_escrow: {
    value: 'aes256_escrow',
    label: 'AES-256 with Key Escrow',
    description: 'Files are encrypted before upload and your encryption key is stored on the VaultSync server, protected by your password. You can recover files even if you forget your local password by contacting your admin. Good balance of security and recoverability.'
  }
};
