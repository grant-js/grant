import type {
  CredentialRecord,
  CredentialScope,
  CredentialWithHash,
  IAuditLogger,
  ICredentialLockoutService,
  ICredentialRepository,
  ICredentialService,
  IProjectCredentialRepository,
  PlatformCredentialScope,
  ProjectPasswordImportCounts,
} from '@grantjs/core';

import { bcryptHashProblem } from '@/lib/cdm/cdm-password.lib';
import { verifyCredentialPassword } from '@/lib/credential-verifier.lib';
import { AuthenticationError, BadRequestError, ValidationError } from '@/lib/errors';
import type { PlatformCredentialConnection } from '@/lib/platform-credential-connection.lib';
import { hashSecret } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

import { validateInput, validateSecretInput } from './common';
import { credentialTargetSchema, credentialWriteTargetSchema } from './credentials.schemas';
import { passwordPolicySchema } from './user-authentication-methods.schemas';

export interface CredentialRepositories {
  platform: ICredentialRepository<PlatformCredentialScope>;
  project: IProjectCredentialRepository;
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
 * **Connections.** The platform repositories and audit logger passed in are bound to the
 * base pool; every platform-scope operation runs through `platformConnection`, which joins
 * an unrestricted caller transaction or opens its own short one (see
 * {@link PlatformCredentialConnection}). Project-scope operations use the caller's
 * transaction, where RLS applies. No caller picks a connection.
 *
 * Neither a password nor a hash is ever passed to a logger, an audit row or an error.
 */
export class CredentialService implements ICredentialService {
  constructor(
    private readonly repositories: CredentialRepositories,
    private readonly audit: CredentialAuditLoggers,
    private readonly lockouts: ICredentialLockoutService,
    private readonly platformConnection: PlatformCredentialConnection
  ) {}

  /** Runs `work` on the connection the scope's tables are reachable from. */
  private run<T>(
    scope: CredentialScope,
    caller: Transaction | undefined,
    work: (transaction: Transaction | undefined) => Promise<T>
  ): Promise<T> {
    return scope.scope === 'platform'
      ? this.platformConnection.transaction(caller, work)
      : work(caller);
  }

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

    return this.run(scope, transaction, async (tx) =>
      this.write(scope, userId, params.hash, source, context, tx)
    );
  }

  /**
   * The write itself, on the connection `run` chose: upsert, audit, lockout reset.
   * `known` is what the caller already read for this `(scope, user)` in the same
   * transaction (`null`: no live credential), which saves the lookup; absent, it is read here.
   */
  private async write(
    scope: CredentialScope,
    userId: string,
    hash: string,
    source: CredentialRecord['source'],
    context: string,
    transaction: Transaction | undefined,
    known?: { existing: CredentialRecord | null }
  ): Promise<CredentialRecord> {
    const repository = this.repositoryFor(scope);
    const existing = known
      ? known.existing
      : await repository.findActive(scope, userId, transaction);
    const record = await repository.upsert(scope, { userId, hash, source }, transaction);

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
    // A successful write is the way back from a lock (ADR 0011 § 8): reset this
    // (scope, user) only, never another scope's budget.
    await this.lockouts.reset(scope, userId, transaction);
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
    // The policy is the Grant-set rule (min 8, max 128, complexity). It is checked with
    // `validateSecretInput`: `validateInput` would put the rejected password into the error.
    // `MAX_PASSWORD_LENGTH` (1024) stays the verifier's compare-cost bound and the limit of
    // imported hashes; it is not the policy.
    const password = validateSecretInput(
      passwordPolicySchema,
      params.password,
      'CredentialService.setPassword'
    );
    return this.store(
      {
        scope: params.scope,
        userId: params.userId,
        source: params.source,
        // Hashed before any connection is taken: bcrypt must not hold a pooled connection.
        hash: hashSecret(password),
      },
      'CredentialService.setPassword',
      transaction
    );
  }

