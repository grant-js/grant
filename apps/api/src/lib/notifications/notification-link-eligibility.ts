import { type Scope, Tenant } from '@grantjs/schema';

import { tryProjectIdFromScope } from '@/lib/project-id-from-scope.lib';

/** Where a notification deep-link should send a given recipient. */
export type NotificationLinkKind = 'org_dashboard' | 'project_membership' | 'none';

export interface NotificationLinkRefs {
  refEntity: string | null;
  refId: string | null;
}

/**
 * Classify the deep-link destination for one recipient of a scoped event.
 *
 * - Org members of org / org-project events keep org dashboard refs.
 * - Project members (incl. personal-project membership) get settings membership.
 * - Everyone else gets no deep-link. Personal admin dashboard is never chosen here.
 */
export function classifyNotificationLinkKind(params: {
  tenant: Tenant;
  isOrgMember: boolean;
  isProjectMember: boolean;
  projectId: string | null;
}): NotificationLinkKind {
  const { tenant, isOrgMember, isProjectMember, projectId } = params;

  const isOrgScoped =
    tenant === Tenant.Organization ||
    tenant === Tenant.OrganizationProject ||
    tenant === Tenant.OrganizationProjectUser;

  if (isOrgScoped && isOrgMember) {
    return 'org_dashboard';
  }

  if (projectId && isProjectMember) {
    return 'project_membership';
  }

  return 'none';
}

/** Map link kind + rendered content to stored notification refs. */
export function resolveNotificationLinkRefs(params: {
  kind: NotificationLinkKind;
  contentRefs: NotificationLinkRefs;
  projectId: string | null;
}): NotificationLinkRefs {
  const { kind, contentRefs, projectId } = params;

  switch (kind) {
    case 'org_dashboard':
      return {
        refEntity: contentRefs.refEntity,
        refId: contentRefs.refId,
      };
    case 'project_membership':
      return projectId
        ? { refEntity: 'projectMembership', refId: projectId }
        : { refEntity: null, refId: null };
    case 'none':
      return { refEntity: null, refId: null };
  }
}

/** Organization id when the event scope is org-rooted (including composite project scopes). */
export function tryOrganizationIdFromNotificationScope(scope: Scope): string | null {
  switch (scope.tenant) {
    case Tenant.Organization:
      return scope.id;
    case Tenant.OrganizationProject:
    case Tenant.OrganizationProjectUser: {
      const parts = scope.id.split(':');
      return parts[0] ?? null;
    }
    default:
      return null;
  }
}

export { tryProjectIdFromScope };
