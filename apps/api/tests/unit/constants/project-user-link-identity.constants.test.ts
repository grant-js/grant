import {
  getResourceDefinition,
  GROUP_DEFINITIONS,
  GroupKey,
  PERMISSION_MAPPINGS,
  ResourceAction,
  ResourceSlug,
  RoleKey,
  STANDALONE_PERMISSIONS,
} from '@grantjs/constants';
import { describe, expect, it } from 'vitest';

const holdsLinkIdentity = (groupKey: GroupKey): boolean =>
  GROUP_DEFINITIONS[groupKey].resource === ResourceSlug.ProjectUser &&
  GROUP_DEFINITIONS[groupKey].permissions.includes(ResourceAction.LinkIdentity);

describe('ProjectUser:LinkIdentity', () => {
  it('is an action of the ProjectUser resource', () => {
    expect(getResourceDefinition(ResourceSlug.ProjectUser).actions).toContain(
      ResourceAction.LinkIdentity
    );
  });

  it('is held by the Project User Owner and Admin groups only', () => {
    const holders = Object.values(GroupKey).filter(holdsLinkIdentity);
    expect(holders.sort()).toEqual([GroupKey.ProjectUserAdmin, GroupKey.ProjectUserOwner].sort());
  });

  it('reaches the owner roles and the organization admin, never the dev or viewer', () => {
    const roles = new Set(
      Object.values(GroupKey)
        .filter(holdsLinkIdentity)
        .flatMap((groupKey) => GROUP_DEFINITIONS[groupKey].assignedRoles)
    );
    expect([...roles].sort()).toEqual(
      [
        RoleKey.OrganizationOwner,
        RoleKey.PersonalAccountOwner,
        RoleKey.OrganizationAccountOwner,
        RoleKey.OrganizationAdmin,
      ].sort()
    );
    expect(roles.has(RoleKey.OrganizationDev)).toBe(false);
    expect(roles.has(RoleKey.OrganizationViewer)).toBe(false);
  });

  it('is seeded through the group templates, unconditionally, and is not standalone', () => {
    for (const groupKey of [GroupKey.ProjectUserOwner, GroupKey.ProjectUserAdmin]) {
      expect(PERMISSION_MAPPINGS[groupKey]).toContainEqual(
        expect.objectContaining({
          action: ResourceAction.LinkIdentity,
          resource: ResourceSlug.ProjectUser,
          condition: null,
        })
      );
    }
    expect(
      STANDALONE_PERMISSIONS.some((permission) => permission.action === ResourceAction.LinkIdentity)
    ).toBe(false);
  });
});
