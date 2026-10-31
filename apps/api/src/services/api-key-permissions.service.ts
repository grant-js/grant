import type {
  IApiKeyPermissionRepository,
  IApiKeyPermissionService,
  IAuditLogger,
  IPermissionRepository,
} from '@grantjs/core';

import type { Transaction } from '@/lib/transaction-manager.lib';

/**
 * Writes the permissions a project API key carries instead of a role. Whether the caller may
 * attach them is decided before, by `ApiKeyAttenuationService`; this writes the rows and one
 * audit row per permission (`{ permissionId, resource, action }`, never a secret).
 */
export class ApiKeyPermissionService implements IApiKeyPermissionService {
  constructor(
    private readonly apiKeyPermissionRepository: IApiKeyPermissionRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly audit: IAuditLogger
  ) {}

  public async attach(
    params: { apiKeyId: string; projectId: string; permissionIds: readonly string[] },
    transaction?: Transaction
  ): Promise<void> {
    const { apiKeyId, projectId } = params;
    const permissionIds = [...new Set(params.permissionIds)];
    if (permissionIds.length === 0) {
      return;
    }

    const added = new Set(
      await this.apiKeyPermissionRepository.addForKey(
        { apiKeyId, projectId, permissionIds },
        transaction
      )
    );
    const refs = await this.permissionRepository.getPermissionRefsByIds(permissionIds, transaction);

    for (const ref of refs) {
      if (!added.has(ref.id)) {
        continue;
      }
      await this.audit.logAction(
        {
          entityId: apiKeyId,
          action: 'ADD_PERMISSION',
          newValues: { permissionId: ref.id, resource: ref.resource, action: ref.action },
        },
        transaction
      );
    }
  }

  public async listForKey(apiKeyId: string, transaction?: Transaction): Promise<string[]> {
    const rows = await this.apiKeyPermissionRepository.listForKey(apiKeyId, transaction);
    return rows.map((row) => row.permissionId);
  }

  public async listForKeys(
    apiKeyIds: readonly string[],
    transaction?: Transaction
  ): Promise<Map<string, string[]>> {
    const rows = await this.apiKeyPermissionRepository.listForKeys(apiKeyIds, transaction);
    const byKey = new Map<string, string[]>();
    for (const row of rows) {
      byKey.set(row.apiKeyId, [...(byKey.get(row.apiKeyId) ?? []), row.permissionId]);
    }
    return byKey;
  }

  public async replace(
    params: {
      apiKeyId: string;
      projectId: string;
      permissionIds: readonly string[];
      fromRoleId?: string | null;
    },
    transaction?: Transaction
  ): Promise<{ added: string[]; removed: string[] }> {
    const { apiKeyId, projectId, fromRoleId } = params;
    const permissionIds = [...new Set(params.permissionIds)];
    const { added, removed } = await this.apiKeyPermissionRepository.replaceForKey(
      { apiKeyId, projectId, permissionIds },
      transaction
    );
    if (added.length === 0 && removed.length === 0 && !fromRoleId) {
      return { added, removed };
    }

    const refs = new Map(
      (
        await this.permissionRepository.getPermissionRefsByIds([...added, ...removed], transaction)
      ).map((ref) => [ref.id, ref])
    );
    const describe = (permissionId: string) => ({
      permissionId,
      resource: refs.get(permissionId)?.resource ?? null,
      action: refs.get(permissionId)?.action ?? null,
    });
    const metadata = fromRoleId ? { fromRoleId } : undefined;

    for (const permissionId of added) {
      await this.audit.logAction(
        {
          entityId: apiKeyId,
          action: 'ADD_PERMISSION',
          newValues: describe(permissionId),
          metadata,
        },
        transaction
      );
    }
    for (const permissionId of removed) {
      await this.audit.logAction(
        {
          entityId: apiKeyId,
          action: 'REMOVE_PERMISSION',
          oldValues: describe(permissionId),
          metadata,
        },
        transaction
      );
    }
    await this.audit.logAction(
      {
        entityId: apiKeyId,
        action: 'UPDATE_API_KEY_PERMISSIONS',
        newValues: {
          added: added.length,
          removed: removed.length,
          ...(fromRoleId && { convertedFromRoleId: fromRoleId }),
        },
      },
      transaction
    );

    return { added, removed };
  }
}
