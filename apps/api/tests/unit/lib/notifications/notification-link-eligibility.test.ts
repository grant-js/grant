import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import {
  classifyNotificationLinkKind,
  resolveNotificationLinkRefs,
  tryOrganizationIdFromNotificationScope,
} from '@/lib/notifications/notification-link-eligibility';

describe('classifyNotificationLinkKind', () => {
  it('returns org_dashboard for org members on organization scope', () => {
    expect(
      classifyNotificationLinkKind({
        tenant: Tenant.Organization,
        isOrgMember: true,
        isProjectMember: false,
        projectId: null,
      })
    ).toBe('org_dashboard');
  });

  it('returns org_dashboard for org members on organization project even if also project members', () => {
    expect(
      classifyNotificationLinkKind({
        tenant: Tenant.OrganizationProject,
        isOrgMember: true,
        isProjectMember: true,
        projectId: 'proj-1',
      })
    ).toBe('org_dashboard');
  });

  it('returns project_membership for project members who are not org members', () => {
    expect(
      classifyNotificationLinkKind({
        tenant: Tenant.OrganizationProject,
        isOrgMember: false,
        isProjectMember: true,
        projectId: 'proj-1',
      })
    ).toBe('project_membership');
  });

  it('returns project_membership for personal account project members', () => {
    expect(
      classifyNotificationLinkKind({
        tenant: Tenant.AccountProject,
        isOrgMember: false,
        isProjectMember: true,
        projectId: 'proj-2',
      })
    ).toBe('project_membership');
  });

  it('returns none when recipient has no accessible membership', () => {
    expect(
      classifyNotificationLinkKind({
        tenant: Tenant.OrganizationProject,
        isOrgMember: false,
        isProjectMember: false,
        projectId: 'proj-1',
      })
    ).toBe('none');
  });

  it('returns none for account project when not a project member (never personal admin)', () => {
    expect(
      classifyNotificationLinkKind({
        tenant: Tenant.AccountProject,
        isOrgMember: false,
        isProjectMember: false,
        projectId: 'proj-2',
      })
    ).toBe('none');
  });
});

describe('resolveNotificationLinkRefs', () => {
  it('keeps aggregate refs for org_dashboard', () => {
    expect(
      resolveNotificationLinkRefs({
        kind: 'org_dashboard',
        contentRefs: { refEntity: 'userRole', refId: 'role-1' },
        projectId: 'proj-1',
      })
    ).toEqual({ refEntity: 'userRole', refId: 'role-1' });
  });

  it('maps project_membership to projectMembership + projectId', () => {
    expect(
      resolveNotificationLinkRefs({
        kind: 'project_membership',
        contentRefs: { refEntity: 'userRole', refId: 'role-1' },
        projectId: 'proj-1',
      })
    ).toEqual({ refEntity: 'projectMembership', refId: 'proj-1' });
  });

  it('nulls refs for none', () => {
    expect(
      resolveNotificationLinkRefs({
        kind: 'none',
        contentRefs: { refEntity: 'userRole', refId: 'role-1' },
        projectId: 'proj-1',
      })
    ).toEqual({ refEntity: null, refId: null });
  });
});

describe('tryOrganizationIdFromNotificationScope', () => {
  it('returns org id from organization and organization project scopes', () => {
    expect(
      tryOrganizationIdFromNotificationScope({
        tenant: Tenant.Organization,
        id: 'org-1',
      })
    ).toBe('org-1');
    expect(
      tryOrganizationIdFromNotificationScope({
        tenant: Tenant.OrganizationProject,
        id: 'org-1:proj-1',
      })
    ).toBe('org-1');
  });

  it('returns null for account scopes', () => {
    expect(
      tryOrganizationIdFromNotificationScope({
        tenant: Tenant.AccountProject,
        id: 'acct-1:proj-1',
      })
    ).toBeNull();
  });
});
