import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { AUTH_RESULT_CACHE_KEY_PREFIX } from '@/constants/cache.constants';
import { authResultKeyMatchesTenant, authResultTenantPrefixes } from '@/lib/auth-result-cache.lib';

const org = { tenant: Tenant.Organization, id: 'org-1' };
const orgProject = {
  tenant: Tenant.OrganizationProject,
  id: 'org-1:proj-1',
};

describe('authResultTenantPrefixes', () => {
  it('anchors organization prefixes so org-1 does not include org-10', () => {
    expect(authResultTenantPrefixes(org)).toEqual([
      'organization:org-1:',
      'organizationProject:org-1:',
      'organizationProjectUser:org-1:',
    ]);
  });

  it('includes project-user for a project write', () => {
    expect(authResultTenantPrefixes(orgProject)).toEqual([
      'organizationProject:org-1:proj-1:',
      'organizationProjectUser:org-1:proj-1:',
      'projectUser:proj-1:',
    ]);
  });

  it('adds projectUser prefixes for listed org projects', () => {
    expect(authResultTenantPrefixes(org, ['proj-1', 'proj-2'])).toEqual([
      'organization:org-1:',
      'organizationProject:org-1:',
      'organizationProjectUser:org-1:',
      'projectUser:proj-1:',
      'projectUser:proj-2:',
    ]);
  });
});

describe('authResultKeyMatchesTenant', () => {
  const key = (tenant: string, scopeId: string, user = 'user-1') =>
    `${AUTH_RESULT_CACHE_KEY_PREFIX}${user}:${tenant}:${scopeId}:doc:read:none`;

  it('matches the tenant and its child project scopes', () => {
    expect(authResultKeyMatchesTenant(key('organization', 'org-1'), org)).toBe(true);
    expect(authResultKeyMatchesTenant(key('organizationProject', 'org-1:proj-1'), org)).toBe(true);
    expect(authResultKeyMatchesTenant(key('organizationProjectUser', 'org-1:proj-1:u1'), org)).toBe(
      true
    );
    expect(authResultKeyMatchesTenant(key('projectUser', 'proj-1:u1'), org, ['proj-1'])).toBe(true);
    expect(authResultKeyMatchesTenant(key('projectUser', 'proj-2:u1'), org, ['proj-1'])).toBe(
      false
    );
  });

  it('does not match another tenant or an unanchored lookalike id', () => {
    expect(authResultKeyMatchesTenant(key('organization', 'org-2'), org)).toBe(false);
    expect(authResultKeyMatchesTenant(key('organization', 'org-10'), org)).toBe(false);
    expect(authResultKeyMatchesTenant(key('account', 'org-1'), org)).toBe(false);
  });

  it('ignores scoped-id keys in the same namespace', () => {
    expect(authResultKeyMatchesTenant('organization:org-1', org)).toBe(false);
  });
});
