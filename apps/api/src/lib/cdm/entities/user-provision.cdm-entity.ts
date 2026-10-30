import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPermissionRefSpec,
  CdmTeardownContext,
  ICdmEntityHandler,
  ICdmImportTombstoneRepository,
  ICredentialService,
  IProjectUserService,
  IUserAuthenticationMethodService,
  IUserRepository,
  IUserService,
} from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';

import { config } from '@/config';
import {
  buildCdmImportMetadata,
  CDM_IMPORT_METADATA_KEY,
  CDM_SOURCE_METADATA_KEY,
  mergeCdmImporterMetadata,
} from '@/constants/cdm-import.constants';
import { ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import type { ProjectExportRepository } from '@/repositories/project-export.repository';

import {
  CDM_TOMBSTONE_KIND_USER,
  decideUserCreation,
  fingerprintDocumentKeys,
} from '../cdm-import-tombstone.lib';
import type { CdmUserProvisionInternal } from '../cdm-internal.types';
import { cdmPasswordProblem } from '../cdm-password.lib';
import { decideGrantUserMatch, grantUserMatchRefusalMessage } from '../grant-user-match.lib';
import { buildExternalKey } from '../identity.lib';

const INPUT_KEY = 'provisionedUsers' as const;

/** Positions named in a refusal; the rest are counted. Keeps a large document's error short. */
const MAX_POSITIONS_IN_MESSAGE = 10;

/**
 * What a document's keys look like to the deletion tombstones, computed once per import:
 * each key's fingerprint and the subset of them a tombstone covers for this project. Both
 * are empty when the fingerprint secret is not configured (nothing can be matched).
 */
interface TombstoneIndex {
  fingerprints: ReadonlyMap<string, string>;
  tombstoned: ReadonlySet<string>;
}

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
    private readonly credentials: ICredentialService,
    private readonly cdmImportTombstones: ICdmImportTombstoneRepository
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
      if (row.grantUserId != null && row.findBy !== 'key') {
        throw new ValidationError(
          `provisioned users[${index}]: grantUserId is only allowed with key.findBy 'key'`
        );
      }
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
    const tombstones = await this.readTombstones(ctx, input, tx);
    for (const [index, row] of input.entries()) {
      if (row.findBy === 'email') {
        await this.applyEmailIdentity(ctx, row, row.documentIndex ?? index, tombstones, tx);
        continue;
      }
      await this.applyKeyIdentity(ctx, row, row.documentIndex ?? index, tombstones, tx);
    }
  }

  /**
   * One read per import: the document's keys are fingerprinted once, here, and one query asks
   * which of them a deletion tombstone covers for this project. Without the fingerprint secret
   * no key has a fingerprint, so nothing is read and nothing can be skipped (the secret is a
   * requirement of tombstones, which could not have been written without it either).
   */
  private async readTombstones(
    ctx: CdmApplyContext,
    input: readonly CdmUserProvisionInternal[],
    tx: Transaction
  ): Promise<TombstoneIndex> {
    const fingerprints = fingerprintDocumentKeys(
      input.map((row) => row.externalKey),
      config.cdm.apiKeyFingerprintHmacSecret
    );
    const tombstoned =
      fingerprints.size === 0
        ? new Set<string>()
        : await this.cdmImportTombstones.filterTombstoned(
            {
              projectId: ctx.projectId,
              kind: CDM_TOMBSTONE_KIND_USER,
              fingerprints: [...fingerprints.values()],
            },
            tx
          );
    return { fingerprints, tombstoned };
  }

  /**
   * The skip rule, asked at the two places an identity is about to be **created** and nowhere
   * else: when a tombstone covers the key the row is not created, not recorded as produced and
   * its key goes on `ctx.skippedUserKeys`, so the assignment, API-key and password steps drop
   * it; the result only counts it. Returns whether the row was skipped.
   */
  private skipIfTombstoned(
    ctx: CdmApplyContext,
    externalKey: string,
    tombstones: TombstoneIndex
  ): boolean {
    const decision = decideUserCreation({
      fingerprint: tombstones.fingerprints.get(externalKey),
      tombstoned: tombstones.tombstoned,
    });
    if (decision === 'create') return false;
    ctx.skippedUserKeys.add(externalKey);
    ctx.result.usersSkippedTombstoned += 1;
    return true;
  }

  /**
   * The `findBy: key` path: reuse the user an earlier import keyed, else the existing Grant
   * user the document names with `grantUserId`, else create one. The decision itself is
   * `decideGrantUserMatch`; this reads its facts and acts on it. A matched user is not
   * created and its global metadata is not touched: the assignment step writes the marker on
   * the membership row, as it does for every provisioned user.
   */
  private async applyKeyIdentity(
    ctx: CdmApplyContext,
    row: CdmUserProvisionInternal,
    position: number,
    tombstones: TombstoneIndex,
    tx: Transaction
  ): Promise<void> {
    const userIdFoundByKey = await this.userRepository.findUserIdByCdmImport(
      {
        projectId: ctx.projectId,
        kind: 'user',
        externalKey: row.externalKey,
      },
      tx
    );
    const grantUserId = row.grantUserId ?? null;
    const candidate =
      userIdFoundByKey == null && grantUserId != null
        ? await this.userRepository.findLiveUserCdmMarkers(
            { userId: grantUserId, projectId: ctx.projectId },
            tx
          )
        : null;

    const decision = decideGrantUserMatch({
      projectId: ctx.projectId,
      externalKey: row.externalKey,
      grantUserId,
      userIdFoundByKey,
      candidate,
      userIdsProducedUnderOtherKeys: new Set(
        [...ctx.produced.userIds].flatMap(([key, id]) =>
          key === row.externalKey ? [] : [id.toLowerCase()]
        )
      ),
    });

    switch (decision.outcome) {
      case 'refused':
        throw new ValidationError(grantUserMatchRefusalMessage(position, decision.refusal));
      case 'reuse-keyed':
      case 'matched':
        this.recordProducedUser(ctx, row.externalKey, decision.userId);
        return;
      case 'create': {
        if (this.skipIfTombstoned(ctx, row.externalKey, tombstones)) return;
        const metadata = mergeCdmImporterMetadata(
          buildCdmImportMetadata(ctx.projectId, 'user', row.externalKey),
          row.metadata
        );
        const user = await this.users.createUser({ name: row.name.trim(), metadata }, tx);
        this.recordProducedUser(ctx, row.externalKey, user.id);
        ctx.result.usersCreated += 1;
        return;
      }
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
      // A skipped user has no identity and no membership: their password is dropped, not an error.
      if (row.password == null || ctx.skippedUserKeys.has(row.externalKey)) continue;
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
    position: number,
    tombstones: TombstoneIndex,
    tx: Transaction
  ): Promise<void> {
    const emailMethod = await this.userAuthenticationMethods.getUserAuthenticationMethodByEmail(
      row.externalKey,
      tx
    );
    // Liveness: a soft delete leaves the user's e-mail method in place, and the method lookup
    // does not look at the user, so a method of a deleted user must not count as a live
    // identity here. The one liveness read is the one the `grantUserId` match already uses.
    const methodOwnerIsLive =
      emailMethod == null ||
      (await this.userRepository.findLiveUserCdmMarkers(
        { userId: emailMethod.userId, projectId: ctx.projectId },
        tx
      )) !== null;
    const existingAuthMethod = methodOwnerIsLive ? emailMethod : null;
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

    // An Email method of a deleted user keeps the address taken (one live method per address),
    // so no new method can be added for it below.
    if (emailMethod?.provider === UserAuthenticationMethodProvider.Email && !methodOwnerIsLive) {
      await this.applyEmailHeldByDeletedUser(ctx, row, position, tombstones, tx);
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

    if (this.skipIfTombstoned(ctx, row.externalKey, tombstones)) return;
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

  /**
   * The address's e-mail method belongs to a soft-deleted user, so it is not a live identity.
   * The address stays taken (the method is unique per address), so no new method can be added
   * for it. A live user that carries the key is still the document's user and is never
   * blocked; otherwise a tombstone covering the key skips the row, and anything else is
   * refused, naming the position only: the previous behaviour attached the deleted user to
   * the project.
   */
  private async applyEmailHeldByDeletedUser(
    ctx: CdmApplyContext,
    row: CdmUserProvisionInternal,
    position: number,
    tombstones: TombstoneIndex,
    tx: Transaction
  ): Promise<void> {
    const liveUserIdByKey = await this.userRepository.findUserIdByCdmImport(
      { projectId: ctx.projectId, kind: 'user', externalKey: row.externalKey },
      tx
    );
    if (liveUserIdByKey) {
      this.recordProducedUser(ctx, row.externalKey, liveUserIdByKey);
      return;
    }
    if (this.skipIfTombstoned(ctx, row.externalKey, tombstones)) return;
    throw new ValidationError(
      `users[${position}]: the e-mail identity belongs to a deleted account`
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
