import { generateRandomBytes, hashSecret, verifySecret } from '@/lib/token.lib';

/**
 * The verifier of ADR 0011 § 1: compare a password with a credential's hash, and spend the
 * same work when there is no credential, so timing does not tell a guesser whether the
 * user has one.
 *
 * The dummy hash uses the configured cost. A stored hash keeps the cost it was written
 * with (an imported one may differ), so the match is close, not exact.
 *
 * Nothing here puts the password or a hash into a message.
 */

/** bcrypt reads 72 bytes; refusing far beyond that bounds what one sign-in can cost. */
export const MAX_PASSWORD_LENGTH = 1024;

let dummyHash: string | null = null;

function getDummyHash(): string {
  dummyHash ??= hashSecret(generateRandomBytes(16).toString('hex'));
  return dummyHash;
}

export function isAcceptablePassword(password: unknown): password is string {
  return (
    typeof password === 'string' && password.length > 0 && password.length <= MAX_PASSWORD_LENGTH
  );
}

/**
 * `true` only when `hash` exists and `password` matches it. A missing hash, an
 * unacceptable password and a malformed hash all answer `false` after one compare.
 */
export function verifyCredentialPassword(password: unknown, hash: string | null): boolean {
  const candidate = isAcceptablePassword(password) ? password : '';
  const target = hash ?? getDummyHash();
  let matches: boolean;
  try {
    matches = verifySecret(candidate, target);
  } catch {
    matches = false;
  }
  return hash !== null && matches && isAcceptablePassword(password);
}
