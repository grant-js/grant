/**
 * Project-app password reset token repository port (ADR 0011 § 6).
 *
 * One row per `(project, user)`: the digest of the live reset token, its expiry and the
 * request counter of the per-address limit. The plain token is never stored; it is looked
 * up by its digest.
 */

export interface ProjectPasswordResetRequestLimit {
  /** Reset emails one `(project, user)` may be issued inside one window. */
  maxRequests: number;
  /** A window starts with its first request and is not extended by later ones. */
  windowMs: number;
}

export interface IssueProjectPasswordResetParams {
  projectId: string;
  userId: string;
  /** The Email method the mailbox proof will be recorded on. */
  authMethodId: string;
  tokenHash: string;
  expiresAt: Date;
  now: Date;
  limit: ProjectPasswordResetRequestLimit;
}

/** The live token row, claimed for use. */
export interface ClaimedProjectPasswordReset {
  id: string;
  userId: string;
  authMethodId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IProjectPasswordResetRepository {
  /**
   * Atomic, one statement: count the request (restarting the window when it has lapsed)
   * and, while the window's budget lasts, replace the stored token digest with the new
   * one (which invalidates the previous link). Returns `false` and stores nothing when
   * the budget is spent.
   */
  issue(params: IssueProjectPasswordResetParams, transaction?: unknown): Promise<boolean>;

  /**
   * Look a token up by its digest within one project and lock the row until the
   * transaction ends, so two concurrent completions cannot both use it. `null` when no
   * live token has that digest.
   */
  claimByTokenHash(
    projectId: string,
    tokenHash: string,
    transaction?: unknown
  ): Promise<ClaimedProjectPasswordReset | null>;

  /** Make the token of a claimed row unusable (single use). */
  consume(id: string, now: Date, transaction?: unknown): Promise<void>;
}
