import { canAssignRole, ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import { describe, expect, it } from 'vitest';

const name = (key: RoleKey) => ORGANIZATION_ROLE_DEFINITIONS[key].name;

describe('canAssignRole', () => {
  it('refuses when the target role has no level', () => {
    expect(canAssignRole(name(RoleKey.OrganizationOwner), 'a custom role')).toBe(false);
  });

  it('refuses when the current role has no level', () => {
    expect(canAssignRole('a custom role', name(RoleKey.OrganizationViewer))).toBe(false);
  });

  it('refuses when neither role has a level', () => {
    expect(canAssignRole('a custom role', 'another custom role')).toBe(false);
  });

  it('passes for a standard role of strictly lower level', () => {
    expect(canAssignRole(name(RoleKey.OrganizationOwner), name(RoleKey.OrganizationAdmin))).toBe(
      true
    );
    expect(canAssignRole(name(RoleKey.OrganizationDev), name(RoleKey.OrganizationViewer))).toBe(
      true
    );
  });

  it('refuses a standard role of equal level', () => {
    expect(canAssignRole(name(RoleKey.OrganizationDev), name(RoleKey.OrganizationDev))).toBe(false);
  });

  it('refuses a standard role of higher level', () => {
    expect(canAssignRole(name(RoleKey.OrganizationDev), name(RoleKey.OrganizationAdmin))).toBe(
      false
    );
  });

  it('refuses an account role, which has no level', () => {
    expect(canAssignRole(name(RoleKey.OrganizationOwner), 'roles.names.personalAccountOwner')).toBe(
      false
    );
  });
});
