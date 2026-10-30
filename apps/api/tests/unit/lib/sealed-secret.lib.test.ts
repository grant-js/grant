import crypto from 'crypto';
import { describe, expect, it } from 'vitest';

import {
  decryptProjectOAuthConnectionSecret,
  encryptProjectOAuthConnectionSecret,
} from '@/lib/project-oauth-connection.lib';
import {
  API_KEY_EXPORTABLE_SECRET_PURPOSE,
  PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE,
  sealSecret,
  unsealSecret,
} from '@/lib/sealed-secret.lib';

const KEY_MATERIAL = 'test-sealed-secret-key-material';
const SECRET = 'sentinel-client-secret-never-leaves-sealed-lib';

/** The primitive as `project-oauth-connection.lib.ts` had it before it was generalised. */
function legacyOAuthEncrypt(secret: string, key: string) {
  const aesKey = crypto.scryptSync(
    key,
    Buffer.from('grant-platform:project-oauth-connection-secret-encryption:v1', 'utf8'),
    32,
    { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
  );
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return {
    encryptedSecret: encrypted.toString('base64'),
    secretIv: iv.toString('base64'),
    secretTag: cipher.getAuthTag().toString('base64'),
  };
}

describe('sealed-secret.lib', () => {
  it('round-trips a secret under its purpose', () => {
    const sealed = sealSecret(SECRET, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE);

    expect(sealed.encryptedSecret).not.toContain(SECRET);
    expect(sealed.secretIv.length).toBeGreaterThan(0);
    expect(sealed.secretTag.length).toBeGreaterThan(0);
    expect(unsealSecret(sealed, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE)).toBe(SECRET);
  });

  it('uses a fresh IV per seal', () => {
    const first = sealSecret(SECRET, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE);
    const second = sealSecret(SECRET, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE);
    expect(first.secretIv).not.toBe(second.secretIv);
    expect(first.encryptedSecret).not.toBe(second.encryptedSecret);
  });

  it('does not open a secret sealed for another purpose, under the same key material', () => {
    const apiKey = sealSecret(SECRET, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE);
    const oauth = sealSecret(SECRET, KEY_MATERIAL, PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE);

    expect(() =>
      unsealSecret(apiKey, KEY_MATERIAL, PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE)
    ).toThrow();
    expect(() => unsealSecret(oauth, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE)).toThrow();
  });

  it('fails closed with other key material and with a tampered ciphertext', () => {
    const sealed = sealSecret(SECRET, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE);

    expect(() =>
      unsealSecret(sealed, 'other-key-material', API_KEY_EXPORTABLE_SECRET_PURPOSE)
    ).toThrow();

    const flipped = Buffer.from(sealed.encryptedSecret, 'base64');
    flipped[0] ^= 0xff;
    expect(() =>
      unsealSecret(
        { ...sealed, encryptedSecret: flipped.toString('base64') },
        KEY_MATERIAL,
        API_KEY_EXPORTABLE_SECRET_PURPOSE
      )
    ).toThrow();
  });

  it('keeps the two purpose strings distinct, the OAuth one byte for byte as it always was', () => {
    expect(PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE).toBe(
      'grant-platform:project-oauth-connection-secret-encryption:v1'
    );
    expect(API_KEY_EXPORTABLE_SECRET_PURPOSE).toBe(
      'grant-platform:api-key-exportable-secret-encryption:v1'
    );
  });
});

describe('project-oauth-connection.lib wrappers', () => {
  it('open what the pre-generalisation implementation sealed', () => {
    const legacy = legacyOAuthEncrypt(SECRET, KEY_MATERIAL);
    expect(decryptProjectOAuthConnectionSecret({ ...legacy, key: KEY_MATERIAL })).toBe(SECRET);
  });

  it('seal what the pre-generalisation implementation can open, in the same shape', () => {
    const sealed = encryptProjectOAuthConnectionSecret(SECRET, KEY_MATERIAL);

    expect(Object.keys(sealed).sort()).toEqual(['encryptedSecret', 'secretIv', 'secretTag']);
    expect(Buffer.from(sealed.secretIv, 'base64')).toHaveLength(12);

    const aesKey = crypto.scryptSync(
      KEY_MATERIAL,
      Buffer.from('grant-platform:project-oauth-connection-secret-encryption:v1', 'utf8'),
      32,
      { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
    );
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      aesKey,
      Buffer.from(sealed.secretIv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(sealed.secretTag, 'base64'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(sealed.encryptedSecret, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    expect(plain).toBe(SECRET);
  });

  it('do not open an API-key copy and are not opened by one', () => {
    const copy = sealSecret(SECRET, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE);
    expect(() => decryptProjectOAuthConnectionSecret({ ...copy, key: KEY_MATERIAL })).toThrow();

    const oauth = encryptProjectOAuthConnectionSecret(SECRET, KEY_MATERIAL);
    expect(() => unsealSecret(oauth, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE)).toThrow();
  });
});
