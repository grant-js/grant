/**
 * Repository port of the encrypted exportable copy of a project user's API-key secret.
 *
 * The ciphertext triple crosses this boundary in one direction only: in, through
 * `upsertForKey`. The one read, `listCredentialSummaries`, returns facts about the keys and
 * whether a copy exists, never any column of the copy itself.
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
}
