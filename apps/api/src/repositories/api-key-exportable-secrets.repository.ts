import type {
  IApiKeyExportableSecretRepository,
  ProjectUserApiKeySummaryRow,
  SealedApiKeySecret,
} from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import { apiKeyExportableSecrets, apiKeys, projectUserApiKeys } from '@grantjs/database';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

/**
 * The encrypted exportable copy of a project user's API-key secret
 * (`api_key_exportable_secrets`; the table carries the project RLS policy of its sibling
 * pivots, and every statement here also names the project or the keys).
 *
 * No method reads a column of the copy: the ciphertext goes in through `upsertForKey` and
 * leaves only through a later, dedicated export read.
 */
export class ApiKeyExportableSecretRepository implements IApiKeyExportableSecretRepository {
  constructor(private readonly db: DbSchema) {}

  public async upsertForKey(
    params: { apiKeyId: string; projectId: string; sealed: SealedApiKeySecret },
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction ?? this.db;
    const { apiKeyId, projectId, sealed } = params;
    await dbInstance
      .insert(apiKeyExportableSecrets)
      .values({
        apiKeyId,
        projectId,
        encryptedSecret: sealed.encryptedSecret,
        secretIv: sealed.secretIv,
        secretTag: sealed.secretTag,
      })
      .onConflictDoUpdate({
        target: apiKeyExportableSecrets.apiKeyId,
        set: {
          projectId,
          encryptedSecret: sealed.encryptedSecret,
          secretIv: sealed.secretIv,
          secretTag: sealed.secretTag,
          updatedAt: new Date(),
        },
      });
  }

  public async deleteForKeys(
    apiKeyIds: readonly string[],
    transaction?: Transaction
  ): Promise<number> {
    if (apiKeyIds.length === 0) {
      return 0;
    }
    const dbInstance = transaction ?? this.db;
    const deleted = await dbInstance
      .delete(apiKeyExportableSecrets)
      .where(inArray(apiKeyExportableSecrets.apiKeyId, [...apiKeyIds]))
      .returning({ id: apiKeyExportableSecrets.id });
    return deleted.length;
  }

  public async deleteForProject(projectId: string, transaction?: Transaction): Promise<number> {
    const dbInstance = transaction ?? this.db;
    const deleted = await dbInstance
      .delete(apiKeyExportableSecrets)
      .where(eq(apiKeyExportableSecrets.projectId, projectId))
      .returning({ id: apiKeyExportableSecrets.id });
    return deleted.length;
  }

  public async listCredentialSummaries(
    params: { projectId: string; userId: string },
    transaction?: Transaction
  ): Promise<ProjectUserApiKeySummaryRow[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({
        apiKeyId: apiKeys.id,
        clientId: apiKeys.clientId,
        clientSecretFingerprint: apiKeys.clientSecretFingerprint,
        updatedAt: apiKeys.updatedAt,
        hasCopy: sql<boolean>`${apiKeyExportableSecrets.id} IS NOT NULL`,
      })
      .from(projectUserApiKeys)
      .innerJoin(apiKeys, eq(apiKeys.id, projectUserApiKeys.apiKeyId))
      .leftJoin(apiKeyExportableSecrets, eq(apiKeyExportableSecrets.apiKeyId, apiKeys.id))
      .where(
        and(
          eq(projectUserApiKeys.projectId, params.projectId),
          eq(projectUserApiKeys.userId, params.userId),
          isNull(projectUserApiKeys.deletedAt),
          isNull(apiKeys.deletedAt),
          eq(apiKeys.isRevoked, false)
        )
      )
      .orderBy(asc(apiKeys.createdAt), asc(apiKeys.id));

    return rows.map((row: ProjectUserApiKeySummaryRow) => ({
      apiKeyId: row.apiKeyId,
      clientId: row.clientId,
      clientSecretFingerprint: row.clientSecretFingerprint ?? null,
      updatedAt: row.updatedAt,
      hasCopy: row.hasCopy === true,
    }));
  }
}
