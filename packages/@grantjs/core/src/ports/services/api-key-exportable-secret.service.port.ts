/**
 * The encrypted exportable copy of a project user's API-key secret (a per-project opt-in,
 * `projects.exportable_api_key_secrets`). A copy, when present, decrypts to the secret the
 * key's current hash verifies: every path that changes or retires the hash removes the copy.
 * Nothing here decrypts a copy.
 */
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
}
