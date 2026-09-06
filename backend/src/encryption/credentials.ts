import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ENCODING = 'base64';

let masterKey: Buffer | null = null;

export function getMasterKey(): Buffer {
  if (masterKey) return masterKey;

  const keyB64 = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY not set in environment');
  }

  masterKey = Buffer.from(keyB64, 'base64');
  
  if (masterKey.length !== KEY_LENGTH) {
    throw new Error(`Invalid encryption key length: expected ${KEY_LENGTH} bytes, got ${masterKey.length}`);
  }

  return masterKey;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
}

export interface DecryptedData {
  roomId: string;
  password: string;
}

export function encryptCredential(plaintext: string, version = 1): EncryptedData {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  // AAD includes version for key rotation support
  const aad = Buffer.from(`v${version}`);
  cipher.setAAD(aad);
  
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext: ciphertext.toString(ENCODING),
    iv: iv.toString(ENCODING),
    authTag: authTag.toString(ENCODING),
    version,
  };
}

export function decryptCredential(encrypted: EncryptedData): string {
  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(encrypted.iv, ENCODING),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  
  const aad = Buffer.from(`v${encrypted.version}`);
  decipher.setAAD(aad);
  decipher.setAuthTag(Buffer.from(encrypted.authTag, ENCODING));
  
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, ENCODING)),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

export function encryptRoomCredentials(roomId: string, password: string, version = 1): {
  roomIdEncrypted: EncryptedData;
  passwordEncrypted: EncryptedData;
} {
  return {
    roomIdEncrypted: encryptCredential(roomId, version),
    passwordEncrypted: encryptCredential(password, version),
  };
}

export function decryptRoomCredentials(
  roomIdEncrypted: EncryptedData,
  passwordEncrypted: EncryptedData
): DecryptedData {
  return {
    roomId: decryptCredential(roomIdEncrypted),
    password: decryptCredential(passwordEncrypted),
  };
}

export function serializeEncryptedData(encrypted: EncryptedData): string {
  return JSON.stringify(encrypted);
}

export function parseEncryptedData(serialized: string): EncryptedData {
  const parsed = JSON.parse(serialized);
  if (!parsed.ciphertext || !parsed.iv || !parsed.authTag || typeof parsed.version !== 'number') {
    throw new Error('Invalid encrypted data format');
  }
  return parsed;
}

export function combineEncryptedForStorage(roomIdEnc: EncryptedData, passwordEnc: EncryptedData): string {
  return JSON.stringify({
    room_id: roomIdEnc,
    password: passwordEnc,
  });
}

export function splitEncryptedFromStorage(stored: string): {
  roomIdEncrypted: EncryptedData;
  passwordEncrypted: EncryptedData;
} {
  const parsed = JSON.parse(stored);
  return {
    roomIdEncrypted: parsed.room_id,
    passwordEncrypted: parsed.password,
  };
}

export function clearKeyFromMemory(): void {
  if (masterKey) {
    masterKey.fill(0);
    masterKey = null;
  }
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}