import {
  CDM_BCRYPT_MAX_COST,
  CDM_BCRYPT_MIN_COST,
  CDM_PASSWORD_ALGORITHM_BCRYPT,
  CDM_PASSWORD_HASH_REDACTED,
} from '@/constants/cdm-import.constants';

/**
 * Imported password credentials (ADR 0010): the format rules for a bcrypt hash, and the
 * redaction of one from a document that is stored or shown.
 *
 * Nothing in this file puts a hash into a message. Every refusal names the field and the
 * rule, never the value: a refusal outlives the request (job row, event, log) and the
 * value is a credential.
 */

/**
 * Modular-crypt bcrypt: `$2a$`/`$2b$`/`$2y$`, a two-digit cost, 22 salt and 31 hash
 * characters (60 in all). `$2a$` is what Go's `bcrypt.GenerateFromPassword` writes; node
 * `bcrypt.compareSync`, which platform login uses, reads all three and takes the cost from
 * the hash.
 */
export const BCRYPT_HASH_PATTERN = /^\$2[aby]\$(\d{2})\$[./A-Za-z0-9]{53}$/;

export const BCRYPT_HASH_FORMAT_MESSAGE =
  'password.hash must be a bcrypt hash ($2a$, $2b$ or $2y$ prefix, two-digit cost, 60 characters)';

export const BCRYPT_HASH_COST_MESSAGE = `password.hash cost must be between ${CDM_BCRYPT_MIN_COST} and ${CDM_BCRYPT_MAX_COST}`;

/** The credential as a document carries it. */
export interface CdmPasswordCredential {
  algorithm: string;
  hash: string;
}

/**
 * Why a hash is refused, or `null` when it is acceptable. The reason is a fixed string:
 * safe to store, return and log.
 */
export function bcryptHashProblem(hash: unknown): string | null {
  if (typeof hash !== 'string') {
    return BCRYPT_HASH_FORMAT_MESSAGE;
  }
  const match = BCRYPT_HASH_PATTERN.exec(hash);
  if (!match) {
    return BCRYPT_HASH_FORMAT_MESSAGE;
  }
  const cost = Number(match[1]);
  if (cost < CDM_BCRYPT_MIN_COST || cost > CDM_BCRYPT_MAX_COST) {
    return BCRYPT_HASH_COST_MESSAGE;
  }
  return null;
}

/** Why a credential is refused, or `null`. Covers the algorithm and the hash. */
export function cdmPasswordProblem(
  password: { algorithm?: unknown; hash?: unknown } | null | undefined
): string | null {
  if (password == null) {
    return null;
  }
  if (password.algorithm !== CDM_PASSWORD_ALGORITHM_BCRYPT) {
    return `password.algorithm must be '${CDM_PASSWORD_ALGORITHM_BCRYPT}'`;
  }
  return bcryptHashProblem(password.hash);
}

/**
 * The document with every `users[].password.hash` replaced by a placeholder, or `null`
 * when it holds none, so a caller can skip the write. The input is not modified.
 *
 * The placeholder is not a valid hash, so a redacted document re-submitted as an import
 * fails validation with the rule above instead of silently importing without credentials.
 * Run on a job's stored payload when the job ends and on every `/payload` answer: the
 * hash is needed by the worker while the job is pending or running, and by nobody after.
 */
export function redactCdmPasswordHashes(document: unknown): Record<string, unknown> | null {
  if (document == null || typeof document !== 'object' || Array.isArray(document)) {
    return null;
  }
  const users = (document as { users?: unknown }).users;
  if (!Array.isArray(users)) {
    return null;
  }

  let changed = false;
  const redactedUsers = users.map((user: unknown) => {
    if (user == null || typeof user !== 'object') {
      return user;
    }
    const password = (user as { password?: unknown }).password;
    if (password == null || typeof password !== 'object' || !('hash' in password)) {
      return user;
    }
    if ((password as { hash: unknown }).hash === CDM_PASSWORD_HASH_REDACTED) {
      return user;
    }
    changed = true;
    return { ...user, password: { ...password, hash: CDM_PASSWORD_HASH_REDACTED } };
  });

  return changed ? { ...(document as Record<string, unknown>), users: redactedUsers } : null;
}

/** {@link redactCdmPasswordHashes}, returning the input itself when there is nothing to redact. */
export function withCdmPasswordHashesRedacted<T>(document: T): T {
  return (redactCdmPasswordHashes(document) as T | null) ?? document;
}
