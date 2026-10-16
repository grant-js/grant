import type {
  CredentialLockoutPolicy,
  CredentialLockoutState,
  CredentialLockoutStatus,
  CredentialScope,
  ICredentialLockoutRepository,
  ICredentialLockoutService,
  PlatformCredentialScope,
  ProjectCredentialScope,
} from '@grantjs/core';

import type { PlatformCredentialConnection } from '@/lib/platform-credential-connection.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

import { validateInput } from './common';
import { credentialTargetSchema } from './credentials.schemas';

export interface CredentialLockoutRepositories {
  platform: ICredentialLockoutRepository<PlatformCredentialScope>;
  project: ICredentialLockoutRepository<ProjectCredentialScope>;
}

/**
 * The per-`(scope, user)` lockout of ADR 0011 § 5. Keyed by the resolved user id, never by
 * the identifier typed, so every identifier that resolves to one user shares one guess
 * budget; it counts whether or not that user has a credential, so a locked and an unlocked
 * user look alike.
 *
 * Built in slice 1 and enabled by nothing: no sign-in path calls it before slice 4
 * (project scope) and slice 7 (platform scope). A caller must record a failure on the
 * connection that survives the failing request, not inside a transaction the failure
 * rolls back.
 */
export class CredentialLockoutService implements ICredentialLockoutService {
  constructor(
    private readonly repositories: CredentialLockoutRepositories,
    private readonly policy: CredentialLockoutPolicy,
    private readonly platformConnection: PlatformCredentialConnection,
    private readonly now: () => Date = () => new Date()
  ) {}

  /**
   * The platform lockout table has no privileges for the restricted role of a scoped
   * request (ADR 0011 slice 2), so a platform-scope operation runs on the connection
   * `platformConnection` picks; a project-scope one uses the caller's transaction.
   */
  private run<T>(
    scope: CredentialScope,
    caller: Transaction | undefined,
    work: (transaction: Transaction | undefined) => Promise<T>
  ): Promise<T> {
    return scope.scope === 'platform'
      ? this.platformConnection.transaction(caller, work)
      : work(caller);
  }

  private repositoryFor(scope: CredentialScope): ICredentialLockoutRepository<CredentialScope> {
    return scope.scope === 'platform' ? this.repositories.platform : this.repositories.project;
  }

  private toStatus(state: CredentialLockoutState | null): CredentialLockoutStatus {
    const lockedUntil = state?.lockedUntil ?? null;
    return {
      failedAttempts: state?.failedAttempts ?? 0,
      lockedUntil,
      locked: lockedUntil !== null && lockedUntil.getTime() > this.now().getTime(),
    };
  }

  async getStatus(
    scope: CredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialLockoutStatus> {
    const target = validateInput(
      credentialTargetSchema,
      { scope, userId },
      'CredentialLockoutService.getStatus'
    );
    return this.toStatus(
      await this.run(target.scope, transaction, (tx) =>
        this.repositoryFor(target.scope).getState(target.scope, target.userId, tx)
      )
    );
  }

  async recordFailure(
    scope: CredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialLockoutStatus> {
    const target = validateInput(
      credentialTargetSchema,
      { scope, userId },
      'CredentialLockoutService.recordFailure'
    );
    return this.toStatus(
      await this.run(target.scope, transaction, (tx) =>
        this.repositoryFor(target.scope).recordFailure(
          target.scope,
          target.userId,
          this.policy,
          this.now(),
          tx
        )
      )
    );
  }

  async reset(scope: CredentialScope, userId: string, transaction?: Transaction): Promise<void> {
    const target = validateInput(
      credentialTargetSchema,
      { scope, userId },
      'CredentialLockoutService.reset'
    );
    await this.run(target.scope, transaction, (tx) =>
      this.repositoryFor(target.scope).reset(target.scope, target.userId, tx)
    );
  }

  async resetAllForUser(userId: string, transaction?: Transaction): Promise<void> {
    const { userId: validUserId } = validateInput(
      credentialTargetSchema.pick({ userId: true }),
      { userId },
      'CredentialLockoutService.resetAllForUser'
    );
    await this.platformConnection.transaction(transaction, (tx) =>
      this.repositories.platform.resetAllForUser(validUserId, tx)
    );
    await this.repositories.project.resetAllForUser(validUserId, transaction);
  }
}
