import crypto from 'crypto';
import { describe, expect, it } from 'vitest';

import {
  decryptMfaSecret,
  encryptMfaSecret,
  generateTotpSecret,
  verifyTotpCode,
} from '@/lib/mfa.lib';

describe('mfa.lib', () => {
  it('encrypts and decrypts MFA secret', () => {
    const key = 'test-mfa-encryption-key';
    const secret = generateTotpSecret();
    const encrypted = encryptMfaSecret(secret, key);
    const decrypted = decryptMfaSecret({ ...encrypted, key });
    expect(decrypted).toBe(secret);
  });

  it('decrypts legacy SHA256-derived ciphertext (migration)', () => {
    const key = 'test-mfa-encryption-key';
    const secret = 'LEGACYSECRET';
    const normalizedKey = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', normalizedKey, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const decrypted = decryptMfaSecret({
      key,
      encryptedSecret: encrypted.toString('base64'),
      secretIv: iv.toString('base64'),
      secretTag: tag.toString('base64'),
    });
    expect(decrypted).toBe(secret);
  });

  it('rejects invalid TOTP code format', () => {
    const secret = generateTotpSecret();
    const isValid = verifyTotpCode({
      secret,
      code: 'abc123',
      periodSeconds: 30,
      window: 1,
      now: Date.now(),
    });
    expect(isValid).toBe(false);
  });
});
