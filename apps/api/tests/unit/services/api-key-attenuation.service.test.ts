import {
  ACCOUNT_ROLES,
  GROUP_DEFINITIONS,
  ORGANIZATION_ROLE_DEFINITIONS,
  ORGANIZATION_ROLES,
  PERMISSION_MAPPINGS,
  RoleKey,
} from '@grantjs/constants';
import type { PermissionRef } from '@grantjs/core';
import { Tenant, TokenType } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError, BadRequestError, NotFoundError } from '@/lib/errors';
import { ApiKeyAttenuationService } from '@/services/api-key-attenuation.service';

const organizationId = '10000000-0000-4000-8000-0000000000e1';
const accountId = '10000000-0000-4000-8000-0000000000e2';
const projectId = '10000000-0000-4000-8000-0000000000e3';
const userId = '10000000-0000-4000-8000-0000000000e4';
const apiKeyId = '10000000-0000-4000-8000-0000000000e5';

const organizationScope = {
  tenant: Tenant.OrganizationProject,
  id: `${organizationId}:${projectId}`,
};
const accountScope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

/** A permission id in these tests is its `Resource:Action` slug. */
const ref = (slug: string): PermissionRef => {
  const [resource, action] = slug.split(':');
  return { id: slug, resource: resource!, action: action! };
};

const CATALOGUE = [
  'User:Query',
  'User:Read',
  'ProjectSyncJob:Query',
  'ProjectSyncJob:Update',
  'ApiKey:Create',
  'ApiKey:Update',
  'ProjectUser:SetPassword',
  'ProjectUser:ExportCredentials',
].map(ref);

interface KeyFixture {
  roleId: string | null;
  own?: string[];
}

interface BuildOptions {
  callerHolds: string[];
  roles?: Record<string, string[]>;
  keys?: Record<string, KeyFixture>;
  parentRoleIds?: string[];
  tokenType?: TokenType;
  user?: null;
}

function build(options: BuildOptions) {
  const roles = options.roles ?? {};
  const keys = options.keys ?? {};
  const permissionSets = {
    collectPermissionIds: vi.fn().mockResolvedValue(options.callerHolds),
    collectRolePermissionIds: vi
      .fn()
      .mockImplementation(async (roleIds: string[]) => [
        ...new Set(roleIds.flatMap((id) => roles[id] ?? [])),
      ]),
  };
  const apiKeyPermissionRepository = {
    listForKey: vi
      .fn()
      .mockImplementation(async (id: string) =>
        (keys[id]?.own ?? []).map((permissionId) => ({ permissionId }))
      ),
  };
  const pivot = (key: string, column: 'organizationRoleId' | 'accountRoleId') =>
    keys[key] ? { apiKeyId: key, projectId, [column]: keys[key]!.roleId } : null;
  const organizationProjectApiKeyRepository = {
    getByApiKeyAndOrganizationAndProject: vi
      .fn()
      .mockImplementation(async (key: string) => pivot(key, 'organizationRoleId')),
  };
  const accountProjectApiKeyRepository = {
    getByApiKeyAndAccountAndProject: vi
      .fn()
      .mockImplementation(async (key: string) => pivot(key, 'accountRoleId')),
  };
  const organizationRoleRepository = {
    getOrganizationRoles: vi
      .fn()
      .mockResolvedValue((options.parentRoleIds ?? []).map((roleId) => ({ roleId }))),
  };
  const accountRoleRepository = {
    getAccountRoles: vi
      .fn()
      .mockResolvedValue((options.parentRoleIds ?? []).map((roleId) => ({ roleId }))),
  };
  const roleRepository = {
    getRoles: vi.fn().mockImplementation(async (params: { ids: string[] }) => ({
      roles: params.ids.filter((id) => id in roles).map((id) => ({ id, name: `name of ${id}` })),
    })),
  };
  const permissionRepository = {
    getPermissionRefsByIds: vi
      .fn()
      .mockImplementation(async (ids: string[]) => CATALOGUE.filter((p) => ids.includes(p.id))),
    getPermissionRefsByActions: vi
      .fn()
      .mockImplementation(async (pairs: { resource: string; action: string }[]) =>
        CATALOGUE.filter((p) =>
          pairs.some(
            (pair) =>
              pair.resource.toLowerCase() === p.resource.toLowerCase() &&
              pair.action.toLowerCase() === p.action.toLowerCase()
          )
        )
      ),
  };
  const user =
    options.user === null
      ? null
      : { userId, type: options.tokenType ?? TokenType.Session, scope: organizationScope };
  const service = new ApiKeyAttenuationService(
    permissionSets as never,
    apiKeyPermissionRepository as never,
    organizationProjectApiKeyRepository as never,
    accountProjectApiKeyRepository as never,
    organizationRoleRepository as never,
    accountRoleRepository as never,
    roleRepository as never,
    permissionRepository as never,
    user as never
  );
  return { service, permissionSets, roleRepository, permissionRepository };
}

