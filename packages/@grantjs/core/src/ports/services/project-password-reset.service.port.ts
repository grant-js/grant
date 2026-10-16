/**
 * Project-app password reset token service port (ADR 0011 § 6). Tokens are random, stored
 * as a SHA-256 digest scoped to `(project, user)`, short-lived and single-use.
 */

export interface IssuedProjectPasswordReset {
  /** The plain token. It exists in the email and in the caller's hands, never in storage. */
  token: string;
  expiresAt: Date;
}

export interface ConsumedProjectPasswordReset {
  userId: string;
  /** The Email method that received the link; completing the reset proves its mailbox. */
  authMethodId: string;
}

export interface IProjectPasswordResetService {
  /**
   * Throw a `ValidationError` when `password` does not meet the password policy (the same
   * policy as a platform registration or reset). The error names the rules and never
   * contains the password, so a caller can run it before it consumes a single-use token.
   */
  assertPasswordMeetsPolicy(password: string): void;

  /**
   * Issue a reset token for a member. `null` (nothing stored, nothing to send) when the
   * per-address request limit of this `(project, user)` is spent; a caller answers the
   * same either way.
   */
  issueToken(
    params: { projectId: string; userId: string; authMethodId: string },
    transaction?: unknown
  ): Promise<IssuedProjectPasswordReset | null>;

  /**
   * Use a token: looked up by digest inside the project, compared in constant time,
   * refused when expired, and made unusable. Call it inside the transaction that writes
   * the credential, so a failed write leaves the token usable. `null` for an unknown,
   * foreign-project, expired or already used token.
   */
  consumeToken(
    params: { projectId: string; token: string },
    transaction?: unknown
  ): Promise<ConsumedProjectPasswordReset | null>;
}
