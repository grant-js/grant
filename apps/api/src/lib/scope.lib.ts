import { Scope, Tenant } from '@grantjs/schema';

import { BadRequestError } from '@/lib/errors';

/**
 * Canonical parsing for composite `scope.id` values.
 *
 * A composite id packs its tenancy chain into one delimited string:
 *
 *   accountProject             accountId:projectId
 *   organizationProject        organizationId:projectId
 *   accountProjectUser         accountId:projectId:userId
 *   organizationProjectUser    organizationId:projectId:userId
 *   projectUser                projectId:userId
 *
 * Note `projectUser` is the odd one out — the project sits at index 0, not 1.
 * That is the reason to parse through these helpers rather than inline: the
 * position of a segment depends on the tenant, so `split(':')[1]` is only
 * correct for four of the five composite forms.
 *
 * Each accessor comes in two flavours. The `*OrThrow` variants raise
 * `BadRequestError` and are what request handling wants; the plain variants
 * return `null` for callers that treat a non-composite scope as "not
 * applicable" rather than as an error.
 */

const PROJECT_TENANTS = [
  Tenant.AccountProject,
  Tenant.OrganizationProject,
  Tenant.AccountProjectUser,
  Tenant.OrganizationProjectUser,
] as const;

const PROJECT_USER_TENANTS = [
  Tenant.ProjectUser,
  Tenant.AccountProjectUser,
  Tenant.OrganizationProjectUser,
] as const;

const segments = (scope: Scope): string[] => scope.id.split(':');

/** Returns projectId when scope embeds it (composite `scope.id`), else null. */
export function tryProjectIdFromScope(scope: Scope): string | null {
  if (!PROJECT_TENANTS.includes(scope.tenant as (typeof PROJECT_TENANTS)[number])) {
    return null;
  }
  return segments(scope)[1] ?? null;
}

export function projectIdFromScopeOrThrow(scope: Scope): string {
  if (!PROJECT_TENANTS.includes(scope.tenant as (typeof PROJECT_TENANTS)[number])) {
    throw new BadRequestError(`Cannot extract projectId from tenant type: ${scope.tenant}`);
  }

  // projectId sits at index 1 for both the 2-part and 3-part forms.
  const projectId = segments(scope)[1];
  if (!projectId) {
    throw new BadRequestError(
      'Invalid scope: id must be in format "accountId:projectId" or "accountId:projectId:userId"'
    );
  }
  return projectId;
}

export function projectUserFromScopeOrThrow(scope: Scope): {
  projectId: string;
  userId: string;
} {
  if (!PROJECT_USER_TENANTS.includes(scope.tenant as (typeof PROJECT_USER_TENANTS)[number])) {
    throw new BadRequestError(
      `Cannot extract projectId and userId from tenant type: ${scope.tenant}`
    );
  }

  const parts = segments(scope);
  // ProjectUser is `projectId:userId`; the composite forms prefix an owner id.
  const [projectId, userId] =
    scope.tenant === Tenant.ProjectUser ? [parts[0], parts[1]] : [parts[1], parts[2]];

  if (!projectId || !userId) {
    throw new BadRequestError('Invalid scope: id must contain both projectId and userId');
  }
  return { projectId, userId };
}

export function accountProjectFromScopeOrThrow(scope: Scope): {
  accountId: string;
  projectId: string;
} {
  if (scope.tenant !== Tenant.AccountProject) {
    throw new BadRequestError(`Cannot extract accountProject from tenant type: ${scope.tenant}`);
  }
  const [accountId, projectId] = segments(scope);
  if (!accountId || !projectId) {
    throw new BadRequestError('Invalid scope: id must be in format "accountId:projectId"');
  }
  return { accountId, projectId };
}

export function organizationProjectFromScopeOrThrow(scope: Scope): {
  organizationId: string;
  projectId: string;
} {
  if (scope.tenant !== Tenant.OrganizationProject) {
    throw new BadRequestError(
      `Cannot extract organizationProject from tenant type: ${scope.tenant}`
    );
  }
  const [organizationId, projectId] = segments(scope);
  if (!organizationId || !projectId) {
    throw new BadRequestError('Invalid scope: id must be in format "organizationId:projectId"');
  }
  return { organizationId, projectId };
}
