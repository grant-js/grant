import crypto from 'crypto';

/**
 * KDF purpose of the BYO OAuth connection secrets, byte for byte what
 * `project-oauth-connection.lib.ts` has always used as its scrypt salt. Must not reuse the MFA
 * purpose string (`grant-platform:mfa-secret-encryption:v1`).
 */
export const PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE =
  'grant-platform:project-oauth-connection-secret-encryption:v1';

/** KDF purpose of the exportable copy of a project user's API-key secret. */
export const API_KEY_EXPORTABLE_SECRET_PURPOSE =
  'grant-platform:api-key-exportable-secret-encryption:v1';

export interface SealedSecret {
  encryptedSecret: string;
  secretIv: string;
  secretTag: string;
}

/**
 * The purpose is the scrypt salt, so a key derived for one purpose cannot open a secret sealed
 * for another, even under the same key material.
 */
function deriveAesKey(keyMaterial: string, purpose: string): Buffer {
  return crypto.scryptSync(keyMaterial, Buffer.from(purpose, 'utf8'), 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}

/** AES-256-GCM, 12-byte random IV, output as three base64 strings. */
export function sealSecret(plaintext: string, keyMaterial: string, purpose: string): SealedSecret {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveAesKey(keyMaterial, purpose), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encryptedSecret: encrypted.toString('base64'),
    secretIv: iv.toString('base64'),
    secretTag: cipher.getAuthTag().toString('base64'),
  };
}

/** Throws when the key material, the purpose or the stored triple do not match what sealed it. */
export function unsealSecret(sealed: SealedSecret, keyMaterial: string, purpose: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveAesKey(keyMaterial, purpose),
    Buffer.from(sealed.secretIv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(sealed.secretTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(sealed.encryptedSecret, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
