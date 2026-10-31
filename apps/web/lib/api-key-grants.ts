import type { ApiKey, ApiKeyAttachableGrants, Scope } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';

export type ApiKeyGrantKind = 'role' | 'scopes';

export function isProjectApiKeyScope(scope: Scope | null | undefined): scope is Scope {
  return scope?.tenant === Tenant.AccountProject || scope?.tenant === Tenant.OrganizationProject;
}

/** The tenant a project key's role belongs to: `orgId:projectId` -> the organization (or account). */
export function getApiKeyParentScope(scope: Scope | null | undefined): Scope | null {
  if (!isProjectApiKeyScope(scope)) return null;
  const [parentId] = scope.id.split(':');
  if (!parentId) return null;
  return {
    tenant: scope.tenant === Tenant.AccountProject ? Tenant.Account : Tenant.Organization,
    id: parentId,
  };
}

/** A project key carries exactly one of a role or permissions; any other key carries neither. */
export function getApiKeyGrantKind(
  apiKey: Pick<ApiKey, 'role' | 'permissions'>
): ApiKeyGrantKind | null {
  if (apiKey.permissions) return 'scopes';
  if (apiKey.role) return 'role';
  return null;
}

export interface ApiKeyCohort {
  permissionIds: ReadonlySet<string>;
  roleIds: ReadonlySet<string>;
}

export function toApiKeyCohort(
  grants: Pick<ApiKeyAttachableGrants, 'permissions' | 'roles'> | null | undefined
): ApiKeyCohort | null {
  if (!grants) return null;
  return {
    permissionIds: new Set(grants.permissions.map((entry) => entry.permission.id)),
    roleIds: new Set(grants.roles.map((role) => role.id)),
  };
}

/**
 * Whether the caller covers the key, derived from the cohort the server computed for them.
 * It only hides actions that would be refused; the server stays the authority (it re-checks
 * every revoke, rotate, delete and edit). A key that carries neither a role nor permissions
 * has nothing to compare, so it is left to the server.
 */
export function canManageApiKeyFromCohort(
  apiKey: Pick<ApiKey, 'role' | 'permissions'>,
  cohort: ApiKeyCohort | null
): boolean {
  const kind = getApiKeyGrantKind(apiKey);
  if (kind === null) return true;
  if (!cohort) return false;
  if (kind === 'scopes') {
    return (apiKey.permissions ?? []).every((permission) =>
      cohort.permissionIds.has(permission.id)
    );
  }
  return cohort.roleIds.has(apiKey.role!.id);
}

/** Permissions of a role the caller may attach: the role's effective set limited to the cohort. */
export function intersectWithCohort(
  permissionIds: readonly string[],
  cohort: ApiKeyCohort | null
): string[] {
  if (!cohort) return [];
  return permissionIds.filter((id) => cohort.permissionIds.has(id));
}
