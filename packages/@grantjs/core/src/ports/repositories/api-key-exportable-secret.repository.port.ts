/**
 * Repository port of the encrypted exportable copy of a project user's API-key secret.
 *
 * The ciphertext triple crosses this boundary in two places only: in, through `upsertForKey`,
 * and out, through `findSealedForExport`, the one read of a copy's columns, whose only caller
 * is `ApiKeyExportableSecretService.readForExport` (the credential export). The other read,
 * `listCredentialSummaries`, returns facts about the keys and whether a copy exists, never any
 * column of the copy itself.
 */

/** The output of `sealSecret`: AES-256-GCM ciphertext, IV and tag, each base64. */
export interface SealedApiKeySecret {
  encryptedSecret: string;
  secretIv: string;
  secretTag: string;
}

/** Non-secret facts about one live project-user API key of a member. */
export interface ProjectUserApiKeySummaryRow {
  apiKeyId: string;
  clientId: string;
  /** SHA-256 of the secret as issued; `null` for a key created before it existed, not rotated since. */
  clientSecretFingerprint: string | null;
  updatedAt: Date;
  /** An encrypted copy of the key's current secret exists. */
  hasCopy: boolean;
}

/**
 * One live project-user API key of a requested member, with the sealed copy when the key has one.
 * Neither the bcrypt hash nor the plaintext is part of the row.
 */
export interface ExportableApiKeyRow {
  userId: string;
  apiKeyId: string;
  clientId: string;
  /** SHA-256 of the secret as issued; `null` for a key created before it existed, not rotated since. */
  clientSecretFingerprint: string | null;
  /** The encrypted copy of the key's current secret, `null` when the key has none. */
  sealed: SealedApiKeySecret | null;
}

export interface IApiKeyExportableSecretRepository {
  /** Insert the copy of a key, or replace it in place (one row per key). */
  upsertForKey(
    params: { apiKeyId: string; projectId: string; sealed: SealedApiKeySecret },
    transaction?: unknown
  ): Promise<void>;

  /** Delete the copies of the given keys. Resolves the number of rows deleted. */
  deleteForKeys(apiKeyIds: readonly string[], transaction?: unknown): Promise<number>;

  /** Delete every copy of a project. Resolves the number of rows deleted. */
  deleteForProject(projectId: string, transaction?: unknown): Promise<number>;

  /**
   * The member's live (not deleted, not revoked) project-user keys in the project, oldest
   * first. Reads no ciphertext and no hash.
   */
  listCredentialSummaries(
    params: { projectId: string; userId: string },
    transaction?: unknown
  ): Promise<ProjectUserApiKeySummaryRow[]>;

  /**
   * The one read of a copy's ciphertext: the live (not deleted, not revoked) project-user keys
   * of the given members **in the project**, oldest first, each with its sealed copy or `null`.
   * Runs under the project's RLS in the caller's transaction. Reads no hash.
   */
  findSealedForExport(
    params: { projectId: string; userIds: readonly string[] },
    transaction?: unknown
  ): Promise<ExportableApiKeyRow[]>;
}
