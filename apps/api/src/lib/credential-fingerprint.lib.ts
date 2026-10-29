import { createHash } from 'node:crypto';

/**
 * Change detector for a stored credential hash: the lowercase hex SHA-256 of the hash
 * string. Computed on read, never stored, never given the password. bcrypt output is not
 * recoverable from its digest, so the value is not a secret, but it is only ever returned
 * to a caller holding `ProjectUser:ExportCredentials`.
 */
export function credentialFingerprint(hash: string): string {
  return createHash('sha256').update(hash, 'utf8').digest('hex');
}
