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
}
