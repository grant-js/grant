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
 * Non-secret facts about one live project-user API key. `fingerprint` is the lowercase hex
 * SHA-256 of the secret string as issued, stored at create, rotate and import; `null` for a key
 * created before it existed and not rotated since. `exportable`: an encrypted copy exists.
 * Never the secret, the hash or the ciphertext.
 */
export interface ProjectUserApiKeyCredentialSummary {
  apiKeyId: string;
  clientId: string;
  fingerprint: string | null;
  exportable: boolean;
  updatedAt: Date;
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
   * Export in CDM shape, in the order of `userIds`. For `PASSWORD`: `password: { algorithm:
   * 'bcrypt', hash }` for a member with a live project credential, `null` for one without (and
   * when the kind was not requested). For `API_KEY_SECRET`: `apiKeySecrets`, the member's live
   * project-user keys with the plaintext `secret` of each key that has an exportable copy and
   * `null` for one that has none (`null` when the kind was not requested, `[]` for no keys).
   *
   * Writes, in the same transaction, one summary audit row (`action = 'export'`, counts and
   * kinds only) and one `api_key_audit_logs` row per exported secret (the key id, never the
   * secret), so a failed audit write fails the export.
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

  /**
   * The member's live project-user API keys with their stored fingerprint and whether a copy
   * exists, oldest first (`[]` for none). Not audited: nothing secret leaves, and no secret,
   * hash or ciphertext is read.
   */
  getApiKeyCredentialSummaries(
    params: { projectId: string; userId: string },
    transaction?: unknown
  ): Promise<ProjectUserApiKeyCredentialSummary[]>;
}
