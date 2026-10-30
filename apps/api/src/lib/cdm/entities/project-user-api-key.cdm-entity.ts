import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPermissionRefSpec,
  CdmTeardownContext,
  IApiKeyService,
  ICdmEntityHandler,
  IProjectUserApiKeyService,
} from '@grantjs/core';
import { CdmModeStrategy, Tenant } from '@grantjs/schema';

import { config } from '@/config';
import {
  buildCdmImportMetadata,
  CDM_IMPORT_METADATA_KEY,
  extractProjectUserMetadataForCdmExport,
  mergeCdmImporterMetadata,
} from '@/constants/cdm-import.constants';
import {
  type CdmDocumentApiKeyForClassify,
  type CdmExistingApiKeyFingerprint,
  classifyCdmApiKeyReplace,
  fingerprintCdmApiKeySecret,
  withCdmApiKeySecretFingerprint,
} from '@/lib/cdm/cdm-api-key-fingerprint.lib';
import {
  peekPreparedCdmApiKeyHashByClassifyKey,
  peekPreparedCdmApiKeyHashes,
} from '@/lib/cdm/hash-cdm-api-key-secrets.lib';
import { credentialFingerprint } from '@/lib/credential-fingerprint.lib';
import { ValidationError } from '@/lib/errors';
import { hashSecretAsync } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import type { ProjectExportRepository } from '@/repositories/project-export.repository';
import type { ProjectImportRepository } from '@/repositories/project-import.repository';
import { clientSecretSchema } from '@/services/cdm.schemas';

import type { CdmProjectUserApiKeyInternal } from '../cdm-internal.types';
import { buildExternalKey } from '../identity.lib';

const INPUT_KEY = 'projectUserApiKeys' as const;

type CdmImportMetadataBlock = {
  projectId?: string;
  kind?: string;
  externalKey?: string;
};

type PreparedApiKey = {
  userId: string;
  row: CdmProjectUserApiKeyInternal;
  secret: string;
  classifyKey: string;
  documentIndex: number;
};

/**
 * CDM handler for {@link project_user_api_keys}: export identity (no secret);
 * import requires BYOK `clientSecret`. Runs after {@link UserAssignmentCdmEntity}.
 *
 * Replace matches by importer `externalKey` + HMAC fingerprint. Merge still creates.
 * Keys without `externalKey` do not keep/rotate.
 */
export class ProjectUserApiKeyCdmEntity implements ICdmEntityHandler<
  CdmProjectUserApiKeyInternal,
  CdmProjectUserApiKeyInternal
