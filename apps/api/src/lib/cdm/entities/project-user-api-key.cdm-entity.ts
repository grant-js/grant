import type {
  CdmApplyContext,
  CdmExportContext,
  CdmPermissionRefSpec,
  CdmTeardownContext,
  IApiKeyService,
  ICdmEntityHandler,
  IProjectUserApiKeyService,
} from '@grantjs/core';
import { Tenant } from '@grantjs/schema';

import {
  buildCdmImportMetadata,
  CDM_IMPORT_METADATA_KEY,
  extractProjectUserMetadataForCdmExport,
  mergeCdmImporterMetadata,
} from '@/constants/cdm-import.constants';
import { ValidationError } from '@/lib/errors';
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

/**
 * CDM handler for {@link project_user_api_keys}: export identity (no secret);
 * import requires BYOK `clientSecret`. Runs after {@link UserAssignmentCdmEntity}.
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

  public async teardown(ctx: CdmTeardownContext): Promise<void> {
    const tx = ctx.tx as Transaction;
    const ids = await this.importRepo.listCdmProjectUserApiKeyIdsForProject(ctx.projectId, tx);
    for (const id of ids) {
      await this.apiKeys.deleteApiKey({ id, hardDelete: true }, tx);
    }
  }

  public async apply(
    ctx: CdmApplyContext,
    input: readonly CdmProjectUserApiKeyInternal[]
  ): Promise<void> {
    const tx = ctx.tx as Transaction;
    for (const row of input) {
      const effectiveUserId = resolveApiKeyUserId(row, ctx);
      if (!ctx.assignmentUserIds.has(effectiveUserId)) {
        throw new ValidationError(
          `projectUserApiKeys: user ${effectiveUserId} is not part of this import's user assignments`
        );
      }
      const secret = row.clientSecret?.trim();
      if (!secret) {
        throw new ValidationError(
          `projectUserApiKeys: clientSecret is required for each key (user ${effectiveUserId})`
        );
      }

      const created = await this.apiKeys.createApiKeyForCdmImport(
        {
          clientSecret: secret,
          clientId: row.clientId ?? undefined,
          scope: { tenant: Tenant.ProjectUser, id: `${ctx.projectId}:${effectiveUserId}` },
          name: row.name ?? undefined,
          description: row.description ?? undefined,
          expiresAt: row.expiresAt != null ? new Date(row.expiresAt as string | Date) : undefined,
        },
        tx
      );

      const importBase = buildCdmImportMetadata(
        ctx.projectId,
        'projectUserApiKey',
        row.externalKey ?? undefined
      );
      const pivotMetadata = mergeCdmImporterMetadata(importBase, row.metadata ?? undefined);

      await this.projectUserApiKeys.addProjectUserApiKey(
        {
          projectId: ctx.projectId,
          userId: effectiveUserId,
          apiKeyId: created.id,
          metadata: pivotMetadata,
        },
        tx
      );
      ctx.result.projectUserApiKeysCreated += 1;
    }
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
   * `extractProjectUserMetadataForCdmExport`. `clientSecret` is never emitted.
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
        const cdm = row.pivotMetadata[CDM_IMPORT_METADATA_KEY] as CdmImportMetadataBlock | undefined;
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
