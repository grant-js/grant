import type {
  CredentialRecord,
  CredentialScope,
  CredentialWithHash,
  IAuditLogger,
  ICredentialLockoutService,
  ICredentialRepository,
  ICredentialService,
  PlatformCredentialScope,
  ProjectCredentialScope,
} from '@grantjs/core';

import { bcryptHashProblem } from '@/lib/cdm/cdm-password.lib';
import {
  isAcceptablePassword,
  MAX_PASSWORD_LENGTH,
  verifyCredentialPassword,
} from '@/lib/credential-verifier.lib';
import { ValidationError } from '@/lib/errors';
import { hashSecret } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

import { validateInput } from './common';
import { credentialTargetSchema, credentialWriteTargetSchema } from './credentials.schemas';

export interface CredentialRepositories {
  platform: ICredentialRepository<PlatformCredentialScope>;
  project: ICredentialRepository<ProjectCredentialScope>;
}

export interface CredentialAuditLoggers {
  platform: IAuditLogger;
  project: IAuditLogger;
}

/**
 * Explicit fields, never a spread: the value read for verification carries the hash, and
 * an audit row must not.
 */
function auditValues(record: CredentialRecord): Record<string, unknown> {
  return {
    id: record.id,
    scope: record.scope,
    projectId: record.projectId,
    userId: record.userId,
    source: record.source,
  };
}

/**
 * The scoped credential service of ADR 0011: one service for the platform and the project
 * scope. The scope only picks the repository (and so the table); hashing, the verifier and
 * the `source` rules are written once.
 *
 * Nothing here is called by a sign-in path yet (slices 2 to 5 wire it); the member-removal
 * hook, the erasure hook, the data export and the retention job are its only callers.
 * Neither a password nor a hash is ever passed to a logger, an audit row or an error.
 */
export class CredentialService implements ICredentialService {
  constructor(
    private readonly repositories: CredentialRepositories,
    private readonly audit: CredentialAuditLoggers,
    private readonly lockouts: ICredentialLockoutService
  ) {}

  private repositoryFor(scope: CredentialScope): ICredentialRepository<CredentialScope> {
    return scope.scope === 'platform' ? this.repositories.platform : this.repositories.project;
  }

  private auditFor(scope: CredentialScope['scope']): IAuditLogger {
    return scope === 'platform' ? this.audit.platform : this.audit.project;
  }

  private async store(
    params: {
      scope: CredentialScope;
      userId: string;
      hash: string;
      source: CredentialRecord['source'];
    },
    context: string,
    transaction?: Transaction
  ): Promise<CredentialRecord> {
    const { scope, userId, source } = validateInput(
      credentialWriteTargetSchema,
      { scope: params.scope, userId: params.userId, source: params.source },
      context
    );

    const repository = this.repositoryFor(scope);
    const existing = await repository.findActive(scope, userId, transaction);
    const record = await repository.upsert(
      scope,
      { userId, hash: params.hash, source },
      transaction
    );

    const metadata = { context, scope: scope.scope };
    if (existing) {
      await this.auditFor(scope.scope).logUpdate(
        record.id,
        auditValues(existing),
        auditValues(record),
        metadata,
        transaction
      );
    } else {
      await this.auditFor(scope.scope).logCreate(
        record.id,
        auditValues(record),
        metadata,
        transaction
      );
    }
    return record;
  }

  async setPassword(
    params: {
      scope: CredentialScope;
      userId: string;
      password: string;
      source: CredentialRecord['source'];
    },
    transaction?: Transaction
  ): Promise<CredentialRecord> {
    if (!isAcceptablePassword(params.password)) {
      throw new ValidationError(
        `Password must be a non-empty string of at most ${MAX_PASSWORD_LENGTH} characters`
      );
    }
    return this.store(
      {
        scope: params.scope,
        userId: params.userId,
        source: params.source,
        hash: hashSecret(params.password),
      },
      'CredentialService.setPassword',
      transaction
    );
  }

