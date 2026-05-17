import * as crypto from 'crypto';

const TOKEN_ENCRYPTION_PREFIX = 'enc:v1';

function deriveKey(keySource: string): Buffer {
  return crypto.createHash('sha256').update(keySource, 'utf-8').digest();
}

export function fingerprintCloudPaymentsToken(token: string): string {
  return crypto.createHash('md5').update(token, 'utf-8').digest('hex');
}

export function encryptCloudPaymentsToken(token: string, keySource: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(keySource), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    TOKEN_ENCRYPTION_PREFIX,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptCloudPaymentsToken(value: string, keySource: string): string {
  if (!value.startsWith(`${TOKEN_ENCRYPTION_PREFIX}:`)) {
    return value;
  }

  const [, ivBase64, authTagBase64, encryptedBase64] = value.split(':');
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error('Invalid encrypted CloudPayments token payload');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveKey(keySource),
    Buffer.from(ivBase64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]).toString('utf-8');
}
