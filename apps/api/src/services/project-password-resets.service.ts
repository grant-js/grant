import type {
  ConsumedProjectPasswordReset,
  IProjectPasswordResetRepository,
  IProjectPasswordResetService,
  IssuedProjectPasswordReset,
} from '@grantjs/core';

import { generateSecureToken, hashToken, tokenHashesEqual } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

import { validateInput, validateSecretInput } from './common';
import {
  issueProjectPasswordResetInputSchema,
  MAX_PROJECT_PASSWORD_RESET_TOKEN_LENGTH,
} from './project-password-resets.schemas';
import { passwordPolicySchema } from './user-authentication-methods.schemas';

export interface ProjectPasswordResetPolicy {
  tokenTtlMs: number;
  /** Reset emails one `(project, user)` may be issued inside one window. */
  maxRequests: number;
  windowMs: number;
}

const TOKEN_BYTES = 32;

/**
 * Reset tokens of the project apps (ADR 0011 § 6). The token is 256 bits of randomness, so
 * a fast digest (SHA-256) is enough and, unlike bcrypt, can be looked up: the stored value
 * is the digest, the plain token lives in the email only, and a copy of the table cannot be
 * replayed. The same pattern as the platform reset token of slice 2.
 */
export class ProjectPasswordResetService implements IProjectPasswordResetService {
  constructor(
    private readonly resets: IProjectPasswordResetRepository,
    private readonly policy: ProjectPasswordResetPolicy,
    private readonly now: () => Date = () => new Date()
  ) {}

  assertPasswordMeetsPolicy(password: string): void {
    // Not `validateInput`: it would put the rejected password into the error message.
    validateSecretInput(
      passwordPolicySchema,
      password,
      'ProjectPasswordResetService.assertPasswordMeetsPolicy'
    );
  }

  async issueToken(
    params: { projectId: string; userId: string; authMethodId: string },
    transaction?: Transaction
  ): Promise<IssuedProjectPasswordReset | null> {
    const { projectId, userId, authMethodId } = validateInput(
      issueProjectPasswordResetInputSchema,
      params,
      'ProjectPasswordResetService.issueToken'
    );

    const { token } = generateSecureToken(1, TOKEN_BYTES);
    const now = this.now();
    const expiresAt = new Date(now.getTime() + this.policy.tokenTtlMs);

    const issued = await this.resets.issue(
      {
        projectId,
        userId,
        authMethodId,
        tokenHash: hashToken(token),
        expiresAt,
        now,
        limit: { maxRequests: this.policy.maxRequests, windowMs: this.policy.windowMs },
      },
      transaction
    );
    return issued ? { token, expiresAt } : null;
  }

  async consumeToken(
    params: { projectId: string; token: string },
    transaction?: Transaction
  ): Promise<ConsumedProjectPasswordReset | null> {
    const { projectId, token } = params;
    // Not `validateInput`: it would put the submitted token into an error message.
    if (
      typeof token !== 'string' ||
      token.length === 0 ||
      token.length > MAX_PROJECT_PASSWORD_RESET_TOKEN_LENGTH
    ) {
      return null;
    }

    const tokenHash = hashToken(token);
    const claimed = await this.resets.claimByTokenHash(projectId, tokenHash, transaction);
    const now = this.now();
    if (
      !claimed ||
      !tokenHashesEqual(claimed.tokenHash, tokenHash) ||
      claimed.expiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }

    await this.resets.consume(claimed.id, now, transaction);
    return { userId: claimed.userId, authMethodId: claimed.authMethodId };
  }
}
