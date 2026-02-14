/**
 * Port for resolving entity IDs that belong to a given scope (tenant + id).
 * CacheHandler implements this; handlers and resolvers depend on the interface only.
 */
import type { Scope } from '@grantjs/schema';

export interface IScopedIdProvider {
  getScopedProjectIds(scope: Scope): Promise<string[]>;
  getScopedRoleIds(scope: Scope): Promise<string[]>;
  getScopedUserIds(scope: Scope): Promise<string[]>;
  getScopedGroupIds(scope: Scope): Promise<string[]>;
  getScopedPermissionIds(scope: Scope): Promise<string[]>;
  getScopedResourceIds(scope: Scope): Promise<string[]>;
  getScopedTagIds(scope: Scope): Promise<string[]>;
  getScopedApiKeyIds(scope: Scope): Promise<string[]>;
}
