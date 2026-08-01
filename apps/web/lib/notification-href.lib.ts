import type { NotificationScope } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';

interface ParsedScopeIds {
  accountId?: string;
  organizationId?: string;
  projectId?: string;
}

/** Parse composite scope ids into route segment ids. */
export function parseNotificationScopeIds(scope: NotificationScope): ParsedScopeIds {
  const parts = scope.id.split(':');

  switch (scope.tenant) {
    case Tenant.Organization:
      return { organizationId: scope.id };
    case Tenant.Account:
      return { accountId: scope.id };
    case Tenant.OrganizationProject:
      return { organizationId: parts[0], projectId: parts[1] };
    case Tenant.AccountProject:
      return { accountId: parts[0], projectId: parts[1] };
    default:
      return {};
  }
}

/**
 * Build a dashboard href for a notification row when scope + refEntity allow a
 * safe deep-link. Never returns personal account project admin URLs.
 */
export function buildNotificationHref(params: {
  refEntity: string | null;
  refId: string | null;
  scope?: NotificationScope | null;
}): string | null {
  const { refEntity, refId, scope } = params;
  if (!refEntity) return null;

  if (refEntity === 'projectMembership') {
    if (!refId) return null;
    return `/dashboard/settings/projects/${refId}`;
  }

  if (!scope) return null;

  const ids = parseNotificationScopeIds(scope);

  switch (refEntity) {
    case 'role': {
      if (!refId) return null;
      if (ids.organizationId && ids.projectId) {
        return `/dashboard/organizations/${ids.organizationId}/projects/${ids.projectId}/roles/${refId}`;
      }
      if (ids.organizationId) {
        return `/dashboard/organizations/${ids.organizationId}/roles/${refId}`;
      }
      return null;
    }
    case 'permission': {
      if (ids.organizationId && ids.projectId) {
        return `/dashboard/organizations/${ids.organizationId}/projects/${ids.projectId}/permissions`;
      }
      return null;
    }
    case 'apiKey': {
      if (ids.organizationId && ids.projectId) {
        return `/dashboard/organizations/${ids.organizationId}/projects/${ids.projectId}/api-keys`;
      }
      return null;
    }
    case 'organizationInvitation': {
      if (ids.organizationId) {
        return `/dashboard/organizations/${ids.organizationId}/members`;
      }
      return null;
    }
    case 'organization': {
      const orgId = refId ?? ids.organizationId;
      return orgId ? `/dashboard/organizations/${orgId}` : null;
    }
    case 'userRole': {
      if (ids.organizationId && ids.projectId) {
        return `/dashboard/organizations/${ids.organizationId}/projects/${ids.projectId}/users`;
      }
      return null;
    }
    default:
      return null;
  }
}
