import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPermissionRefSpec,
  CdmTeardownContext,
  ICdmEntityHandler,
  ICredentialService,
  IProjectUserService,
  IUserAuthenticationMethodService,
  IUserRepository,
  IUserService,
} from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';

import {
  buildCdmImportMetadata,
  CDM_IMPORT_METADATA_KEY,
  CDM_SOURCE_METADATA_KEY,
  mergeCdmImporterMetadata,
} from '@/constants/cdm-import.constants';
import { ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import type { ProjectExportRepository } from '@/repositories/project-export.repository';

import type { CdmUserProvisionInternal } from '../cdm-internal.types';
import { cdmPasswordProblem } from '../cdm-password.lib';
import { buildExternalKey } from '../identity.lib';

const INPUT_KEY = 'provisionedUsers' as const;

/** Positions named in a refusal; the rest are counted. Keeps a large document's error short. */
const MAX_POSITIONS_IN_MESSAGE = 10;

/** Names positions only: never an address, never a hash. */
function passwordWithoutMembershipMessage(positions: readonly number[]): string {
  const shown = positions.slice(0, MAX_POSITIONS_IN_MESSAGE).map((p) => `users[${p}]`);
  const more = positions.length - shown.length;
  return (
    `${shown.join(', ')}${more > 0 ? ` and ${more} more` : ''}: a password is only imported for a member of the project. ` +
    'Assign the user in this document (roles, groups or permissions) or import the password for an existing member'
  );
}

/** CDM-marked Grant users for inbound porting (`metadata.cdmImport.kind === 'user'`). */
export class UserProvisionCdmEntity implements ICdmEntityHandler<
  CdmUserProvisionInternal,
  CdmUserProvisionInternal
> {
  public readonly handlerKind = 'user';
  public readonly inputKey = INPUT_KEY;
  public readonly order = 15;

  constructor(
    private readonly exportRepo: ProjectExportRepository,
    private readonly users: IUserService,
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    private readonly userRepository: IUserRepository,
    private readonly projectUsers: IProjectUserService,
    private readonly credentials: ICredentialService
  ) {}

  public validateInput(input: readonly CdmUserProvisionInternal[]): void {
    const keys = new Set<string>();
    for (const [index, row] of input.entries()) {
      if (row.externalKey == null || row.externalKey === '') {
        throw new ValidationError('users[]: externalKey is required for each entry');
      }
      if (row.findBy === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.externalKey)) {
        throw new ValidationError(`users[${row.externalKey}]: externalKey must be a valid email`);
      }
      if (keys.has(row.externalKey)) {
        throw new ValidationError(`Duplicate users externalKey: ${row.externalKey}`);
      }
      keys.add(row.externalKey);
      if (typeof row.name !== 'string' || row.name.trim() === '') {
        throw new ValidationError(`users[${row.externalKey}]: name is required`);
      }
      if (row.password != null) {
        if (row.findBy !== 'email') {
          throw new ValidationError(
            `provisioned users[${index}]: password is only allowed with key.findBy 'email'`
          );
        }
        const problem = cdmPasswordProblem(row.password);
        if (problem) {
          throw new ValidationError(`provisioned users[${index}]: ${problem}`);
        }
      }
    }
  }

  public collectPermissionRefs(
    _input: readonly CdmUserProvisionInternal[]
  ): readonly CdmPermissionRefSpec[] {
    return [];
  }

  /**
   * Users are global entities — CDM does not delete Grant accounts on replace-import.
   */
  public async teardown(_ctx: CdmTeardownContext): Promise<void> {
    return;
  }

  public async apply(
    ctx: CdmApplyContext,
    input: readonly CdmUserProvisionInternal[]
  ): Promise<void> {
    const tx = ctx.tx as Transaction;
    for (const row of input) {
      if (row.findBy === 'email') {
        await this.applyEmailIdentity(ctx, row, tx);
        continue;
      }

      const existingId = await this.userRepository.findUserIdByCdmImport(
        {
          projectId: ctx.projectId,
          kind: 'user',
          externalKey: row.externalKey,
        },
        tx
      );
      if (existingId) {
        ctx.produced.userIds.set(row.externalKey, existingId);
        ctx.assignmentUserIds.add(existingId);
        continue;
      }
      const metadata = mergeCdmImporterMetadata(
        buildCdmImportMetadata(ctx.projectId, 'user', row.externalKey),
        row.metadata
      );
      const user = await this.users.createUser({ name: row.name.trim(), metadata }, tx);
      ctx.produced.userIds.set(row.externalKey, user.id);
      ctx.assignmentUserIds.add(user.id);
      ctx.result.usersCreated += 1;
    }
  }

  /**
   * ADR 0011 § 4: `users[].password` becomes the importing project's credential, in a step
   * after **every** `apply`, so the membership the assignment step creates exists, in the
   * same transaction (the project's RLS applies; there is no login-role or cross-tenant read).
   *
   * Membership is decided here, not in `validateInput`, which is a pure function with no
   * view of existing members: a person with a password must be a member of this project
   * now, either assigned by this document or already one. Otherwise the import fails and
   * rolls back, naming the positions and never an address or a hash.
   */
  public async postApply(
    ctx: CdmApplyContext,
    input: readonly CdmUserProvisionInternal[]
  ): Promise<void> {
    const tx = ctx.tx as Transaction;
    const rows: Array<{ position: number; userId: string | undefined; hash: string }> = [];
    for (const [index, row] of input.entries()) {
      if (row.password == null) continue;
      rows.push({
        position: row.documentIndex ?? index,
        userId: ctx.produced.userIds.get(row.externalKey),
        hash: row.password.hash,
      });
    }
    if (rows.length === 0) return;

    const memberIds = new Set(
      await this.projectUsers.filterMemberUserIds(
        {
          projectId: ctx.projectId,
          userIds: [...new Set(rows.flatMap((r) => (r.userId ? [r.userId] : [])))],
        },
        tx
      )
    );
    const rejected = rows.filter((r) => r.userId === undefined || !memberIds.has(r.userId));
    if (rejected.length > 0) {
      throw new ValidationError(passwordWithoutMembershipMessage(rejected.map((r) => r.position)));
    }

    const counts = await this.credentials.importProjectPasswordHashes(
      {
        projectId: ctx.projectId,
        rows: rows.map((r) => ({ userId: r.userId as string, hash: r.hash })),
      },
      tx
    );
    ctx.result.passwordsImported += counts.imported;
    ctx.result.passwordsUpdated += counts.updated;
    ctx.result.passwordsUnchanged += counts.unchanged;
    ctx.result.passwordsSkippedExisting += counts.skippedExisting;
  }

  private async applyEmailIdentity(
    ctx: CdmApplyContext,
    row: CdmUserProvisionInternal,
    tx: Transaction
  ): Promise<void> {
    const existingAuthMethod =
      await this.userAuthenticationMethods.getUserAuthenticationMethodByEmail(row.externalKey, tx);
    if (existingAuthMethod) {
      if (existingAuthMethod.provider === UserAuthenticationMethodProvider.Github) {
        await this.userAuthenticationMethods.createUserAuthenticationMethod(
          {
            userId: existingAuthMethod.userId,
            provider: UserAuthenticationMethodProvider.Email,
            providerId: row.externalKey,
            providerData: {},
            isVerified: false,
          },
          tx
        );
      }
      this.recordProducedUser(ctx, row.externalKey, existingAuthMethod.userId);
      return;
    }

    const existingCdmUserId = await this.userRepository.findUserIdByCdmImport(
      {
        projectId: ctx.projectId,
        kind: 'user',
        externalKey: row.externalKey,
      },
      tx
    );
    if (existingCdmUserId) {
      await this.userAuthenticationMethods.createUserAuthenticationMethod(
        {
          userId: existingCdmUserId,
          provider: UserAuthenticationMethodProvider.Email,
          providerId: row.externalKey,
          providerData: {},
          isVerified: false,
        },
        tx
      );
      this.recordProducedUser(ctx, row.externalKey, existingCdmUserId);
      return;
    }

    const metadata = mergeCdmImporterMetadata(
      buildCdmImportMetadata(ctx.projectId, 'user', row.externalKey),
      row.metadata
    );
    const user = await this.users.createUser({ name: row.name.trim(), metadata }, tx);
    await this.userAuthenticationMethods.createUserAuthenticationMethod(
      {
        userId: user.id,
        provider: UserAuthenticationMethodProvider.Email,
        providerId: row.externalKey,
        providerData: {},
        isVerified: false,
      },
      tx
    );
    this.recordProducedUser(ctx, row.externalKey, user.id);
    ctx.result.usersCreated += 1;
  }

  private recordProducedUser(ctx: CdmApplyContext, externalKey: string, userId: string): void {
    ctx.produced.userIds.set(externalKey, userId);
    ctx.assignmentUserIds.add(userId);
  }

  public async export(ctx: CdmExportContext): Promise<readonly CdmUserProvisionInternal[]> {
    const tx = ctx.tx as Transaction | undefined;
    const rows = await this.exportRepo.getProjectCdmProvisionedUsers(ctx.projectId, tx);
    return rows.map((r) => {
      const cdmSource = extractCdmSourceMetadata(r.metadata);
      const metadata = {
        ...(cdmSource ?? {}),
        grantUserId: r.userId,
      };
      return {
        externalKey: buildExternalKey('user', r.userId, r.name),
        findBy: 'key',
        name: r.name,
        metadata,
      };
    });
  }
}

function extractCdmSourceMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> | null {
  const source = metadata[CDM_SOURCE_METADATA_KEY];
  if (source == null || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }
  const out = { ...(source as Record<string, unknown>) };
  delete out[CDM_IMPORT_METADATA_KEY];
  return Object.keys(out).length > 0 ? out : null;
}
