/**
 * Scoped password credential repository ports (ADR 0011).
 *
 * A credential is `(scope, user, hash, source)`. The scope is the table: platform
 * credentials and project credentials live in two tables behind these shared ports, so a
 * platform query cannot name a project row and the reverse. Nothing here carries an
 * identifier (no email): the caller resolves a login identifier to a user id first.
 *
 * The hash crosses this boundary in one place only, `CredentialWithHash`, which the
 * service reads to verify and never returns.
 */

/** Where a stored credential came from (ADR 0011 § 2). One enum for both scopes. */
export const CREDENTIAL_SOURCES = [
  'register',
  'cdm-import',
  'reset',
  'change',
  'migrated',
  'migrated-import',
] as const;

export type CredentialSource = (typeof CREDENTIAL_SOURCES)[number];

export interface PlatformCredentialScope {
  scope: 'platform';
}

export interface ProjectCredentialScope {
  scope: 'project';
  projectId: string;
}

export type CredentialScope = PlatformCredentialScope | ProjectCredentialScope;

/** Metadata of a stored credential. Never carries the hash. */
export interface CredentialRecord {
  id: string;
  scope: CredentialScope['scope'];
  /** Set for the project scope, `null` for the platform scope. */
  projectId: string | null;
  userId: string;
  source: CredentialSource;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Repository-to-verifier only. Never log, audit, export or return this. */
export interface CredentialWithHash extends CredentialRecord {
  hash: string;
}

export interface CredentialWriteInput {
  userId: string;
  hash: string;
  source: CredentialSource;
}

export interface ICredentialRepository<S extends CredentialScope = CredentialScope> {
  /** The live (not soft-deleted) credential of a user in the scope, with its hash. */
  findActive(scope: S, userId: string, transaction?: unknown): Promise<CredentialWithHash | null>;

  /**
   * Create the live credential, or replace the hash and source of the existing live one,
   * in one atomic statement. A failure never carries the hash in its message.
   */
  upsert(scope: S, input: CredentialWriteInput, transaction?: unknown): Promise<CredentialRecord>;

  touchLastUsed(scope: S, userId: string, at: Date, transaction?: unknown): Promise<void>;

  /** Soft-delete the live credential; `null` when there was none. */
  softDelete(scope: S, userId: string, transaction?: unknown): Promise<CredentialRecord | null>;

  /** Soft-delete every live credential of the user in this repository's table(s). */
  softDeleteAllForUser(userId: string, transaction?: unknown): Promise<CredentialRecord[]>;

  /** Live credentials of the user, metadata only (data export). */
  listActiveForUser(userId: string, transaction?: unknown): Promise<CredentialRecord[]>;

  /** Hard-delete every soft-deleted row; returns how many went. */
  purgeSoftDeleted(transaction?: unknown): Promise<number>;
}

export interface CredentialLockoutPolicy {
  /** Failures inside one window that trigger a lock. */
  maxAttempts: number;
  /** A failure older than this no longer counts. */
  windowMs: number;
  lockDurationMs: number;
}

export interface CredentialLockoutState {
  failedAttempts: number;
  /** In the future while locked, otherwise `null` or past. */
  lockedUntil: Date | null;
}

/**
 * Per-`(scope, user)` failed-attempt counter. Keyed by the resolved user, never by the
 * identifier typed, and independent of whether the user has a credential, so a locked
 * and an unlocked user look alike to a guesser. Built in ADR 0011 slice 1; nothing
 * enables it before slice 4.
 */
export interface ICredentialLockoutRepository<S extends CredentialScope = CredentialScope> {
  /** Atomic: count a failure (restarting the window when it has lapsed), lock at the limit. */
  recordFailure(
    scope: S,
    userId: string,
    policy: CredentialLockoutPolicy,
    now: Date,
    transaction?: unknown
  ): Promise<CredentialLockoutState>;

  getState(scope: S, userId: string, transaction?: unknown): Promise<CredentialLockoutState | null>;

  reset(scope: S, userId: string, transaction?: unknown): Promise<void>;

  /** Remove every lockout row of the user (erasure of a soft-deleted user). */
  resetAllForUser(userId: string, transaction?: unknown): Promise<void>;
}
