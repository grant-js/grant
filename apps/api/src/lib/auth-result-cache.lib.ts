import { Scope, Tenant } from '@grantjs/schema';

import { AUTH_RESULT_CACHE_KEY_PREFIX } from '@/constants/cache.constants';
import { tryProjectIdFromScope } from '@/lib/scope.lib';

/**
 * Delimiter-anchored prefixes of the `{tenant}:{scopeId}:…` segment in an
 * `auth:result:{userId}:…` key. A write in this scope must miss every listed
 * prefix; neighbouring ids (`org-1` vs `org-10`) do not share a prefix.
 */
export function authResultTenantPrefixes(
  scope: Scope,
  projectIds: readonly string[] = []
): string[] {
  const prefixes = new Set<string>([`${scope.tenant}:${scope.id}:`]);

  const addProjectUserPrefixes = () => {
    for (const projectId of projectIds) {
      if (projectId) {
        prefixes.add(`${Tenant.ProjectUser}:${projectId}:`);
      }
    }
  };

  switch (scope.tenant) {
    case Tenant.Organization:
      prefixes.add(`${Tenant.OrganizationProject}:${scope.id}:`);
      prefixes.add(`${Tenant.OrganizationProjectUser}:${scope.id}:`);
      addProjectUserPrefixes();
      break;
    case Tenant.Account:
      prefixes.add(`${Tenant.AccountProject}:${scope.id}:`);
      prefixes.add(`${Tenant.AccountProjectUser}:${scope.id}:`);
      addProjectUserPrefixes();
      break;
    case Tenant.OrganizationProject:
      prefixes.add(`${Tenant.OrganizationProjectUser}:${scope.id}:`);
      {
        const projectId = tryProjectIdFromScope(scope);
        if (projectId) {
          prefixes.add(`${Tenant.ProjectUser}:${projectId}:`);
        }
      }
      break;
    case Tenant.AccountProject:
      prefixes.add(`${Tenant.AccountProjectUser}:${scope.id}:`);
      {
        const projectId = tryProjectIdFromScope(scope);
        if (projectId) {
          prefixes.add(`${Tenant.ProjectUser}:${projectId}:`);
        }
      }
      break;
    default:
      break;
  }

  return [...prefixes];
}

export function authResultKeyMatchesTenant(
  key: string,
  scope: Scope,
  projectIds: readonly string[] = []
): boolean {
  if (!key.startsWith(AUTH_RESULT_CACHE_KEY_PREFIX)) {
    return false;
  }

  const afterPrefix = key.slice(AUTH_RESULT_CACHE_KEY_PREFIX.length);
  const userEnd = afterPrefix.indexOf(':');
  if (userEnd <= 0) {
    return false;
  }

  const afterUser = afterPrefix.slice(userEnd + 1);
  return authResultTenantPrefixes(scope, projectIds).some((prefix) => afterUser.startsWith(prefix));
}
