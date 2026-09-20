import crypto from 'crypto';

/**
 * Fixed salt for scrypt — binds derived keys to BYO OAuth connection secrets.
 * Must not reuse the MFA purpose string (`grant-platform:mfa-secret-encryption:v1`).
 */
const PROJECT_OAUTH_CONNECTION_KDF_SALT = Buffer.from(
  'grant-platform:project-oauth-connection-secret-encryption:v1',
  'utf8'
);

function deriveProjectOAuthConnectionAesKey(keyMaterial: string): Buffer {
  return crypto.scryptSync(keyMaterial, PROJECT_OAUTH_CONNECTION_KDF_SALT, 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}

export function encryptProjectOAuthConnectionSecret(
  secret: string,
  key: string
): {
  encryptedSecret: string;
  secretIv: string;
  secretTag: string;
} {
  const normalizedKey = deriveProjectOAuthConnectionAesKey(key);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', normalizedKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryptedSecret: encrypted.toString('base64'),
    secretIv: iv.toString('base64'),
    secretTag: tag.toString('base64'),
  };
}

export function decryptProjectOAuthConnectionSecret(params: {
  encryptedSecret: string;
  secretIv: string;
  secretTag: string;
  key: string;
}): string {
  const aesKey = deriveProjectOAuthConnectionAesKey(params.key);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    aesKey,
    Buffer.from(params.secretIv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(params.secretTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(params.encryptedSecret, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
