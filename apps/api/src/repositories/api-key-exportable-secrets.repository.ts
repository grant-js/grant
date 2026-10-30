import type {
  ExportableApiKeyRow,
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
 * The ciphertext goes in through `upsertForKey` and leaves through exactly one read,
 * `findSealedForExport`, whose only caller is the credential export. No other method reads a
 * column of the copy, and no read of this class returns the bcrypt hash.
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

  public async findSealedForExport(
    params: { projectId: string; userIds: readonly string[] },
    transaction?: Transaction
  ): Promise<ExportableApiKeyRow[]> {
    const { projectId, userIds } = params;
    if (userIds.length === 0) {
      return [];
    }
    const dbInstance = transaction ?? this.db;
    // Every statement names the project (the pivot, and the copy's own project column in the
    // join), on top of the project RLS: a key of another project is never listed or opened.
    const rows = await dbInstance
      .select({
        userId: projectUserApiKeys.userId,
        apiKeyId: apiKeys.id,
        clientId: apiKeys.clientId,
        clientSecretFingerprint: apiKeys.clientSecretFingerprint,
        encryptedSecret: apiKeyExportableSecrets.encryptedSecret,
        secretIv: apiKeyExportableSecrets.secretIv,
        secretTag: apiKeyExportableSecrets.secretTag,
      })
      .from(projectUserApiKeys)
      .innerJoin(apiKeys, eq(apiKeys.id, projectUserApiKeys.apiKeyId))
      .leftJoin(
        apiKeyExportableSecrets,
        and(
          eq(apiKeyExportableSecrets.apiKeyId, apiKeys.id),
          eq(apiKeyExportableSecrets.projectId, projectId)
        )
      )
      .where(
        and(
          eq(projectUserApiKeys.projectId, projectId),
          inArray(projectUserApiKeys.userId, [...userIds]),
          isNull(projectUserApiKeys.deletedAt),
          isNull(apiKeys.deletedAt),
          eq(apiKeys.isRevoked, false)
        )
      )
      .orderBy(asc(apiKeys.createdAt), asc(apiKeys.id));

    return rows.map(
      (row: {
        userId: string;
        apiKeyId: string;
        clientId: string;
        clientSecretFingerprint: string | null;
        encryptedSecret: string | null;
        secretIv: string | null;
        secretTag: string | null;
      }) => ({
        userId: row.userId,
        apiKeyId: row.apiKeyId,
        clientId: row.clientId,
        clientSecretFingerprint: row.clientSecretFingerprint ?? null,
        sealed:
          row.encryptedSecret !== null && row.secretIv !== null && row.secretTag !== null
            ? {
                encryptedSecret: row.encryptedSecret,
                secretIv: row.secretIv,
                secretTag: row.secretTag,
              }
            : null,
      })
    );
  }
}
