import type {
  ExportableApiKeySecretEntry,
  IApiKeyExportableSecretRepository,
  IApiKeyExportableSecretService,
  IExportAuditLogger,
  IProjectCredentialRepository,
  IProjectUserCredentialExportService,
  ProjectPasswordCredentialSummary,
  ProjectUserApiKeyCredentialSummary,
} from '@grantjs/core';
import { CredentialKind, type ProjectUserCredentialExport } from '@grantjs/schema';

import { credentialFingerprint } from '@/lib/credential-fingerprint.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

/** Hash algorithm named in the CDM shape. Every accepted project hash is bcrypt. */
const EXPORT_ALGORITHM = 'bcrypt';

/**
 * The audited export of project credentials and the export-gated fingerprints (ADR 0011, export
 * amendment; ADR 0013 for the API-key secret kind). Password hashes are read through
 * `findHashesForExport`, the one repository read that returns hashes for them; API-key secrets
 * are decrypted by `IApiKeyExportableSecretService.readForExport`, the one decrypt path. A hash
 * or a secret leaves this class only in `exportCredentials`' result.
 *
 * Neither a hash, a password nor a secret is passed to a logger, an audit row or an error. The
 * summary audit row carries counts and kinds; the API-key row of each exported secret carries
 * the key id, the member and the kind.
 */
export class ProjectUserCredentialExportService implements IProjectUserCredentialExportService {
  constructor(
    private readonly credentials: IProjectCredentialRepository,
    private readonly audit: IExportAuditLogger,
    private readonly apiKeyCopies: IApiKeyExportableSecretRepository,
    private readonly apiKeySecrets: IApiKeyExportableSecretService,
    private readonly apiKeyAudit: IExportAuditLogger
  ) {}

  async exportCredentials(
    params: { projectId: string; userIds: readonly string[]; kinds: readonly CredentialKind[] },
    transaction?: Transaction
  ): Promise<ProjectUserCredentialExport> {
    const { projectId, userIds, kinds } = params;
    const includePassword = kinds.includes(CredentialKind.Password);
    const includeApiKeySecrets = kinds.includes(CredentialKind.ApiKeySecret);

    const rows = includePassword
      ? await this.credentials.findHashesForExport(
          { scope: 'project', projectId },
          userIds,
          transaction
        )
      : [];
    const hashByUser = new Map(rows.map((row) => [row.userId, row.hash]));

    // Every key of the requested members in this project (the repository names the project, and
    // the project's RLS applies), with the plaintext of those that have a copy.
    const keyEntries = includeApiKeySecrets
      ? await this.apiKeySecrets.readForExport({ projectId, userIds }, transaction)
      : [];
    const exportedSecrets = keyEntries.filter((entry) => entry.secret !== null);
    const keysByUser = new Map<string, ExportableApiKeySecretEntry[]>();
    for (const entry of keyEntries) {
      keysByUser.set(entry.userId, [...(keysByUser.get(entry.userId) ?? []), entry]);
    }

    // Same transaction as the reads, and `logExport` throws: no audit row, no export. One
    // summary row, then one API-key row per exported secret.
    await this.audit.logExport(
      {
        projectId,
        userCount: userIds.length,
        credentialCount: rows.length + exportedSecrets.length,
        kinds: [...kinds],
      },
      transaction
    );
    for (const entry of exportedSecrets) {
      await this.apiKeyAudit.logExport(
        { projectId, userId: entry.userId, kind: CredentialKind.ApiKeySecret },
        transaction,
        entry.apiKeyId
      );
    }

    return {
      users: userIds.map((userId) => {
        const hash = hashByUser.get(userId);
        return {
          userId,
          password: hash === undefined ? null : { algorithm: EXPORT_ALGORITHM, hash },
          apiKeySecrets: includeApiKeySecrets
            ? (keysByUser.get(userId) ?? []).map((entry) => ({
                apiKeyId: entry.apiKeyId,
                clientId: entry.clientId,
                fingerprint: entry.fingerprint,
                secret: entry.secret,
              }))
            : null,
        };
      }),
    };
  }

  async getPasswordCredentialSummaries(
    params: { projectId: string; userIds: readonly string[] },
    transaction?: Transaction
  ): Promise<ProjectPasswordCredentialSummary[]> {
    const rows = await this.credentials.findHashesForExport(
      { scope: 'project', projectId: params.projectId },
      params.userIds,
      transaction
    );
    return rows.map((row) => ({
      userId: row.userId,
      source: row.source,
      updatedAt: row.updatedAt,
      fingerprint: credentialFingerprint(row.hash),
    }));
  }

  async getApiKeyCredentialSummaries(
    params: { projectId: string; userId: string },
    transaction?: Transaction
  ): Promise<ProjectUserApiKeyCredentialSummary[]> {
    const rows = await this.apiKeyCopies.listCredentialSummaries(params, transaction);
    return rows.map((row) => ({
      apiKeyId: row.apiKeyId,
      clientId: row.clientId,
      fingerprint: row.clientSecretFingerprint,
      exportable: row.hasCopy,
      updatedAt: row.updatedAt,
    }));
  }
}
