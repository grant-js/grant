import {
  getResourceDefinition,
  GROUP_DEFINITIONS,
  GroupKey,
  MACHINE_ONLY_PERMISSIONS,
  machineOnlyGate,
  PERMISSION_MAPPINGS,
  ResourceAction,
  ResourceSlug,
  RoleKey,
  STANDALONE_PERMISSIONS,
} from '@grantjs/constants';
import { describe, expect, it } from 'vitest';

const holders = (resource: string, action: string): string[] => {
  const roles = new Set<string>();
  for (const [groupKey, definition] of Object.entries(GROUP_DEFINITIONS)) {
    const placed = (PERMISSION_MAPPINGS[groupKey] ?? []).some(
      (mapping) => mapping.resource === resource && mapping.action === action
    );
    if (placed) {
      definition.assignedRoles.forEach((role) => roles.add(role));
    }
  }
  return [...roles].sort();
};

describe('the ApiKey:Update action', () => {
  it('is an action of the ApiKey resource', () => {
    expect(getResourceDefinition(ResourceSlug.ApiKey).actions).toContain(ResourceAction.Update);
  });

  it.each([GroupKey.ApiKeyOwner, GroupKey.ApiKeyAdmin, GroupKey.ApiKeyDev])(
    'is placed in the %s group, as a permission row and in its definition',
    (groupKey) => {
      expect(GROUP_DEFINITIONS[groupKey].permissions).toContain(ResourceAction.Update);
      expect(PERMISSION_MAPPINGS[groupKey]).toContainEqual(
        expect.objectContaining({
          resource: ResourceSlug.ApiKey,
          action: ResourceAction.Update,
          condition: null,
        })
      );
    }
  );

  it('is held by the Owner, the Admin, the Dev and the account owners, not the Viewer', () => {
    expect(holders(ResourceSlug.ApiKey, ResourceAction.Update)).toEqual(
      [
        RoleKey.OrganizationOwner,
        RoleKey.OrganizationAdmin,
        RoleKey.OrganizationDev,
        RoleKey.PersonalAccountOwner,
        RoleKey.OrganizationAccountOwner,
      ].sort()
    );
  });
});

describe('machine-only permissions', () => {
  it('are the standalone permissions that declare a gate', () => {
    expect(MACHINE_ONLY_PERMISSIONS.length).toBeGreaterThan(0);
    for (const permission of MACHINE_ONLY_PERMISSIONS) {
      expect(STANDALONE_PERMISSIONS).toContain(permission);
      expect(permission.attachableByHoldersOf).toBeDefined();
    }
  });

  it('make ProjectUser:ExportCredentials attachable by holders of ProjectUser:SetPassword', () => {
    expect(machineOnlyGate(ResourceSlug.ProjectUser, ResourceAction.ExportCredentials)).toEqual({
      resource: ResourceSlug.ProjectUser,
      action: ResourceAction.SetPassword,
    });
  });

  it('match a permission by resource and action regardless of case', () => {
    expect(machineOnlyGate('projectuser', 'exportcredentials')).toEqual({
      resource: ResourceSlug.ProjectUser,
      action: ResourceAction.SetPassword,
    });
  });

  it('say nothing about a permission that is not machine-only', () => {
    expect(machineOnlyGate(ResourceSlug.ProjectUser, ResourceAction.SetPassword)).toBeUndefined();
    expect(machineOnlyGate(ResourceSlug.User, ResourceAction.Query)).toBeUndefined();
  });

  it('are in no group, so no role holds one by default', () => {
    for (const permission of MACHINE_ONLY_PERMISSIONS) {
      expect(holders(permission.resource, permission.action)).toEqual([]);
    }
  });

  it('are gated by a permission held by the Owner, the Admin and the account owners, not the Dev', () => {
    const gate = machineOnlyGate(ResourceSlug.ProjectUser, ResourceAction.ExportCredentials)!;

    expect(holders(gate.resource, gate.action)).toEqual(
      [
        RoleKey.OrganizationOwner,
        RoleKey.OrganizationAdmin,
        RoleKey.PersonalAccountOwner,
        RoleKey.OrganizationAccountOwner,
      ].sort()
    );
  });
});
