import { createHash } from 'node:crypto';

/**
 * Change detector: the lowercase hex SHA-256 of a string.
 *
 * Password credential: the input is the stored bcrypt hash string, computed on read, never
 * stored, never given the password. bcrypt output is not recoverable from its digest.
 *
 * API-key secret: the input is the secret string as issued (the 43- or 88-character text the
 * client receives), never the bcrypt hash; stored in `api_keys.client_secret_fingerprint`
 * because the plaintext is in hand only at create, rotate and CDM import. Grant issues secrets
 * of 32 or 64 random bytes, so an unsalted digest of one cannot be guessed offline. An
 * importer-chosen secret is only as strong as the importer made it.
 *
 * Neither is a secret, but both are only ever returned to a caller holding
 * `ProjectUser:ExportCredentials`.
 */
export function credentialFingerprint(hash: string): string {
  return createHash('sha256').update(hash, 'utf8').digest('hex');
}
