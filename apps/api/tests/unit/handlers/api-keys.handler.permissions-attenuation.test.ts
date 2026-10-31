/**
 * Editing the permissions of a project key, through the real attenuation service: what the
 * editor may add is bounded by the editor's own cohort, a removal needs nothing, and a role
 * key is converted within the editor's cohort, not within the old role's.
 */
import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import type { PermissionRef } from '@grantjs/core';
import { Tenant, TokenType } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysHandler } from '@/handlers/api-keys.handler';
import { AuthorizationError } from '@/lib/errors';
import { ApiKeyAttenuationService } from '@/services/api-key-attenuation.service';

const organizationId = '10000000-0000-4000-8000-0000000000a1';
const projectId = '10000000-0000-4000-8000-0000000000a2';
const userId = '10000000-0000-4000-8000-0000000000a3';
const apiKeyId = '10000000-0000-4000-8000-0000000000a4';
const roleId = '10000000-0000-4000-8000-0000000000a5';
const scope = { tenant: Tenant.OrganizationProject, id: `${organizationId}:${projectId}` };

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
  'ProjectUser:SetPassword',
  'ProjectUser:ExportCredentials',
].map(ref);

const READ = ['User:Query', 'User:Read'];
const READ_AND_SYNC = [...READ, 'ProjectSyncJob:Query', 'ProjectSyncJob:Update'];
const OWNER_HOLDS = [...READ_AND_SYNC, 'ProjectUser:SetPassword'];

interface Setup {
  editorHolds: string[];
  /** The key's own permission rows; a key with a role has none. */
  own?: string[];
  /** The key's role, and what the role resolves to. */
  role?: { id: string; permissions: string[] };
}

