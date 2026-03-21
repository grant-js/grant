import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Fixed salt for scrypt — binds derived keys to this purpose (not a secret).
 * Replaces single-pass SHA-256 (flagged by CodeQL as weak password hashing) for key derivation.
 */
const MFA_KDF_SALT = Buffer.from('grant-platform:mfa-secret-encryption:v1', 'utf8');

/** Derive a 32-byte AES-256 key from `AUTH_MFA_SECRET_ENCRYPTION_KEY` using scrypt. */
function deriveMfaAesKey(keyMaterial: string): Buffer {
  return crypto.scryptSync(keyMaterial, MFA_KDF_SALT, 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}

/** Legacy key material (pre–scrypt); kept only for decrypting existing rows. */
function legacySha256MfaKey(keyMaterial: string): Buffer {
  return crypto.createHash('sha256').update(keyMaterial).digest();
}

function decryptMfaSecretWithKey(
  params: {
    encryptedSecret: string;
    secretIv: string;
    secretTag: string;
  },
  aesKey: Buffer
): string {
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

export function generateTotpSecret(bytes: number = 20): string {
  const buffer = crypto.randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(input: string): Buffer {
  const normalized = input
    .replace(/=+$/g, '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const c of normalized) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function buildOtpauthUrl(params: {
  issuer: string;
  accountName: string;
  secret: string;
}): string {
  const issuer = encodeURIComponent(params.issuer);
  const accountName = encodeURIComponent(params.accountName);
  const secret = encodeURIComponent(params.secret);
  return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export function verifyTotpCode(params: {
  secret: string;
  code: string;
  periodSeconds: number;
  window: number;
  now?: number;
}): boolean {
  const { secret, periodSeconds, window } = params;
  const code = params.code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return false;

  const key = decodeBase32(secret);
  const now = params.now ?? Date.now();
  const counter = Math.floor(now / 1000 / periodSeconds);

  for (let i = -window; i <= window; i++) {
    const c = counter + i;
    const msg = Buffer.alloc(8);
    msg.writeUInt32BE(Math.floor(c / 0x100000000), 0);
    msg.writeUInt32BE(c & 0xffffffff, 4);
    const hmac = crypto.createHmac('sha1', key).update(msg).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const binary =
      ((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff);
    const generated = (binary % 1_000_000).toString().padStart(6, '0');
    if (generated === code) return true;
  }
  return false;
}

export function encryptMfaSecret(
  secret: string,
  key: string
): {
  encryptedSecret: string;
  secretIv: string;
  secretTag: string;
} {
  const normalizedKey = deriveMfaAesKey(key);
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

export function decryptMfaSecret(params: {
  encryptedSecret: string;
  secretIv: string;
  secretTag: string;
  key: string;
}): string {
  try {
    return decryptMfaSecretWithKey(params, deriveMfaAesKey(params.key));
  } catch {
    return decryptMfaSecretWithKey(params, legacySha256MfaKey(params.key));
  }
}
