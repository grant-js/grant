/**
 * Scoped password credential service port (ADR 0011): one port for the platform and the
 * project scope. Hashing, the verifier, the lockout and the `source` rules are written
 * once; the scope only chooses the table.
 */
import type {
  CredentialLockoutState,
  CredentialRecord,
  CredentialScope,
  CredentialSource,
} from '../repositories/credential.repository.port';

export interface ICredentialService {
  /** Hash a plaintext password (bcrypt, configured cost) and store it as the live credential. */
  setPassword(
    params: { scope: CredentialScope; userId: string; password: string; source: CredentialSource },
    transaction?: unknown
  ): Promise<CredentialRecord>;

  /**
   * Store an already hashed credential (an import or a migration). Refuses anything that
   * is not a bcrypt hash within the cost bounds; the refusal never contains the value.
   */
  setPasswordHash(
    params: { scope: CredentialScope; userId: string; hash: string; source: CredentialSource },
    transaction?: unknown
  ): Promise<CredentialRecord>;

  /**
   * Verify a password for a **resolved user id** in one scope. A missing credential costs
   * a dummy compare, so timing does not reveal whether one exists; the answer is `false`
   * either way. Success records `lastUsedAt`. Does not consult the lockout.
   */
  verifyPassword(
    params: { scope: CredentialScope; userId: string; password: string },
    transaction?: unknown
  ): Promise<boolean>;

  /** Metadata of the live credential (never the hash), or `null`. */
  getCredential(
    scope: CredentialScope,
    userId: string,
    transaction?: unknown
  ): Promise<CredentialRecord | null>;

  hasCredential(scope: CredentialScope, userId: string, transaction?: unknown): Promise<boolean>;

  /** Soft-delete the live credential. `true` when there was one. */
  removeCredential(scope: CredentialScope, userId: string, transaction?: unknown): Promise<boolean>;

  /** Erasure of a soft-deleted user: soft-delete every credential and clear lockouts, in both scopes. */
  removeAllForUser(userId: string, transaction?: unknown): Promise<number>;

  /** Live credentials of the user in both scopes, metadata only (data export). */
  listForUser(userId: string, transaction?: unknown): Promise<CredentialRecord[]>;

  /** Retention: hard-delete soft-deleted credentials in both scopes. */
  purgeSoftDeleted(transaction?: unknown): Promise<{ platform: number; project: number }>;
}

export interface CredentialLockoutStatus extends CredentialLockoutState {
  locked: boolean;
}

/** The lockout over `(scope, user)`. Not called by any sign-in path until ADR 0011 slice 4. */
export interface ICredentialLockoutService {
  getStatus(
    scope: CredentialScope,
    userId: string,
    transaction?: unknown
  ): Promise<CredentialLockoutStatus>;

  recordFailure(
    scope: CredentialScope,
    userId: string,
    transaction?: unknown
  ): Promise<CredentialLockoutStatus>;

  reset(scope: CredentialScope, userId: string, transaction?: unknown): Promise<void>;

  /** Remove the user's lockout state in both scopes (erasure). */
  resetAllForUser(userId: string, transaction?: unknown): Promise<void>;
}
