import type { IApiKeyPermissionRepository } from '@grantjs/core';
import { apiKeyPermissions, type DbSchema } from '@grantjs/database';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

/**
 * The permissions a project API key carries instead of a role (`api_key_permissions`; the
 * table carries the project row-level policy of its sibling pivots). A removal sets
 * `deleted_at`, so the unique index over live rows lets a permission be attached again.
 */
export class ApiKeyPermissionRepository implements IApiKeyPermissionRepository {
  constructor(private readonly db: DbSchema) {}

  public async listForKey(
    apiKeyId: string,
    transaction?: Transaction
  ): Promise<{ permissionId: string }[]> {
    const dbInstance = transaction ?? this.db;
    return dbInstance
      .select({ permissionId: apiKeyPermissions.permissionId })
      .from(apiKeyPermissions)
      .where(and(eq(apiKeyPermissions.apiKeyId, apiKeyId), isNull(apiKeyPermissions.deletedAt)));
  }

  public async listForKeys(
    apiKeyIds: readonly string[],
    transaction?: Transaction
  ): Promise<{ apiKeyId: string; permissionId: string }[]> {
    if (apiKeyIds.length === 0) {
      return [];
    }
    const dbInstance = transaction ?? this.db;
    return dbInstance
      .select({
        apiKeyId: apiKeyPermissions.apiKeyId,
        permissionId: apiKeyPermissions.permissionId,
      })
      .from(apiKeyPermissions)
      .where(
        and(
          inArray(apiKeyPermissions.apiKeyId, [...apiKeyIds]),
          isNull(apiKeyPermissions.deletedAt)
        )
      );
  }

  public async addForKey(
    params: { apiKeyId: string; projectId: string; permissionIds: readonly string[] },
    transaction?: Transaction
  ): Promise<string[]> {
    const dbInstance = transaction ?? this.db;
    const { apiKeyId, projectId } = params;
    const requested = [...new Set(params.permissionIds)];
    if (requested.length === 0) {
      return [];
    }
    const rows = await dbInstance
      .insert(apiKeyPermissions)
      .values(requested.map((permissionId) => ({ apiKeyId, projectId, permissionId })))
      .onConflictDoNothing()
      .returning({ permissionId: apiKeyPermissions.permissionId });
    return rows.map((row) => row.permissionId);
  }

  public async removeForKey(
    params: { apiKeyId: string; permissionIds: readonly string[] },
    transaction?: Transaction
  ): Promise<string[]> {
    const dbInstance = transaction ?? this.db;
    const requested = [...new Set(params.permissionIds)];
    if (requested.length === 0) {
      return [];
    }
    const rows = await dbInstance
      .update(apiKeyPermissions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(apiKeyPermissions.apiKeyId, params.apiKeyId),
          inArray(apiKeyPermissions.permissionId, requested),
          isNull(apiKeyPermissions.deletedAt)
        )
      )
      .returning({ permissionId: apiKeyPermissions.permissionId });
    return rows.map((row) => row.permissionId);
  }

  public async replaceForKey(
    params: { apiKeyId: string; projectId: string; permissionIds: readonly string[] },
    transaction?: Transaction
  ): Promise<{ added: string[]; removed: string[] }> {
    const wanted = new Set(params.permissionIds);
    const current = new Set(
      (await this.listForKey(params.apiKeyId, transaction)).map((row) => row.permissionId)
    );
    const added = await this.addForKey(
      {
        apiKeyId: params.apiKeyId,
        projectId: params.projectId,
        permissionIds: [...wanted].filter((id) => !current.has(id)),
      },
      transaction
    );
    const removed = await this.removeForKey(
      {
        apiKeyId: params.apiKeyId,
        permissionIds: [...current].filter((id) => !wanted.has(id)),
      },
      transaction
    );
    return { added, removed };
  }
}