> {
  public readonly handlerKind = 'projectUserApiKey';
  public readonly inputKey = INPUT_KEY;
  public readonly order = 300;

  constructor(
    private readonly importRepo: ProjectImportRepository,
    private readonly exportRepo: ProjectExportRepository,
    private readonly apiKeys: IApiKeyService,
    private readonly projectUserApiKeys: IProjectUserApiKeyService
  ) {}

  public validateInput(input: readonly CdmProjectUserApiKeyInternal[]): void {
    const externalKeys = new Set<string>();
    for (const row of input) {
      if (row.externalKey != null && row.externalKey !== '') {
        if (externalKeys.has(row.externalKey)) {
          throw new ValidationError(`Duplicate projectUserApiKeys externalKey: ${row.externalKey}`);
        }
        externalKeys.add(row.externalKey);
      }
      const secret = row.clientSecret?.trim() ?? '';
      if (!secret) {
        throw new ValidationError(
          'projectUserApiKeys: clientSecret is required for each key on import (BYOK)'
        );
      }
      const parsed = clientSecretSchema.safeParse(secret);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid clientSecret');
      }
    }
  }

  public collectPermissionRefs(
    _input: readonly CdmProjectUserApiKeyInternal[]
  ): readonly CdmPermissionRefSpec[] {
    return [];
  }

  /**
   * Replace set-diff lives in {@link apply} so unchanged keys can be kept.
   * Other handlers still teardown-then-apply.
   */
  public async teardown(_ctx: CdmTeardownContext): Promise<void> {}

  public async apply(
    ctx: CdmApplyContext,
    input: readonly CdmProjectUserApiKeyInternal[]
  ): Promise<void> {
    const tx = ctx.tx as Transaction;
    const prepared = this.prepareRows(ctx, input);

    if (ctx.modeStrategy === CdmModeStrategy.Replace) {
      await this.applyReplace(ctx, prepared, tx);
      return;
    }

    if (prepared.length === 0) {
      return;
    }
    await this.createKeys(ctx, prepared, tx);
    ctx.result.projectUserApiKeysCreated += prepared.length;
  }

  /**
   * Project current `project_user_api_keys` rows back to `ProjectUserApiKeyCdmInput[]`.
   *
   * Identity: prefer `metadata.cdmImport.externalKey` from the pivot (set on import);
   * otherwise `externalKey = buildExternalKey('apikey', clientId, userId)` using
   * identity resolved by {@link ProjectExportRepository.getProjectUserApiKeyExportIdentities}.
   *
   * The Grant client id is preserved on the row itself (not as identity); the
   * importer-supplied `cdmSource` history is preserved via
   * `extractProjectUserMetadataForCdmExport`. `clientSecret` and `cdmImport`
   * (including the secret fingerprint) are never emitted.
   */
  public async export(ctx: CdmExportContext): Promise<readonly CdmProjectUserApiKeyInternal[]> {
    const tx = ctx.tx as Transaction | undefined;
    const [rows, provisionedUsers] = await Promise.all([
      this.exportRepo.getProjectUserApiKeysForCdmExport(ctx.projectId, tx),
      this.exportRepo.getProjectCdmProvisionedUsers(ctx.projectId, tx),
    ]);
    const provisionKeyByUserId = new Map<string, string>();
    for (const p of provisionedUsers) {
      const imp = p.metadata['cdmImport'] as { externalKey?: string } | undefined;
      const ext = imp?.externalKey;
      provisionKeyByUserId.set(
        p.userId,
        ext && ext.length > 0 ? ext : buildExternalKey('user', p.userId, p.name)
      );
    }

    const derivedKeyApiKeyIds = rows
      .filter((row) => {
        const cdm = row.pivotMetadata[CDM_IMPORT_METADATA_KEY] as
          CdmImportMetadataBlock | undefined;
        const importerExternalKey = cdm?.externalKey;
        return importerExternalKey == null || importerExternalKey === '';
      })
      .map((row) => row.apiKeyId);
    const exportIdentities = await this.exportRepo.getProjectUserApiKeyExportIdentities(
      ctx.projectId,
      derivedKeyApiKeyIds,
      tx
    );

    return rows.map((row) => {
      const { apiKeyId, clientId, userId, name, description, expiresAt, pivotMetadata } = row;
      const cdm = pivotMetadata[CDM_IMPORT_METADATA_KEY] as CdmImportMetadataBlock | undefined;
      const importerExternalKey =
        cdm?.externalKey != null && cdm.externalKey !== '' ? cdm.externalKey : null;
      const identity = exportIdentities.get(apiKeyId);
      if (importerExternalKey == null && identity == null) {
        throw new ValidationError(
          `projectUserApiKeys: missing export identity for apiKeyId ${apiKeyId}`
        );
      }
      const externalKey =
        importerExternalKey ?? buildExternalKey('apikey', identity!.clientId, identity!.userId);
      const userKey = provisionKeyByUserId.get(userId);
      const base = {
        clientId,
        name: name ?? undefined,
        description: description ?? undefined,
        expiresAt:
          expiresAt != null
            ? expiresAt instanceof Date
              ? expiresAt
              : new Date(String(expiresAt))
            : undefined,
        externalKey,
        metadata: extractProjectUserMetadataForCdmExport(pivotMetadata) ?? undefined,
      };
      if (userKey != null) {
        return { ...base, userKey, userId: undefined };
      }
      return { ...base, userId, userKey: undefined };
    });
  }

  private prepareRows(
    ctx: CdmApplyContext,
    input: readonly CdmProjectUserApiKeyInternal[]
  ): PreparedApiKey[] {
    const prepared: PreparedApiKey[] = [];
    for (const [documentIndex, row] of input.entries()) {
      // The provision step skipped this user (a deletion tombstone covers the key): no
      // identity exists to own a key, so the key is dropped, silently and uncounted.
      if (row.userKey != null && ctx.skippedUserKeys.has(row.userKey)) continue;
      const effectiveUserId = resolveApiKeyUserId(row, ctx);
      if (!ctx.assignmentUserIds.has(effectiveUserId)) {
        throw new ValidationError(
          `projectUserApiKeys: user ${effectiveUserId} is not part of this import's user assignments`
        );
      }
      const secret = row.clientSecret?.trim() ?? '';
      if (!secret && !row.clientSecretHash?.trim()) {
        throw new ValidationError(
          `projectUserApiKeys: clientSecret is required for each key (user ${effectiveUserId})`
        );
      }
      const externalKey = row.externalKey?.trim() ? row.externalKey.trim() : null;
      prepared.push({
        userId: effectiveUserId,
        row,
        secret,
        classifyKey: externalKey ?? `__anon:${documentIndex}`,
        documentIndex,
      });
    }
    return prepared;
  }

  private async applyReplace(
    ctx: CdmApplyContext,
    prepared: readonly PreparedApiKey[],
    tx: Transaction
  ): Promise<void> {
    const existing = await this.importRepo.listCdmProjectUserApiKeysForReplace(ctx.projectId, tx);
    const documentKeys: CdmDocumentApiKeyForClassify[] = prepared.map((item) => ({
      classifyKey: item.classifyKey,
      externalKey: item.row.externalKey?.trim() ? item.row.externalKey.trim() : null,
      secret: item.secret,
      documentIndex: item.documentIndex,
    }));
    const classified = classifyCdmApiKeyReplace(
      documentKeys,
      existing,
      config.cdm.apiKeyFingerprintHmacSecret
    );

    const deleteIds = classified.delete.map((row) => row.apiKeyId);
    if (deleteIds.length > 0) {
      await this.apiKeys.deleteApiKeysForCdmImport({ ids: deleteIds }, tx);
    }
    ctx.result.projectUserApiKeysDeleted += classified.delete.length;

    const preparedByClassifyKey = new Map(prepared.map((item) => [item.classifyKey, item]));

    const rotateItems = classified.rotate.map((row) => {
      const item = preparedByClassifyKey.get(row.document.classifyKey);
      if (!item) {
        throw new ValidationError('projectUserApiKeys: replace rotate is missing a document key');
      }
      return { item, existing: row.existing };
    });
    if (rotateItems.length > 0) {
      const rotateHashes = await resolveCdmApiKeyHashes(rotateItems.map((row) => row.item));
      await this.apiKeys.rotateApiKeysForCdmImport(
        {
          keys: rotateItems.map((row, index) => ({
            id: row.existing.apiKeyId,
            clientSecretHash: rotateHashes[index]!,
            clientSecretFingerprint: fingerprintOfHashedSecret(row.item),
          })),
        },
        tx
      );
      await this.writeFingerprints(
        ctx.projectId,
        rotateItems.map((row) => ({ item: row.item, existing: row.existing })),
        tx
      );
    }
    ctx.result.projectUserApiKeysRotated += classified.rotate.length;

    // A kept key holds the secret the document supplies (the HMAC matched), so a key that has
    // no plaintext fingerprint yet gets it now instead of waiting for its next rotation. The
    // secret, the hash and the copy table are not touched.
    const keepFingerprints = classified.keep
      .filter((row) => !row.existing.clientSecretFingerprint)
      .map((row) => ({
        id: row.existing.apiKeyId,
        clientSecretFingerprint: credentialFingerprint(row.document.secret),
      }));
    if (keepFingerprints.length > 0) {
      await this.apiKeys.setMissingClientSecretFingerprintsForCdmImport(
        { keys: keepFingerprints },
        tx
      );
    }
    ctx.result.projectUserApiKeysUnchanged += classified.keep.length;

    const createItems = classified.create.map((row) => {
      const item = preparedByClassifyKey.get(row.document.classifyKey);
      if (!item) {
        throw new ValidationError('projectUserApiKeys: replace create is missing a document key');
      }
      return item;
    });
    if (createItems.length > 0) {
      await this.createKeys(ctx, createItems, tx);
    }
    ctx.result.projectUserApiKeysCreated += createItems.length;
  }

  private async createKeys(
    ctx: CdmApplyContext,
    prepared: readonly PreparedApiKey[],
    tx: Transaction
  ): Promise<void> {
    const hashes = await resolveCdmApiKeyHashes(prepared);
    const created = await this.apiKeys.createApiKeysForCdmImport(
      {
        keys: prepared.map((item, index) => ({
          clientSecretHash: hashes[index]!,
          clientSecretFingerprint: fingerprintOfHashedSecret(item),
          clientId: item.row.clientId ?? undefined,
          scope: { tenant: Tenant.ProjectUser, id: `${ctx.projectId}:${item.userId}` },
          name: item.row.name ?? undefined,
          description: item.row.description ?? undefined,
          expiresAt:
            item.row.expiresAt != null ? new Date(item.row.expiresAt as string | Date) : undefined,
        })),
      },
      tx
    );

    await this.projectUserApiKeys.addProjectUserApiKeysForCdmImport(
      {
        links: created.map((key, index) => {
          const item = prepared[index]!;
          const fingerprint = fingerprintForSecret(item.secret, item.row.externalKey);
          const importBase = buildCdmImportMetadata(
            ctx.projectId,
            'projectUserApiKey',
            item.row.externalKey ?? undefined,
            fingerprint
          );
          return {
            projectId: ctx.projectId,
            userId: item.userId,
            apiKeyId: key.id,
            metadata: mergeCdmImporterMetadata(importBase, item.row.metadata ?? undefined),
          };
        }),
      },
      tx
    );
  }

  private async writeFingerprints(
    projectId: string,
    rows: readonly { item: PreparedApiKey; existing: CdmExistingApiKeyFingerprint }[],
    tx: Transaction
  ): Promise<void> {
    const updates = rows.flatMap((row) => {
      const fingerprint = fingerprintForSecret(row.item.secret, row.item.row.externalKey);
      if (!fingerprint) {
        return [];
      }
      const metadata = withCdmApiKeySecretFingerprint(row.existing.metadata ?? {}, fingerprint);
      return [{ apiKeyId: row.existing.apiKeyId, projectId, metadata }];
    });
    await this.importRepo.updateCdmProjectUserApiKeyMetadata(updates, tx);
  }
}

