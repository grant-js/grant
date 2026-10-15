import { timingSafeEqual } from 'node:crypto';

import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPasswordIdentity,
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
  PASSWORD_CONFLICT_PROVIDER_DATA_KEY,
  PASSWORD_SOURCE_CDM_IMPORT,
  PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY,
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
    const conflictsBefore = ctx.result.passwordsSkippedConflict;
    const identities = await this.loadPasswordIdentities(ctx, input);
    for (const row of input) {
      if (row.findBy === 'email') {
        await this.applyEmailIdentity(ctx, row, tx, identities);
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
    const conflicts = ctx.result.passwordsSkippedConflict - conflictsBefore;
    if (conflicts > 0) {
      ctx.result.warnings.push(
        `${conflicts} password(s) were not imported because projects of this organization imported different passwords for the same identity; neither was kept and those users sign in through password reset (counted in passwordsSkippedConflict)`
      );
    }
  }

  /**
   * One batched resolution for every email row that carries a password, before any row is
   * applied (ADR 0010, Amendment): who each existing email identity is, whether it is
   * confined to the importing organization, and which import created it. Eligibility is then
   * decided in memory, so an import with N rows costs a constant number of extra queries,
   * not N. Skipped when no row carries a password.
   */
  private async loadPasswordIdentities(
    ctx: CdmApplyContext,
    input: readonly CdmUserProvisionInternal[]
  ): Promise<ReadonlyMap<string, CdmPasswordIdentity>> {
    const emails = input
      .filter((row) => row.findBy === 'email' && row.password)
      .map((row) => row.externalKey);
    if (emails.length === 0) return new Map();
    const identities = await this.userRepository.findCdmPasswordIdentities({
      projectId: ctx.projectId,
      emails,
    });
    return new Map(identities.map((identity) => [identity.methodId, identity]));
  }

  private async applyEmailIdentity(
    ctx: CdmApplyContext,
    row: CdmUserProvisionInternal,
    tx: Transaction,
    identities: ReadonlyMap<string, CdmPasswordIdentity>
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
        // Only an Email method is ever a target. An identity found through GitHub or Google
        // is a real account that was not created by an import, so it is never this import's
        // to write to (the Email method added above for GitHub stays passwordless).
        if (existingAuthMethod.provider === UserAuthenticationMethodProvider.Email) {
          await this.applyPasswordToExistingMethod(
            ctx,
            row,
            existingAuthMethod,
            identities.get(existingAuthMethod.id),
            tx
          );
        } else {
          ctx.result.passwordsSkippedExisting += 1;
        }
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
          providerData: importedCredentialProviderData({}, row, ctx.projectId),
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
        providerData: importedCredentialProviderData({}, row, ctx.projectId),
        isVerified: false,
      },
      tx
    );
    if (row.password) ctx.result.passwordsImported += 1;
    this.recordProducedUser(ctx, row.externalKey, user.id);
    ctx.result.usersCreated += 1;
  }

  /**
   * An identity that already exists before this row is applied (ADR 0010, Amendment:
   * org-scoped eligibility and conflict handling).
   *
   * **Eligibility.** The credential is global (one email, one identity, one password across
   * every organization), and an import is tenant-controlled input, so it may write one only
   * onto an identity that no other organization relies on: the user is **confined to the
   * importing project's organization** (every active project and organization membership is
   * that organization's, and there is at least one) and does not also sign in with GitHub or
   * Google. An identity this project's own import created (`metadata.cdmImport.projectId`)
   * is eligible on its own. Anything else (a user who registered or works in another
   * organization, or was provisioned there) is somebody else's account, and importing a
   * password onto it would let a project administrator sign in as that person. The
   * identities are resolved for the whole import up front, so this method issues no query of
   * its own.
   *
   * **Ownership** is forward-only. An import-sourced credential belongs to the importing
   * system only while the address is unverified. A credential set in Grant (no marker), or any
   * credential on a verified method, is never touched. An absent `password` never reaches this
   * method, so an import never deletes a credential.
   *
   * **Several environments of one organization** may import different hashes for the same
   * person. The credential records the project that wrote it (`passwordSourceProjectId`):
   * the same project replaces its own hash and an identical hash from any project changes
   * nothing, but a different hash from a different project is a conflict. The stored hash is
   * then removed and a tombstone left, so neither environment's password wins and the
   * outcome does not depend on import order; later imports skip the row and the user signs in
   * through password reset, which clears the tombstone.
   */
  private async applyPasswordToExistingMethod(
    ctx: CdmApplyContext,
    row: CdmUserProvisionInternal,
    method: UserAuthenticationMethod,
    identity: CdmPasswordIdentity | undefined,
    tx: Transaction
  ): Promise<void> {
    const incoming = row.password!.hash;
    const providerData = (method.providerData as Record<string, unknown> | null) ?? {};
    const storedHash =
      typeof providerData.hashedPassword === 'string' && providerData.hashedPassword.length > 0
        ? providerData.hashedPassword
        : null;

    if (!isEligibleIdentity(ctx.projectId, row, method, identity)) {
      ctx.result.passwordsSkippedExisting += 1;
      return;
    }

    // A tombstone is never written over: only a password set in Grant clears it.
    if (providerData[PASSWORD_CONFLICT_PROVIDER_DATA_KEY] === true) {
      ctx.result.passwordsSkippedConflict += 1;
      return;
    }

    if (storedHash === null) {
      if (method.isVerified) {
        ctx.result.passwordsSkippedExisting += 1;
        return;
      }
      await this.writeCredential(method, providerData, row, ctx.projectId, tx);
      ctx.result.passwordsImported += 1;
      return;
    }

    if (providerData[PASSWORD_SOURCE_PROVIDER_DATA_KEY] !== PASSWORD_SOURCE_CDM_IMPORT) {
      ctx.result.passwordsSkippedExisting += 1;
      return;
    }
    // Verification is the handover: once the owner has proved the mailbox, Grant owns the
    // credential exactly as after changePassword or resetPassword, whatever the marker says.
    if (method.isVerified) {
      ctx.result.passwordsSkippedExisting += 1;
      return;
    }
    if (sameHash(storedHash, incoming)) {
      ctx.result.passwordsUnchanged += 1;
      return;
    }
    if (credentialSourceProjectId(providerData, identity) === ctx.projectId) {
      await this.writeCredential(method, providerData, row, ctx.projectId, tx);
      ctx.result.passwordsUpdated += 1;
      return;
    }
    await this.writeConflictTombstone(method, providerData, tx);
    ctx.result.passwordsSkippedConflict += 1;
  }

  private async writeCredential(
    method: UserAuthenticationMethod,
    providerData: Record<string, unknown>,
    row: CdmUserProvisionInternal,
    projectId: string,
    tx: Transaction
  ): Promise<void> {
    await this.userAuthenticationMethods.updateUserAuthenticationMethod(
      method.id,
      { providerData: importedCredentialProviderData(providerData, row, projectId) },
      tx
    );
  }

  /**
   * Two projects disagree about the password: drop the imported hash and the project that
   * wrote it, keep the import marker, and flag the conflict. `providerData` is replaced as a
   * whole, so no `hashedPassword` survives; resetting the password in Grant is the way out.
   */
  private async writeConflictTombstone(
    method: UserAuthenticationMethod,
    providerData: Record<string, unknown>,
    tx: Transaction
  ): Promise<void> {
    const tombstone = { ...providerData };
    delete tombstone.hashedPassword;
    delete tombstone[PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY];
    tombstone[PASSWORD_SOURCE_PROVIDER_DATA_KEY] = PASSWORD_SOURCE_CDM_IMPORT;
    tombstone[PASSWORD_CONFLICT_PROVIDER_DATA_KEY] = true;
    await this.userAuthenticationMethods.updateUserAuthenticationMethod(
      method.id,
      { providerData: tombstone },
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
 * platform login reads it (`hashedPassword`, as `changePassword` writes it), the marker that
 * the importing system still owns it, and the project that wrote it. Without a password,
 * `base` unchanged.
 */
function importedCredentialProviderData(
  base: Record<string, unknown>,
  row: CdmUserProvisionInternal,
  projectId: string
): Record<string, unknown> {
  if (!row.password) {
    return base;
  }
  const data: Record<string, unknown> = {
    ...base,
    hashedPassword: row.password.hash,
    [PASSWORD_SOURCE_PROVIDER_DATA_KEY]: PASSWORD_SOURCE_CDM_IMPORT,
    [PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY]: projectId,
  };
  delete data[PASSWORD_CONFLICT_PROVIDER_DATA_KEY];
  return data;
}

/**
 * Whether this import may write a credential onto the existing email method: the identity is
 * the one the batched lookup resolved for exactly this address (the lookup used for the row
 * matches with `ILIKE`, so `_` and `%` in an imported address are wildcards there), and it is
 * either created by this project's own import or confined to the importing organization and
 * not also a GitHub or Google account.
 */
function isEligibleIdentity(
  projectId: string,
  row: CdmUserProvisionInternal,
  method: UserAuthenticationMethod,
  identity: CdmPasswordIdentity | undefined
): identity is CdmPasswordIdentity {
  if (
    !identity ||
    identity.userId !== method.userId ||
    identity.providerId.trim().toLowerCase() !== row.externalKey.trim().toLowerCase()
  ) {
    return false;
  }
  const cdm = identity.cdmImport;
  if (cdm?.projectId === projectId && cdm.kind === 'user' && cdm.externalKey === row.externalKey) {
    return true;
  }
  return identity.confinedToImportingOrganization && !identity.hasOAuthMethod;
}

/**
 * The project whose import wrote the marked credential. A credential v1.16.0 wrote carries
 * no `passwordSourceProjectId`; v1.16.0 only wrote onto identities its own project created,
 * so that project (`metadata.cdmImport.projectId`) is the source. `null` when neither says.
 */
function credentialSourceProjectId(
  providerData: Record<string, unknown>,
  identity: CdmPasswordIdentity
): string | null {
  const recorded = providerData[PASSWORD_SOURCE_PROJECT_ID_PROVIDER_DATA_KEY];
  if (typeof recorded === 'string' && recorded.length > 0) return recorded;
  return identity.cdmImport?.projectId ?? null;
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