const READ = ['User:Query', 'User:Read'];
const READ_AND_SYNC = [...READ, 'ProjectSyncJob:Query', 'ProjectSyncJob:Update'];

describe.each([
  ['an organization project', organizationScope],
  ['an account project', accountScope],
])('ApiKeyAttenuationService.assertAttachable for %s', (_label, scope) => {
  describe('a role', () => {
    it('refuses a role whose permissions exceed the creator, whatever its name or level', async () => {
      const { service } = build({
        callerHolds: READ,
        roles: { 'role-above': READ_AND_SYNC },
      });

      await expect(
        service.assertAttachable({ scope, roleId: 'role-above' })
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('passes a role whose permissions equal the creator own', async () => {
      const { service } = build({ callerHolds: READ_AND_SYNC, roles: { equal: READ_AND_SYNC } });

      await expect(service.assertAttachable({ scope, roleId: 'equal' })).resolves.toBeUndefined();
    });

    it('passes a role whose permissions are a subset of the creator', async () => {
      const { service } = build({ callerHolds: READ_AND_SYNC, roles: { below: READ } });

      await expect(service.assertAttachable({ scope, roleId: 'below' })).resolves.toBeUndefined();
    });

    it('binds a creator whose own role has no level by the creator own permissions', async () => {
      const own = ['User:Query'];
      const { service } = build({
        callerHolds: own,
        roles: { 'within-own': own, 'beyond-own': ['User:Query', 'User:Read'] },
      });

      await expect(
        service.assertAttachable({ scope, roleId: 'within-own' })
      ).resolves.toBeUndefined();
      await expect(
        service.assertAttachable({ scope, roleId: 'beyond-own' })
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('judges a role by its permissions even when its name matches a standard role', async () => {
      const standardName = ORGANIZATION_ROLE_DEFINITIONS[RoleKey.OrganizationViewer].name;
      const { service, roleRepository } = build({
        callerHolds: READ,
        roles: { namesake: READ_AND_SYNC },
      });
      roleRepository.getRoles.mockResolvedValue({
        roles: [{ id: 'namesake', name: standardName }],
      });

      await expect(service.assertAttachable({ scope, roleId: 'namesake' })).rejects.toBeInstanceOf(
        AuthorizationError
      );
    });

    it('refuses a role that does not exist', async () => {
      const { service } = build({ callerHolds: READ });

      await expect(service.assertAttachable({ scope, roleId: 'missing' })).rejects.toBeInstanceOf(
        NotFoundError
      );
    });

    it('collects the creator permissions in the key scope with the creator token type', async () => {
      const { service, permissionSets } = build({
        callerHolds: READ,
        roles: { below: READ },
        tokenType: TokenType.ApiKey,
      });

      await service.assertAttachable({ scope, roleId: 'below' });

      expect(permissionSets.collectPermissionIds).toHaveBeenCalledWith(
        userId,
        scope,
        TokenType.ApiKey
      );
      expect(permissionSets.collectRolePermissionIds).toHaveBeenCalledWith(['below'], scope);
    });
  });

  describe('a permission set', () => {
    it('passes permissions the creator holds, equality included', async () => {
      const { service } = build({ callerHolds: READ_AND_SYNC });

      await expect(
        service.assertAttachable({ scope, permissionIds: READ_AND_SYNC })
      ).resolves.toBeUndefined();
    });

    it('refuses a set with a permission the creator does not hold, naming the count only', async () => {
      const { service } = build({ callerHolds: READ });

      const error = await service
        .assertAttachable({ scope, permissionIds: [...READ, 'ProjectSyncJob:Update'] })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(AuthorizationError);
      expect((error as Error).message).toContain('1 not covered');
      expect((error as Error).message).not.toContain('ProjectSyncJob');
    });

    it('refuses an empty set', async () => {
      const { service } = build({ callerHolds: READ });

      await expect(service.assertAttachable({ scope, permissionIds: [] })).rejects.toBeInstanceOf(
        BadRequestError
      );
    });

    it('refuses a request that names both a role and permissions', async () => {
      const { service } = build({ callerHolds: READ, roles: { below: READ } });

      await expect(
        service.assertAttachable({ scope, roleId: 'below', permissionIds: READ })
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('refuses a request that names neither', async () => {
      const { service } = build({ callerHolds: READ });

      await expect(service.assertAttachable({ scope })).rejects.toBeInstanceOf(BadRequestError);
    });

    it('refuses a permission that does not exist or is not live', async () => {
      const { service } = build({ callerHolds: [...READ, 'Ghost:Action'] });

      await expect(
        service.assertAttachable({ scope, permissionIds: ['Ghost:Action'] })
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('counts a repeated id once', async () => {
      const { service } = build({ callerHolds: READ });

      await expect(
        service.assertAttachable({ scope, permissionIds: ['User:Query', 'User:Query'] })
      ).resolves.toBeUndefined();
    });
  });

  describe('a machine-only permission', () => {
    const machineOnly = 'ProjectUser:ExportCredentials';

    it('is attachable by a holder of its gate permission who does not hold it', async () => {
      const { service } = build({ callerHolds: [...READ, 'ProjectUser:SetPassword'] });

      await expect(
        service.assertAttachable({ scope, permissionIds: [...READ, machineOnly] })
      ).resolves.toBeUndefined();
    });

    it('is refused for a creator without the gate permission', async () => {
      const { service } = build({ callerHolds: READ });

      await expect(
        service.assertAttachable({ scope, permissionIds: [machineOnly] })
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('does not make the gate permission itself attachable to a creator without it', async () => {
      const { service } = build({ callerHolds: READ });

      await expect(
        service.assertAttachable({ scope, permissionIds: ['ProjectUser:SetPassword'] })
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('is attachable through a role that carries it when the creator holds the gate', async () => {
      const { service } = build({
        callerHolds: ['ProjectUser:SetPassword'],
        roles: { exporter: [machineOnly] },
      });

      await expect(
        service.assertAttachable({ scope, roleId: 'exporter' })
      ).resolves.toBeUndefined();
    });
  });

  it('refuses a caller without an authenticated user', async () => {
    const { service } = build({ callerHolds: READ, user: null });

    await expect(service.assertAttachable({ scope, permissionIds: READ })).rejects.toBeInstanceOf(
      AuthorizationError
    );
  });
});

it.each([Tenant.Organization, Tenant.ProjectUser, Tenant.OrganizationProjectUser])(
  'ApiKeyAttenuationService refuses a %s scope, which has no project key permissions',
  async (tenant) => {
    const { service } = build({ callerHolds: READ });

    await expect(
      service.assertAttachable({ scope: { tenant, id: organizationId }, permissionIds: READ })
    ).rejects.toBeInstanceOf(BadRequestError);
  }
);

describe.each([
  ['an organization project', organizationScope],
  ['an account project', accountScope],
])('ApiKeyAttenuationService.assertCanManage for %s', (_label, scope) => {
  it('refuses a key whose role has permissions beyond the caller', async () => {
    const { service } = build({
      callerHolds: READ,
      roles: { above: READ_AND_SYNC },
      keys: { [apiKeyId]: { roleId: 'above' } },
    });

    await expect(service.assertCanManage({ scope, apiKeyId })).rejects.toBeInstanceOf(
      AuthorizationError
    );
  });

  it('passes a key whose role the caller covers, equality included', async () => {
    const { service } = build({
      callerHolds: READ_AND_SYNC,
      roles: { equal: READ_AND_SYNC },
      keys: { [apiKeyId]: { roleId: 'equal' } },
    });

    await expect(service.assertCanManage({ scope, apiKeyId })).resolves.toBeUndefined();
  });

  it('manages a key without a role only when the caller covers its permissions', async () => {
    const keys = { [apiKeyId]: { roleId: null, own: READ_AND_SYNC } };

    await expect(
      build({ callerHolds: READ, keys }).service.assertCanManage({ scope, apiKeyId })
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      build({ callerHolds: READ_AND_SYNC, keys }).service.assertCanManage({ scope, apiKeyId })
    ).resolves.toBeUndefined();
  });

  it('manages a key that carries a machine-only permission only with its gate or the permission', async () => {
    const keys = { [apiKeyId]: { roleId: null, own: ['ProjectUser:ExportCredentials'] } };

    await expect(
      build({ callerHolds: READ, keys }).service.assertCanManage({ scope, apiKeyId })
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      build({ callerHolds: ['ProjectUser:SetPassword'], keys }).service.assertCanManage({
        scope,
        apiKeyId,
      })
    ).resolves.toBeUndefined();
  });

  it('manages no key that has neither a role nor permissions', async () => {
    const { service } = build({
      callerHolds: READ_AND_SYNC,
      keys: { [apiKeyId]: { roleId: null, own: [] } },
    });

    await expect(service.assertCanManage({ scope, apiKeyId })).rejects.toBeInstanceOf(
      AuthorizationError
    );
  });

  it('refuses a key that does not exist in the project', async () => {
    const { service } = build({ callerHolds: READ_AND_SYNC });

    await expect(service.assertCanManage({ scope, apiKeyId })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe('ApiKeyAttenuationService.effectivePermissionIdsForKey', () => {
  it('returns the role permissions of a role key', async () => {
    const { service } = build({
      callerHolds: [],
      roles: { r: READ },
      keys: { [apiKeyId]: { roleId: 'r' } },
    });

    expect(
      (await service.effectivePermissionIdsForKey({ scope: organizationScope, apiKeyId })).sort()
    ).toEqual([...READ].sort());
  });

  it('returns the own permissions of a key without a role', async () => {
    const { service } = build({
      callerHolds: [],
      keys: { [apiKeyId]: { roleId: null, own: READ_AND_SYNC } },
    });

    expect(
      (await service.effectivePermissionIdsForKey({ scope: accountScope, apiKeyId })).sort()
    ).toEqual([...READ_AND_SYNC].sort());
  });
});

describe('ApiKeyAttenuationService.attachableGrants', () => {
  it('lists the caller permissions, the gated machine-only ones flagged, and the roles it covers', async () => {
    const { service } = build({
      callerHolds: [...READ, 'ProjectUser:SetPassword'],
      roles: { covered: READ, beyond: READ_AND_SYNC, exporter: ['ProjectUser:ExportCredentials'] },
      parentRoleIds: ['covered', 'beyond', 'exporter'],
    });

    const grants = await service.attachableGrants(organizationScope);

    expect(grants.permissions.map((p) => p.permissionId).sort()).toEqual(
      [...READ, 'ProjectUser:SetPassword', 'ProjectUser:ExportCredentials'].sort()
    );
    expect(
      grants.permissions.find((p) => p.permissionId === 'ProjectUser:ExportCredentials')
    ).toEqual({ permissionId: 'ProjectUser:ExportCredentials', machineOnly: true });
    expect(grants.permissions.find((p) => p.permissionId === 'User:Query')?.machineOnly).toBe(
      false
    );
    expect(grants.roleIds.sort()).toEqual(['covered', 'exporter']);
  });

  it('leaves the machine-only permission out for a caller without its gate', async () => {
    const { service } = build({ callerHolds: READ });

    const grants = await service.attachableGrants(accountScope);

    expect(grants.permissions.map((p) => p.permissionId)).not.toContain(
      'ProjectUser:ExportCredentials'
    );
  });
});

/**
 * The standard organization roles, with the permissions their groups give them in the seed:
 * every refusal the level comparison pinned for them follows from containment alone.
 */
describe('standard organization roles', () => {
  const permissionsOf = (role: string): string[] => {
    const slugs = new Set<string>();
    for (const [groupKey, definition] of Object.entries(GROUP_DEFINITIONS)) {
      if (!(definition.assignedRoles as string[]).includes(role)) continue;
      for (const mapping of PERMISSION_MAPPINGS[groupKey] ?? []) {
        slugs.add(`${mapping.resource}:${mapping.action}`);
      }
    }
    return [...slugs];
  };

  const catalogue = new Set<string>();
  for (const role of [...ORGANIZATION_ROLES, ...ACCOUNT_ROLES]) {
    permissionsOf(role).forEach((slug) => catalogue.add(slug));
  }
  catalogue.add('ProjectUser:ExportCredentials');

  const buildFor = (caller: RoleKey) => {
    const roles = Object.fromEntries(
      [...ORGANIZATION_ROLES, ...ACCOUNT_ROLES].map((role) => [role, permissionsOf(role)])
    );
    const permissionSets = {
      collectPermissionIds: vi.fn().mockResolvedValue(permissionsOf(caller)),
      collectRolePermissionIds: vi
        .fn()
        .mockImplementation(async (ids: string[]) => ids.flatMap((id) => roles[id] ?? [])),
    };
    return new ApiKeyAttenuationService(
      permissionSets as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        getRoles: vi.fn().mockImplementation(async (params: { ids: string[] }) => ({
          roles: params.ids.map((id) => ({ id })),
        })),
      } as never,
      {
        getPermissionRefsByIds: vi
          .fn()
          .mockImplementation(async (ids: string[]) =>
            [...catalogue].filter((slug) => ids.includes(slug)).map(ref)
          ),
        getPermissionRefsByActions: vi
          .fn()
          .mockImplementation(async (pairs: { resource: string; action: string }[]) =>
            [...catalogue]
              .map(ref)
              .filter((p) =>
                pairs.some((pair) => pair.resource === p.resource && pair.action === p.action)
              )
          ),
      } as never,
      { userId, type: TokenType.Session, scope: organizationScope } as never
    );
  };

  const pairs = ORGANIZATION_ROLES.flatMap((caller) =>
    ORGANIZATION_ROLES.map((target) => [caller, target] as const)
  );

  it.each(pairs)(
    '%s binding a key to the %s role follows the role order',
    async (caller, target) => {
      const allowed =
        ORGANIZATION_ROLE_DEFINITIONS[target].level! >=
        ORGANIZATION_ROLE_DEFINITIONS[caller].level!;

      const outcome = buildFor(caller).assertAttachable({
        scope: organizationScope,
        roleId: target,
      });

      if (allowed) {
        await expect(outcome).resolves.toBeUndefined();
      } else {
        await expect(outcome).rejects.toBeInstanceOf(AuthorizationError);
      }
    }
  );

  it('lets the Owner bind a key to the Owner role', async () => {
    await expect(
      buildFor(RoleKey.OrganizationOwner).assertAttachable({
        scope: organizationScope,
        roleId: RoleKey.OrganizationOwner,
      })
    ).resolves.toBeUndefined();
  });

  it('refuses the Dev a key that carries a permission only the Admin and Owner hold', async () => {
    const adminOnly = permissionsOf(RoleKey.OrganizationAdmin).find(
      (slug) => !permissionsOf(RoleKey.OrganizationDev).includes(slug)
    )!;

    await expect(
      buildFor(RoleKey.OrganizationDev).assertAttachable({
        scope: organizationScope,
        permissionIds: [adminOnly],
      })
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      buildFor(RoleKey.OrganizationAdmin).assertAttachable({
        scope: organizationScope,
        permissionIds: [adminOnly],
      })
    ).resolves.toBeUndefined();
  });

  it('gives no standard role the machine-only export permission', () => {
    for (const role of [...ORGANIZATION_ROLES, ...ACCOUNT_ROLES]) {
      expect(permissionsOf(role)).not.toContain('ProjectUser:ExportCredentials');
    }
  });

  it('keeps the gate permission with the Owner, the Admin and the account owners, not the Dev', () => {
    const gate = 'ProjectUser:SetPassword';
    expect(permissionsOf(RoleKey.OrganizationOwner)).toContain(gate);
    expect(permissionsOf(RoleKey.OrganizationAdmin)).toContain(gate);
    expect(permissionsOf(RoleKey.PersonalAccountOwner)).toContain(gate);
    expect(permissionsOf(RoleKey.OrganizationAccountOwner)).toContain(gate);
    expect(permissionsOf(RoleKey.OrganizationDev)).not.toContain(gate);
    expect(permissionsOf(RoleKey.OrganizationViewer)).not.toContain(gate);
  });
});