  async setPasswordHash(
    params: {
      scope: CredentialScope;
      userId: string;
      hash: string;
      source: CredentialRecord['source'];
    },
    transaction?: Transaction
  ): Promise<CredentialRecord> {
    const problem = bcryptHashProblem(params.hash);
    if (problem) {
      throw new ValidationError(problem);
    }
    return this.store(params, 'CredentialService.setPasswordHash', transaction);
  }

  async verifyPassword(
    params: { scope: CredentialScope; userId: string; password: string },
    transaction?: Transaction
  ): Promise<boolean> {
    const { scope, userId } = validateInput(
      credentialTargetSchema,
      { scope: params.scope, userId: params.userId },
      'CredentialService.verifyPassword'
    );
    const repository = this.repositoryFor(scope);
    const stored: CredentialWithHash | null = await repository.findActive(
      scope,
      userId,
      transaction
    );

    const verified = verifyCredentialPassword(params.password, stored?.hash ?? null);
    if (verified) {
      await repository.touchLastUsed(scope, userId, new Date(), transaction);
    }
    return verified;
  }

  async getCredential(
    scope: CredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialRecord | null> {
    const target = validateInput(
      credentialTargetSchema,
      { scope, userId },
      'CredentialService.getCredential'
    );
    const stored = await this.repositoryFor(target.scope).findActive(
      target.scope,
      target.userId,
      transaction
    );
    if (!stored) {
      return null;
    }
    const { hash: _hash, ...record } = stored;
    return record;
  }

  async hasCredential(
    scope: CredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    return (await this.getCredential(scope, userId, transaction)) !== null;
  }

  async removeCredential(
    scope: CredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const target = validateInput(
      credentialTargetSchema,
      { scope, userId },
      'CredentialService.removeCredential'
    );
    const removed = await this.repositoryFor(target.scope).softDelete(
      target.scope,
      target.userId,
      transaction
    );
    if (!removed) {
      return false;
    }
    await this.auditFor(target.scope.scope).logSoftDelete(
      removed.id,
      auditValues(removed),
      { ...auditValues(removed), deleted: true },
      { context: 'CredentialService.removeCredential', scope: target.scope.scope },
      transaction
    );
    return true;
  }

  async removeAllForUser(userId: string, transaction?: Transaction): Promise<number> {
    const { userId: validUserId } = validateInput(
      credentialTargetSchema.pick({ userId: true }),
      { userId },
      'CredentialService.removeAllForUser'
    );

    const removed: CredentialRecord[] = [
      ...(await this.repositories.platform.softDeleteAllForUser(validUserId, transaction)),
      ...(await this.repositories.project.softDeleteAllForUser(validUserId, transaction)),
    ];
    for (const record of removed) {
      await this.auditFor(record.scope).logSoftDelete(
        record.id,
        auditValues(record),
        { ...auditValues(record), deleted: true },
        { context: 'CredentialService.removeAllForUser', scope: record.scope },
        transaction
      );
    }
    await this.lockouts.resetAllForUser(validUserId, transaction);
    return removed.length;
  }

  async listForUser(userId: string, transaction?: Transaction): Promise<CredentialRecord[]> {
    const { userId: validUserId } = validateInput(
      credentialTargetSchema.pick({ userId: true }),
      { userId },
      'CredentialService.listForUser'
    );
    return [
      ...(await this.repositories.platform.listActiveForUser(validUserId, transaction)),
      ...(await this.repositories.project.listActiveForUser(validUserId, transaction)),
    ];
  }

  async purgeSoftDeleted(
    transaction?: Transaction
  ): Promise<{ platform: number; project: number }> {
    return {
      platform: await this.repositories.platform.purgeSoftDeleted(transaction),
      project: await this.repositories.project.purgeSoftDeleted(transaction),
    };
  }
}