function build(setup: Setup) {
  const stored = new Set(setup.own ?? []);
  const permissionSets = {
    collectPermissionIds: vi.fn().mockResolvedValue(setup.editorHolds),
    collectRolePermissionIds: vi
      .fn()
      .mockImplementation(async (ids: string[]) =>
        ids.includes(setup.role?.id ?? '') ? setup.role!.permissions : []
      ),
  };
  const apiKeyPermissionRepository = {
    listForKey: vi
      .fn()
      .mockImplementation(async () => [...stored].map((permissionId) => ({ permissionId }))),
    listForKeys: vi.fn().mockResolvedValue([]),
  };
  const organizationProjectApiKeyRepository = {
    getByApiKeyAndOrganizationAndProject: vi
      .fn()
      .mockResolvedValue({ apiKeyId, organizationRoleId: setup.role?.id ?? null }),
  };
  const roleRepository = {
    getRoles: vi.fn().mockImplementation(async (params: { ids?: string[]; search?: string }) =>
      params.ids
        ? {
            roles: params.ids.map((id) => ({
              id,
              name: ORGANIZATION_ROLE_DEFINITIONS[RoleKey.OrganizationDev].name,
            })),
          }
        : { roles: [{ id: 'row', name: params.search }] }
    ),
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
  const attenuation = new ApiKeyAttenuationService(
    permissionSets as never,
    apiKeyPermissionRepository as never,
    organizationProjectApiKeyRepository as never,
    {} as never,
    {} as never,
    {} as never,
    roleRepository as never,
    permissionRepository as never,
    { userId, type: TokenType.Session, scope } as never
  );

  const apiKeyPermissions = {
    attach: vi.fn(),
    listForKey: vi.fn().mockImplementation(async () => [...stored]),
    listForKeys: vi.fn().mockResolvedValue(new Map()),
    replace: vi.fn().mockImplementation(async ({ permissionIds }: { permissionIds: string[] }) => {
      const wanted = new Set(permissionIds);
      const added = [...wanted].filter((id) => !stored.has(id));
      const removed = [...stored].filter((id) => !wanted.has(id));
      stored.clear();
      wanted.forEach((id) => stored.add(id));
      return { added, removed };
    }),
  };
  const organizationProjectApiKeys = {
    getByApiKeyAndOrganizationAndProject: vi
      .fn()
      .mockResolvedValue({ apiKeyId, organizationRoleId: setup.role?.id ?? null }),
    getOrganizationProjectApiKeys: vi.fn().mockResolvedValue([]),
    clearOrganizationProjectApiKeyRole: vi.fn(),
  };
  const apiKeys = {
    getEditableApiKey: vi.fn().mockResolvedValue({ id: apiKeyId, name: 'Receiver key' }),
    publishApiKeyUpdated: vi.fn(),
  };
  const cache = { permissions: { keys: vi.fn().mockResolvedValue([]), delete: vi.fn() } };
  const handler = new ApiKeysHandler(
    apiKeys as never,
    {} as never,
    organizationProjectApiKeys as never,
    {} as never,
    attenuation,
    apiKeyPermissions as never,
    {} as never,
    { getPermissions: vi.fn().mockResolvedValue({ permissions: [] }) } as never,
    cache as never,
    {} as never,
    { withTransaction: async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn({}) } as never
  );
  const edit = (permissionIds: string[]) =>
    handler.setApiKeyPermissions({ input: { scope, id: apiKeyId, permissionIds } });
  return { edit, stored, apiKeyPermissions, organizationProjectApiKeys, apiKeys, cache };
}

describe('editing a key with the editor cohort', () => {
  it('lets an editor add permissions it holds', async () => {
    const { edit, stored } = build({ editorHolds: READ_AND_SYNC, own: READ });

    await edit(READ_AND_SYNC);

    expect([...stored].sort()).toEqual([...READ_AND_SYNC].sort());
  });

  it('refuses an addition the editor does not hold and changes nothing', async () => {
    const { edit, stored, apiKeys, cache } = build({ editorHolds: READ, own: READ });

    await expect(edit([...READ, 'ProjectSyncJob:Update'])).rejects.toBeInstanceOf(
      AuthorizationError
    );

    expect([...stored]).toEqual(READ);
    expect(apiKeys.publishApiKeyUpdated).not.toHaveBeenCalled();
    expect(cache.permissions.keys).not.toHaveBeenCalled();
  });

  it('refuses a machine-only permission for an editor that does not hold its gate', async () => {
    const { edit, stored } = build({ editorHolds: READ_AND_SYNC, own: READ });

    await expect(edit([...READ, 'ProjectUser:ExportCredentials'])).rejects.toBeInstanceOf(
      AuthorizationError
    );

    expect([...stored]).toEqual(READ);
  });

  it('refuses a machine-only permission as the only addition for an editor without the gate', async () => {
    const { edit } = build({ editorHolds: READ, own: READ });

    await expect(edit(['ProjectUser:ExportCredentials'])).rejects.toBeInstanceOf(
      AuthorizationError
    );
  });

  it('lets an editor that holds the gate add the machine-only permission without holding it', async () => {
    const { edit, stored } = build({ editorHolds: OWNER_HOLDS, own: READ });

    await edit([...READ, 'ProjectUser:ExportCredentials']);

    expect([...stored].sort()).toEqual([...READ, 'ProjectUser:ExportCredentials'].sort());
  });

  it('lets an editor that holds the gate keep editing a key that carries the machine-only permission', async () => {
    const { edit, stored } = build({
      editorHolds: OWNER_HOLDS,
      own: [...READ, 'ProjectUser:ExportCredentials'],
    });

    await edit(['User:Query', 'ProjectUser:ExportCredentials']);

    expect([...stored].sort()).toEqual(['ProjectUser:ExportCredentials', 'User:Query']);
  });

  it('refuses an editor that does not cover a key that carries the machine-only permission, even to remove from it', async () => {
    const { edit, stored } = build({
      editorHolds: READ_AND_SYNC,
      own: [...READ, 'ProjectUser:ExportCredentials'],
    });

    await expect(edit(READ)).rejects.toBeInstanceOf(AuthorizationError);

    expect([...stored].sort()).toEqual([...READ, 'ProjectUser:ExportCredentials'].sort());
  });

  it('allows removals without asking the editor for anything beyond covering the key', async () => {
    const { edit, stored } = build({ editorHolds: READ_AND_SYNC, own: READ_AND_SYNC });

    await edit(['User:Query']);

    expect([...stored]).toEqual(['User:Query']);
  });

  it('converts a role key within the editor cohort: permissions the editor holds are attached', async () => {
    const { edit, stored, organizationProjectApiKeys } = build({
      editorHolds: READ_AND_SYNC,
      role: { id: roleId, permissions: READ_AND_SYNC },
    });

    await edit(READ);

    expect([...stored].sort()).toEqual([...READ].sort());
    expect(organizationProjectApiKeys.clearOrganizationProjectApiKeyRole).toHaveBeenCalledOnce();
  });

  it('does not convert a role key that carries more than the editor, whatever is asked for', async () => {
    const { edit, stored, organizationProjectApiKeys } = build({
      editorHolds: READ,
      role: { id: roleId, permissions: READ_AND_SYNC },
    });

    await expect(edit(READ)).rejects.toBeInstanceOf(AuthorizationError);

    expect([...stored]).toEqual([]);
    expect(organizationProjectApiKeys.clearOrganizationProjectApiKeyRole).not.toHaveBeenCalled();
  });

  it('refuses a conversion that adds a permission the role never had and the editor lacks', async () => {
    const { edit, stored } = build({
      editorHolds: READ_AND_SYNC,
      role: { id: roleId, permissions: READ },
    });

    await expect(edit([...READ, 'ProjectUser:SetPassword'])).rejects.toBeInstanceOf(
      AuthorizationError
    );

    expect([...stored]).toEqual([]);
  });
});
