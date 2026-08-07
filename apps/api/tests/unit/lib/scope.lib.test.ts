import { Scope, Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import {
  accountProjectFromScopeOrThrow,
  intersectScopedIds,
  organizationProjectFromScopeOrThrow,
  projectIdFromScopeOrThrow,
  projectUserFromScopeOrThrow,
  tryProjectIdFromScope,
} from '@/lib/scope.lib';

describe('intersectScopedIds', () => {
  const scoped = ['a', 'b', 'c'];

  // The asymmetry is the authorization rule: an absent filter is "everything
  // this scope allows", never "nothing".
  it('returns the full scoped set when no ids are requested', () => {
    expect(intersectScopedIds(scoped)).toEqual(scoped);
    expect(intersectScopedIds(scoped, undefined)).toEqual(scoped);
    expect(intersectScopedIds(scoped, null)).toEqual(scoped);
    expect(intersectScopedIds(scoped, [])).toEqual(scoped);
  });

  it('drops requested ids the scope does not permit', () => {
    expect(intersectScopedIds(scoped, ['b', 'zzz'])).toEqual(['b']);
  });

  it('cannot widen visibility beyond the scoped set', () => {
    expect(intersectScopedIds(scoped, ['x', 'y', 'z'])).toEqual([]);
    expect(intersectScopedIds([], ['a'])).toEqual([]);
  });

  it('preserves requested order, not scoped order', () => {
    expect(intersectScopedIds(scoped, ['c', 'a'])).toEqual(['c', 'a']);
  });
});

describe('scope id parsing', () => {
  const s = (tenant: Tenant, id: string) => ({ tenant, id }) as Scope;

  it('reads projectId from index 1 for the four project tenants', () => {
    expect(projectIdFromScopeOrThrow(s(Tenant.AccountProject, 'acc:proj'))).toBe('proj');
    expect(projectIdFromScopeOrThrow(s(Tenant.OrganizationProject, 'org:proj'))).toBe('proj');
    expect(projectIdFromScopeOrThrow(s(Tenant.AccountProjectUser, 'acc:proj:user'))).toBe('proj');
    expect(projectIdFromScopeOrThrow(s(Tenant.OrganizationProjectUser, 'org:proj:user'))).toBe(
      'proj'
    );
  });

  it('rejects a tenant that embeds no projectId', () => {
    expect(() => projectIdFromScopeOrThrow(s(Tenant.Organization, 'org'))).toThrow(
      /Cannot extract projectId/
    );
  });

  // ProjectUser is the odd one out: project at index 0, not 1.
  it('parses projectUser as projectId:userId', () => {
    expect(projectUserFromScopeOrThrow(s(Tenant.ProjectUser, 'proj:user'))).toEqual({
      projectId: 'proj',
      userId: 'user',
    });
  });

  it('parses the composite user tenants as owner:project:user', () => {
    expect(projectUserFromScopeOrThrow(s(Tenant.AccountProjectUser, 'acc:proj:user'))).toEqual({
      projectId: 'proj',
      userId: 'user',
    });
    expect(projectUserFromScopeOrThrow(s(Tenant.OrganizationProjectUser, 'org:proj:user'))).toEqual(
      { projectId: 'proj', userId: 'user' }
    );
  });

  it('rejects an id missing a required segment', () => {
    expect(() => projectUserFromScopeOrThrow(s(Tenant.ProjectUser, 'proj'))).toThrow(
      /must contain both projectId and userId/
    );
    expect(() => accountProjectFromScopeOrThrow(s(Tenant.AccountProject, 'acc'))).toThrow(
      /accountId:projectId/
    );
    expect(() => organizationProjectFromScopeOrThrow(s(Tenant.OrganizationProject, 'org'))).toThrow(
      /organizationId:projectId/
    );
  });

  it('tryProjectIdFromScope returns null where the throwing variant raises', () => {
    expect(tryProjectIdFromScope(s(Tenant.Organization, 'org'))).toBeNull();
    expect(tryProjectIdFromScope(s(Tenant.AccountProject, 'acc:proj'))).toBe('proj');
  });
});
