import {
  GROUP_DEFINITIONS,
  GroupKey,
  PERMISSION_MAPPINGS,
  ResourceAction,
  ResourceSlug,
  RoleKey,
} from '@grantjs/constants';
import { describe, expect, it } from 'vitest';

describe('Organization:Delete is owner-only', () => {
  const holders = Object.entries(PERMISSION_MAPPINGS)
    .filter(([, permissions]) =>
      permissions.some(
        (p) => p.resource === ResourceSlug.Organization && p.action === ResourceAction.Delete
      )
    )
    .map(([group]) => group);

  it('is held by the Organization Owner group and by no other group', () => {
    expect(holders).toEqual([GroupKey.OrganizationOwner]);
  });

  it('is not held by the Organization Admin group', () => {
    expect(GROUP_DEFINITIONS[GroupKey.OrganizationAdmin].permissions).not.toContain(
      ResourceAction.Delete
    );
    expect(PERMISSION_MAPPINGS[GroupKey.OrganizationAdmin]).toEqual([]);
  });

  it('reaches only the Organization Owner role', () => {
    const roles = holders.flatMap((group) => GROUP_DEFINITIONS[group].assignedRoles);
    expect(roles).toEqual([RoleKey.OrganizationOwner]);
  });
});
