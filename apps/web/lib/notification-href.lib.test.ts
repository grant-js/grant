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

  it('builds role detail href for org project', () => {
    expect(
      buildNotificationHref({
        refEntity: 'role',
        refId: 'role-1',
        scope: orgProjectScope,
      })
    ).toBe('/dashboard/organizations/org-1/projects/proj-1/roles/role-1');
  });

  it('builds api keys list href', () => {
    expect(
      buildNotificationHref({
        refEntity: 'apiKey',
        refId: 'key-1',
        scope: orgProjectScope,
      })
    ).toBe('/dashboard/organizations/org-1/projects/proj-1/api-keys');
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

  it('returns null without scope', () => {
    expect(
      buildNotificationHref({
        refEntity: 'role',
        refId: 'role-1',
        scope: null,
      })
    ).toBeNull();
  });
});
