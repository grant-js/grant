import type {
  IExportAuditLogger,
  IProjectCredentialRepository,
  IProjectUserCredentialExportService,
  ProjectPasswordCredentialSummary,
} from '@grantjs/core';
import { CredentialKind, type ProjectUserCredentialExport } from '@grantjs/schema';

import { credentialFingerprint } from '@/lib/credential-fingerprint.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

/** Hash algorithm named in the CDM shape. Every accepted project hash is bcrypt. */
const EXPORT_ALGORITHM = 'bcrypt';

/**
 * The audited export of project password hashes and the export-gated fingerprint (ADR 0011,
 * export amendment). Both read through `findHashesForExport`, the one repository read that
 * returns hashes for them; the hash leaves this class only in `exportCredentials`' result.
 *
 * Neither a hash nor a password is passed to a logger, an audit row or an error. The audit
 * row carries counts and kinds.
 */
export class ProjectUserCredentialExportService implements IProjectUserCredentialExportService {
  constructor(
    private readonly credentials: IProjectCredentialRepository,
    private readonly audit: IExportAuditLogger
  ) {}

  async exportCredentials(
    params: { projectId: string; userIds: readonly string[]; kinds: readonly CredentialKind[] },
    transaction?: Transaction
  ): Promise<ProjectUserCredentialExport> {
    const { projectId, userIds, kinds } = params;
    const includePassword = kinds.includes(CredentialKind.Password);

    const rows = includePassword
      ? await this.credentials.findHashesForExport(
          { scope: 'project', projectId },
          userIds,
          transaction
        )
      : [];
    const hashByUser = new Map(rows.map((row) => [row.userId, row.hash]));

    // Same transaction as the read, and `logExport` throws: no audit row, no export.
    await this.audit.logExport(
      { projectId, userCount: userIds.length, credentialCount: rows.length, kinds: [...kinds] },
      transaction
    );

    return {
      users: userIds.map((userId) => {
        const hash = hashByUser.get(userId);
        return {
          userId,
          password: hash === undefined ? null : { algorithm: EXPORT_ALGORITHM, hash },
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
}