async function resolveCdmApiKeyHashes(prepared: readonly PreparedApiKey[]): Promise<string[]> {
  return Promise.all(
    prepared.map(async (item) => {
      if (item.row.clientSecretHash?.trim()) {
        return item.row.clientSecretHash.trim();
      }
      const byKey = peekPreparedCdmApiKeyHashByClassifyKey(item.classifyKey);
      if (byKey) {
        return byKey;
      }
      const ready = peekPreparedCdmApiKeyHashes();
      if (ready != null && ready.length === prepared.length) {
        const index = prepared.indexOf(item);
        const hash = ready[index];
        if (hash) {
          return hash;
        }
      }
      if (!item.secret) {
        throw new ValidationError('projectUserApiKeys: clientSecret is required for each key');
      }
      return hashSecretAsync(item.secret);
    })
  );
}

/**
 * SHA-256 of the plaintext the stored hash is made from, `null` when the importer supplied only
 * a hash (the plaintext is then unknown, so no fingerprint is claimed).
 */
function fingerprintOfHashedSecret(item: PreparedApiKey): string | null {
  if (item.row.clientSecretHash?.trim() || !item.secret) {
    return null;
  }
  return credentialFingerprint(item.secret);
}

function fingerprintForSecret(
  secret: string,
  externalKey: string | null | undefined
): string | undefined {
  if (!externalKey?.trim() || !secret) {
    return undefined;
  }
  const digest = fingerprintCdmApiKeySecret(secret, config.cdm.apiKeyFingerprintHmacSecret);
  return digest || undefined;
}

function resolveApiKeyUserId(row: CdmProjectUserApiKeyInternal, ctx: CdmApplyContext): string {
  if (row.userId != null && row.userId !== '') {
    return row.userId;
  }
  if (row.userKey != null && row.userKey !== '') {
    const id = ctx.produced.userIds.get(row.userKey);
    if (!id) {
      throw new ValidationError(`projectUserApiKeys: unresolved userKey '${row.userKey}'`);
    }
    return id;
  }
  throw new ValidationError('projectUserApiKeys: each entry requires userId or userKey');
}
