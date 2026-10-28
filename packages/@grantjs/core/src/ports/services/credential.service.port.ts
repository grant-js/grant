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

/** What a project password import did, per row of the document (ADR 0011 § 4). */
export interface ProjectPasswordImportCounts {
  /** No project credential existed: written, `source: cdm-import`. */
  imported: number;
  /** An earlier import's credential had a different hash: replaced. */
  updated: number;
  /** An earlier import's credential already held this hash: nothing written. */
  unchanged: number;
  /** The person owns the project credential (`reset`, `change`, ...): never touched. */
  skippedExisting: number;
}

/**
 * **Connections (ADR 0011 slice 2).** Platform-scope credentials live in tables the
 * restricted RLS role has no privileges on, so every platform-scope operation runs on the
 * unrestricted base connection, behind this interface: callers never choose a connection or
 * write SQL for it. When the caller's transaction is itself unrestricted (an unscoped
 * request: login, register, reset) the operation joins it, so it commits or rolls back
 * with the caller's other writes. When the caller's transaction runs as the restricted role
 * (a scoped request) the operation runs in its own short transaction on the base pool: it
 * is not part of the request transaction and holds one extra pooled connection while it runs.
 * Project-scope operations always use the caller's transaction (RLS applies to them).
 */
export interface ICredentialService {
  /**
   * Throws `ValidationError` when `password` does not meet the Grant password policy. The
   * refusal names the rules and never contains the value. Lets a caller refuse before it
   * opens a transaction or touches anything else; `setPassword` applies the same check.
   */
  assertPasswordMeetsPolicy(password: string): void;

  /**
   * Hash a plaintext password (bcrypt, configured cost) and store it as the live credential.
   * A Grant-set password must meet the password policy; the refusal never contains it.
   * A successful write resets the lockout of that `(scope, user)`.
   */
  setPassword(
    params: { scope: CredentialScope; userId: string; password: string; source: CredentialSource },
    transaction?: unknown
  ): Promise<CredentialRecord>;

  /**
   * Platform scope only: change (or first-set) the platform password of a user, atomically.
   * The current password is required, and verified against the row locked in the same
   * transaction, when a credential exists; without one this is a first set. Returns the
   * reason (`change` or `set`) for the caller's event.
   */
  changePlatformPassword(
    params: { userId: string; currentPassword: string | undefined; newPassword: string },
    transaction?: unknown
  ): Promise<{ reason: 'change' | 'set' }>;

  /**
   * Store an already hashed credential (an import or a migration). Refuses anything that
   * is not a bcrypt hash within the cost bounds; the refusal never contains the value.
   */
  setPasswordHash(
    params: { scope: CredentialScope; userId: string; hash: string; source: CredentialSource },
    transaction?: unknown
  ): Promise<CredentialRecord>;

  /**
   * Import already hashed passwords into one project's credentials (ADR 0011 § 4), with the
   * forward-only provenance of a CDM import, decided in memory after **one** batched read of
   * the project's existing credentials for these users (never a query per row):
   *
   * - no live credential: written as `cdm-import`;
   * - an existing `cdm-import` credential with a different hash: replaced; with the same
   *   hash: untouched;
   * - an existing credential of any other `source`: never touched.
   *
   * Runs in the caller's transaction, under the project's RLS; the caller has already
   * established that every user is a member of the project. The hash is compared inside the
   * service and never returned. Rows are applied in order, so a user named twice ends with
   * the last hash. Publishes no `project.user_password_set`: an import is silent like every
   * other import write, and its completion event with counters is the signal.
   */
  importProjectPasswordHashes(
    params: {
      projectId: string;
      rows: ReadonlyArray<{ userId: string; hash: string }>;
    },
    transaction?: unknown
  ): Promise<ProjectPasswordImportCounts>;

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

/** One project credential whose stored hash changed. Ids and source only, never a hash. */
export interface ProjectPasswordSetChange {
  projectId: string;
  userId: string;
  source: CredentialSource;
}

/**
 * Publishes `project.user_password_set` (ADR 0011 § 8). `ICredentialService` is the only
 * caller, so the event has one emission point for every non-import write (`admin-set`,
 * `reset`, a future `change`); a CDM import never publishes it. Ids and
 * `source` only in `data.after`: never a password, a hash or a key containing either.
 */
export interface IProjectUserCredentialEventPublisher {
  publishPasswordSet(
    changes: ReadonlyArray<ProjectPasswordSetChange>,
    transaction?: unknown
  ): Promise<void>;
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
