/**
 * Repository port of the permissions a project API key carries instead of a role
 * (`api_key_permissions`). The key's tenant lives on its pivot row; `projectId` is stored here
 * for the project row-level policy.
 */
export interface IApiKeyPermissionRepository {
  /** Live permission ids of one key. */
  listForKey(apiKeyId: string, transaction?: unknown): Promise<{ permissionId: string }[]>;

  /** Live permission ids of several keys, one row per key and permission. */
  listForKeys(
    apiKeyIds: readonly string[],
    transaction?: unknown
  ): Promise<{ apiKeyId: string; permissionId: string }[]>;

  /** Adds the permissions the key does not carry yet; returns the ids that were added. */
  addForKey(
    params: { apiKeyId: string; projectId: string; permissionIds: readonly string[] },
    transaction?: unknown
  ): Promise<string[]>;

  /** Removes the given permissions from the key; returns the ids that were removed. */
  removeForKey(
    params: { apiKeyId: string; permissionIds: readonly string[] },
    transaction?: unknown
  ): Promise<string[]>;

  /** Makes the key carry exactly the given permissions. */
  replaceForKey(
    params: { apiKeyId: string; projectId: string; permissionIds: readonly string[] },
    transaction?: unknown
  ): Promise<{ added: string[]; removed: string[] }>;
}
