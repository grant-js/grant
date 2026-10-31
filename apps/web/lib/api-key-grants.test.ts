import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import {
  canManageApiKeyFromCohort,
  getApiKeyGrantKind,
  getApiKeyParentScope,
  intersectWithCohort,
  isProjectApiKeyScope,
  toApiKeyCohort,
} from '@/lib/api-key-grants';

const cohort = toApiKeyCohort({
  permissions: [
    { permission: { id: 'p1' }, machineOnly: false },
    { permission: { id: 'p2' }, machineOnly: false },
    { permission: { id: 'export' }, machineOnly: true },
  ],
  roles: [{ id: 'role-dev' }],
} as Parameters<typeof toApiKeyCohort>[0]);

const roleKey = (id: string) => ({ role: { id, name: 'role' }, permissions: null });
const scopeKey = (...ids: string[]) => ({
  role: null,
  permissions: ids.map((id) => ({ id })),
});

describe('project key scopes', () => {
  it('recognises the two project tenants and derives the parent tenant', () => {
    expect(isProjectApiKeyScope({ tenant: Tenant.OrganizationProject, id: 'o:p' })).toBe(true);
    expect(isProjectApiKeyScope({ tenant: Tenant.AccountProject, id: 'a:p' })).toBe(true);
    expect(isProjectApiKeyScope({ tenant: Tenant.OrganizationProjectUser, id: 'o:p:u' })).toBe(
      false
    );
    expect(getApiKeyParentScope({ tenant: Tenant.OrganizationProject, id: 'o1:p1' })).toEqual({
      tenant: Tenant.Organization,
      id: 'o1',
    });
    expect(getApiKeyParentScope({ tenant: Tenant.AccountProject, id: 'a1:p1' })).toEqual({
      tenant: Tenant.Account,
      id: 'a1',
    });
    expect(getApiKeyParentScope({ tenant: Tenant.Organization, id: 'o1' })).toBeNull();
  });
});

describe('getApiKeyGrantKind', () => {
  it('is fixed by what the key carries', () => {
    expect(getApiKeyGrantKind(scopeKey('p1') as never)).toBe('scopes');
    expect(getApiKeyGrantKind(roleKey('role-dev') as never)).toBe('role');
    expect(getApiKeyGrantKind({ role: null, permissions: null })).toBeNull();
  });
});

describe('canManageApiKeyFromCohort', () => {
  it('manages a role key when its role is in the cohort', () => {
    expect(canManageApiKeyFromCohort(roleKey('role-dev') as never, cohort)).toBe(true);
    expect(canManageApiKeyFromCohort(roleKey('role-owner') as never, cohort)).toBe(false);
  });

  it('manages a scope key only when every permission is in the cohort', () => {
    expect(canManageApiKeyFromCohort(scopeKey('p1', 'export') as never, cohort)).toBe(true);
    expect(canManageApiKeyFromCohort(scopeKey('p1', 'p9') as never, cohort)).toBe(false);
  });

  it('hides everything until the cohort is known, and leaves a key with no grant to the server', () => {
    expect(canManageApiKeyFromCohort(roleKey('role-dev') as never, null)).toBe(false);
    expect(canManageApiKeyFromCohort(scopeKey('p1') as never, null)).toBe(false);
    expect(canManageApiKeyFromCohort({ role: null, permissions: null }, null)).toBe(true);
  });
});

describe('intersectWithCohort', () => {
  it('keeps only what the caller may attach, in order', () => {
    expect(intersectWithCohort(['p2', 'p9', 'p1'], cohort)).toEqual(['p2', 'p1']);
    expect(intersectWithCohort(['p1'], null)).toEqual([]);
  });
});
