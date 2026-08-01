import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { buildNotificationHref, parseNotificationScopeIds } from '@/lib/notification-href.lib';

describe('parseNotificationScopeIds', () => {
  it('parses organization project scope', () => {
    expect(
      parseNotificationScopeIds({
        tenant: Tenant.OrganizationProject,
        id: 'org-1:proj-1',
      })
    ).toEqual({ organizationId: 'org-1', projectId: 'proj-1' });
  });

  it('parses account project scope', () => {
    expect(
      parseNotificationScopeIds({
        tenant: Tenant.AccountProject,
        id: 'acct-1:proj-2',
      })
    ).toEqual({ accountId: 'acct-1', projectId: 'proj-2' });
  });
});

describe('buildNotificationHref', () => {
  const orgProjectScope = { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' };
  const accountProjectScope = { tenant: Tenant.AccountProject, id: 'acct-1:proj-2' };

  it('builds role detail href for org project', () => {
    expect(
      buildNotificationHref({
        refEntity: 'role',
        refId: 'role-1',
        scope: orgProjectScope,
      })
    ).toBe('/dashboard/organizations/org-1/projects/proj-1/roles/role-1');
  });

  it('builds api keys list href for org project', () => {
    expect(
      buildNotificationHref({
        refEntity: 'apiKey',
        refId: 'key-1',
        scope: orgProjectScope,
      })
    ).toBe('/dashboard/organizations/org-1/projects/proj-1/api-keys');
  });

  it('never builds personal account project admin hrefs', () => {
    expect(
      buildNotificationHref({
        refEntity: 'role',
        refId: 'role-1',
        scope: accountProjectScope,
      })
    ).toBeNull();
    expect(
      buildNotificationHref({
        refEntity: 'userRole',
        refId: 'ur-1',
        scope: accountProjectScope,
      })
    ).toBeNull();
    expect(
      buildNotificationHref({
        refEntity: 'permission',
        refId: null,
        scope: accountProjectScope,
      })
    ).toBeNull();
  });

  it('builds settings membership href for projectMembership', () => {
    expect(
      buildNotificationHref({
        refEntity: 'projectMembership',
        refId: 'proj-1',
        scope: null,
      })
    ).toBe('/dashboard/settings/projects/proj-1');
  });

  it('returns null for projectMembership without project id', () => {
    expect(
      buildNotificationHref({
        refEntity: 'projectMembership',
        refId: null,
      })
    ).toBeNull();
  });

  it('builds org members href for invitation', () => {
    expect(
      buildNotificationHref({
        refEntity: 'organizationInvitation',
        refId: 'inv-1',
        scope: { tenant: Tenant.Organization, id: 'org-1' },
      })
    ).toBe('/dashboard/organizations/org-1/members');
  });

  it('returns null without scope for org dashboard entities', () => {
    expect(
      buildNotificationHref({
        refEntity: 'role',
        refId: 'role-1',
        scope: null,
      })
    ).toBeNull();
  });
});