  async changePlatformPassword(
    params: { userId: string; currentPassword: string | undefined; newPassword: string },
    transaction?: Transaction
  ): Promise<{ reason: 'change' | 'set' }> {
    const context = 'CredentialService.changePlatformPassword';
    const scope: CredentialScope = { scope: 'platform' };
    const { userId } = validateInput(
      credentialTargetSchema,
      { scope, userId: params.userId },
      context
    );
    const newPassword = validateSecretInput(passwordPolicySchema, params.newPassword, context);

    // One transaction, row locked: verify the current password, write the new hash. Two
    // concurrent changes cannot both pass the check against the old hash.
    return this.platformConnection.transaction(transaction, async (tx) => {
      const existing = await this.repositories.platform.lockActive(
        { scope: 'platform' },
        userId,
        tx
      );

      if (existing) {
        if (!params.currentPassword) {
          throw new BadRequestError('Current password is required');
        }
        if (!verifyCredentialPassword(params.currentPassword, existing.hash)) {
          throw new AuthenticationError('Current password is incorrect');
        }
      }

      await this.write(scope, userId, hashSecret(newPassword), 'change', context, tx);
      return { reason: existing ? 'change' : 'set' };
    });
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

  async importProjectPasswordHashes(
    params: { projectId: string; rows: ReadonlyArray<{ userId: string; hash: string }> },
    transaction?: Transaction
  ): Promise<ProjectPasswordImportCounts> {
    const context = 'CredentialService.importProjectPasswordHashes';
    const counts: ProjectPasswordImportCounts = {
      imported: 0,
      updated: 0,
      unchanged: 0,
      skippedExisting: 0,
    };
    if (params.rows.length === 0) {
      return counts;
    }

    // Ids are validated with zod; a hash is not (`validateInput` would echo a sample of it).
    const projectScope = { scope: 'project', projectId: params.projectId } as const;
    const userIds = params.rows.map((row) => {
      const problem = bcryptHashProblem(row.hash);
      if (problem) {
        throw new ValidationError(problem);
      }
      return validateInput(
        credentialTargetSchema,
        { scope: projectScope, userId: row.userId },
        context
      ).userId;
    });

    // One read for the whole document, in the caller's transaction (project scope: RLS
    // applies). Everything below is decided in memory.
    const current = new Map<string, CredentialWithHash>(
      (
        await this.repositories.project.findActiveMany(
          projectScope,
          [...new Set(params.rows.map((row) => row.userId))],
          transaction
        )
      ).map((record) => [record.userId, record])
    );

    for (const [index, row] of params.rows.entries()) {
      const existing = current.get(row.userId) ?? null;
      if (existing && existing.source !== 'cdm-import') {
        counts.skippedExisting += 1;
        continue;
      }
      if (existing && existing.hash === row.hash) {
        counts.unchanged += 1;
        continue;
      }
      const record = await this.write(
        projectScope,
        userIds[index],
        row.hash,
        'cdm-import',
        context,
        transaction,
        { existing }
      );
      current.set(row.userId, { ...record, hash: row.hash });
      counts[existing ? 'updated' : 'imported'] += 1;
    }
    return counts;
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
    const stored: CredentialWithHash | null = await this.run(scope, transaction, (tx) =>
      repository.findActive(scope, userId, tx)
    );

    // The compare runs with no connection held of ours.
    const verified = verifyCredentialPassword(params.password, stored?.hash ?? null);
    if (verified) {
      await this.run(scope, transaction, (tx) =>
        repository.touchLastUsed(scope, userId, new Date(), tx)
      );
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
    const stored = await this.run(target.scope, transaction, (tx) =>
      this.repositoryFor(target.scope).findActive(target.scope, target.userId, tx)
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
    return this.run(target.scope, transaction, async (tx) => {
      const removed = await this.repositoryFor(target.scope).softDelete(
        target.scope,
        target.userId,
        tx
      );
      if (!removed) {
        return false;
      }
      await this.auditFor(target.scope.scope).logSoftDelete(
        removed.id,
        auditValues(removed),
        { ...auditValues(removed), deleted: true },
        { context: 'CredentialService.removeCredential', scope: target.scope.scope },
        tx
      );
      return true;
    });
  }

  async removeAllForUser(userId: string, transaction?: Transaction): Promise<number> {
    const { userId: validUserId } = validateInput(
      credentialTargetSchema.pick({ userId: true }),
      { userId },
      'CredentialService.removeAllForUser'
    );

    const softDeleteAndAudit = async (
      records: CredentialRecord[],
      tx: Transaction | undefined
    ): Promise<number> => {
      for (const record of records) {
        await this.auditFor(record.scope).logSoftDelete(
          record.id,
          auditValues(record),
          { ...auditValues(record), deleted: true },
          { context: 'CredentialService.removeAllForUser', scope: record.scope },
          tx
        );
      }
      return records.length;
    };

    const platformRemoved = await this.platformConnection.transaction(transaction, async (tx) =>
      softDeleteAndAudit(await this.repositories.platform.softDeleteAllForUser(validUserId, tx), tx)
    );
    const projectRemoved = await softDeleteAndAudit(
      await this.repositories.project.softDeleteAllForUser(validUserId, transaction),
      transaction
    );
    // Platform and project lockout rows: the lockout service picks each one's connection.
    await this.lockouts.resetAllForUser(validUserId, transaction);
    return platformRemoved + projectRemoved;
  }

  async listForUser(userId: string, transaction?: Transaction): Promise<CredentialRecord[]> {
    const { userId: validUserId } = validateInput(
      credentialTargetSchema.pick({ userId: true }),
      { userId },
      'CredentialService.listForUser'
    );
    // The data subject's own export must be complete, whatever scope the request ran in: a
    // project-scoped RLS context would show only that project's credentials. Both tables are
    // read on the connection `platformConnection` picks (unrestricted), filtered by the user.
    return this.platformConnection.transaction(transaction, async (tx) => [
      ...(await this.repositories.platform.listActiveForUser(validUserId, tx)),
      ...(await this.repositories.project.listActiveForUser(validUserId, tx)),
    ]);
  }

  async purgeSoftDeleted(
    transaction?: Transaction
  ): Promise<{ platform: number; project: number }> {
    return this.platformConnection.transaction(transaction, async (tx) => ({
      platform: await this.repositories.platform.purgeSoftDeleted(tx),
      project: await this.repositories.project.purgeSoftDeleted(tx),
    }));
  }
}
