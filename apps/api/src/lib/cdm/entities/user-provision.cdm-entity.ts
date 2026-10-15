import { timingSafeEqual } from 'node:crypto';

import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPermissionRefSpec,
  CdmTeardownContext,
  ICdmEntityHandler,
  IUserAuthenticationMethodService,
  IUserRepository,
  IUserService,
} from '@grantjs/core';
import { type UserAuthenticationMethod, UserAuthenticationMethodProvider } from '@grantjs/schema';

import {
  buildCdmImportMetadata,
  CDM_IMPORT_METADATA_KEY,
  CDM_SOURCE_METADATA_KEY,
  mergeCdmImporterMetadata,
  PASSWORD_SOURCE_CDM_IMPORT,
  PASSWORD_SOURCE_PROVIDER_DATA_KEY,
} from '@/constants/cdm-import.constants';
import { ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import type { ProjectExportRepository } from '@/repositories/project-export.repository';

import type { CdmUserProvisionInternal } from '../cdm-internal.types';
import { cdmPasswordProblem } from '../cdm-password.lib';
import { buildExternalKey } from '../identity.lib';

const INPUT_KEY = 'provisionedUsers' as const;

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
    private readonly userRepository: IUserRepository
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
    const skippedBefore = ctx.result.passwordsSkippedExisting;
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

    const skipped = ctx.result.passwordsSkippedExisting - skippedBefore;
    if (skipped > 0) {
      ctx.result.warnings.push(
        `${skipped} password(s) were not imported because the email identity or its credential is not this import's to write (counted in passwordsSkippedExisting)`
      );
    }
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
      if (row.password) {
        await this.applyPasswordToExistingMethod(ctx, row, existingAuthMethod, tx);
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
          providerData: importedCredentialProviderData({}, row),
          isVerified: false,
        },
        tx
      );
      if (row.password) ctx.result.passwordsImported += 1;
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
        providerData: importedCredentialProviderData({}, row),
        isVerified: false,
      },
      tx
    );
    if (row.password) ctx.result.passwordsImported += 1;
    this.recordProducedUser(ctx, row.externalKey, user.id);
    ctx.result.usersCreated += 1;
  }

  /**
   * An identity that already exists before this row is applied.
   *
   * The credential is global, so a project's document may only write one it has a claim
   * to (ADR 0010 § Security notes): an identity an earlier import of this project
   * created. Anything else (a user who registered, signed in with GitHub or Google, or
   * was provisioned by another project) is somebody else's account, and importing a
   * password onto it would let a project administrator sign in as that person.
   *
   * Within that claim, ownership is forward-only. An import-sourced credential belongs to
   * the importing system, so a different hash replaces it and an identical one is a no-op.
   * A credential set in Grant (no marker) is never touched. An absent `password` never
   * reaches this method, so an import never deletes a credential.
   */
  private async applyPasswordToExistingMethod(
    ctx: CdmApplyContext,
    row: CdmUserProvisionInternal,
    method: UserAuthenticationMethod,
    tx: Transaction
  ): Promise<void> {
    const incoming = row.password!.hash;
    const providerData = (method.providerData as Record<string, unknown> | null) ?? {};
    const storedHash =
      typeof providerData.hashedPassword === 'string' && providerData.hashedPassword.length > 0
        ? providerData.hashedPassword
        : null;

    const isEmailMethod = method.provider === UserAuthenticationMethodProvider.Email;
    const provisionedByThisProject =
      isEmailMethod &&
      (await this.userRepository.findUserIdByCdmImport(
        { projectId: ctx.projectId, kind: 'user', externalKey: row.externalKey },
        tx
      )) === method.userId;
    if (!provisionedByThisProject) {
      ctx.result.passwordsSkippedExisting += 1;
      return;
    }

    if (storedHash === null) {
      if (method.isVerified) {
        ctx.result.passwordsSkippedExisting += 1;
        return;
      }
      await this.writeCredential(method, providerData, row, tx);
      ctx.result.passwordsImported += 1;
      return;
    }

    if (providerData[PASSWORD_SOURCE_PROVIDER_DATA_KEY] !== PASSWORD_SOURCE_CDM_IMPORT) {
      ctx.result.passwordsSkippedExisting += 1;
      return;
    }
    if (sameHash(storedHash, incoming)) {
      ctx.result.passwordsUnchanged += 1;
      return;
    }
    await this.writeCredential(method, providerData, row, tx);
    ctx.result.passwordsUpdated += 1;
  }

  private async writeCredential(
    method: UserAuthenticationMethod,
    providerData: Record<string, unknown>,
    row: CdmUserProvisionInternal,
    tx: Transaction
  ): Promise<void> {
    await this.userAuthenticationMethods.updateUserAuthenticationMethod(
      method.id,
      { providerData: importedCredentialProviderData(providerData, row) },
      tx
    );
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

/**
 * `providerData` for an email method carrying the imported credential: the hash where
 * platform login reads it (`hashedPassword`, as `changePassword` writes it) and the marker
 * that the importing system still owns it. Without a password, `base` unchanged.
 */
function importedCredentialProviderData(
  base: Record<string, unknown>,
  row: CdmUserProvisionInternal
): Record<string, unknown> {
  if (!row.password) {
    return base;
  }
  return {
    ...base,
    hashedPassword: row.password.hash,
    [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
  };
}

function sameHash(stored: string, incoming: string): boolean {
  const a = Buffer.from(stored);
  const b = Buffer.from(incoming);
  return a.length === b.length && timingSafeEqual(a, b);
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
