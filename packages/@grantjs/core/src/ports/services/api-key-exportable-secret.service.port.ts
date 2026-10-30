/**
 * The encrypted exportable copy of a project user's API-key secret (a per-project opt-in,
 * `projects.exportable_api_key_secrets`). A copy, when present, decrypts to the secret the
 * key's current hash verifies: every path that changes or retires the hash removes the copy.
 * The one place a copy is decrypted is `readForExport`, for the credential export.
 */

/** One live project-user API key in an export; `secret` is the plaintext, `null` without a copy. */
export interface ExportableApiKeySecretEntry {
  userId: string;
  apiKeyId: string;
  clientId: string;
  fingerprint: string | null;
  secret: string | null;
}

export interface IApiKeyExportableSecretService {
  /** Whether the project opted in. */
  isEnabled(projectId: string, transaction?: unknown): Promise<boolean>;

  /**
   * Seal the plaintext under `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY` (resolved here, never
   * logged) and write it, replacing any earlier copy of the key. `ConfigurationError` naming
   * the variable when it is not configured, so the caller issues no key.
   */
  storeForKey(
    params: { apiKeyId: string; projectId: string; clientSecret: string },
    transaction?: unknown
  ): Promise<void>;

  /** Delete the copies of the given keys. Resolves the number deleted. */
  removeForKeys(apiKeyIds: readonly string[], transaction?: unknown): Promise<number>;

  /** Delete every copy of the project. Resolves the number deleted. */
  removeForProject(projectId: string, transaction?: unknown): Promise<number>;

  /**
   * The live project-user keys of the given members in the project, oldest first, with the
   * decrypted secret of each key that has a copy and `null` for one that has none. The only
   * decrypt path: the key is resolved here at the point of use (and only when a copy exists),
   * the plaintext goes to the caller and nowhere else, and it is never logged or cached. A
   * missing key or a copy that does not decrypt is a `ConfigurationError` naming the variable,
   * never the material or the secret.
   */
  readForExport(
    params: { projectId: string; userIds: readonly string[] },
    transaction?: unknown
  ): Promise<ExportableApiKeySecretEntry[]>;
}
