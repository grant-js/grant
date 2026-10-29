import type { CredentialKind, ProjectUserCredentialExport } from '@grantjs/schema';

import type { CredentialSource } from '../repositories/credential.repository.port';

/**
 * Non-secret facts about a project password credential. `fingerprint` is the lowercase hex
 * SHA-256 of the stored hash string: a change detector, not a secret. Never the hash itself.
 */
export interface ProjectPasswordCredentialSummary {
  userId: string;
  source: CredentialSource;
  updatedAt: Date;
  fingerprint: string;
}

/**
 * The one place a project credential hash leaves Grant (ADR 0011, export amendment), and the
 * fingerprint that lets a caller with the same permission see a hash change without the hash.
 * Both read through the one named repository method `findHashesForExport`.
 *
 * Authorization is the transport's (`ProjectUser:ExportCredentials`); membership of every
 * user is the caller's to establish first. Both run in the caller's transaction, under the
 * project's RLS.
 */
export interface IProjectUserCredentialExportService {
  /**
   * Export in CDM shape, in the order of `userIds`: `password: { algorithm: 'bcrypt', hash }`
   * for a member with a live project credential, `null` for one without. Writes exactly one
   * audit row (`action = 'export'`, counts and kinds only) in the same transaction, so a
   * failed audit write fails the export.
   */
  exportCredentials(
    params: { projectId: string; userIds: readonly string[]; kinds: readonly CredentialKind[] },
    transaction?: unknown
  ): Promise<ProjectUserCredentialExport>;

  /**
   * Summaries (never the hash) for the members that have a live project credential; others
   * are absent. Not audited: nothing secret leaves.
   */
  getPasswordCredentialSummaries(
    params: { projectId: string; userIds: readonly string[] },
    transaction?: unknown
  ): Promise<ProjectPasswordCredentialSummary[]>;
}
