import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysHandler } from '@/handlers/api-keys.handler';
import { AuthorizationError, BadRequestError, NotFoundError } from '@/lib/errors';

const organizationId = '10000000-0000-4000-8000-0000000000e1';
const accountId = '10000000-0000-4000-8000-0000000000e2';
const projectId = '10000000-0000-4000-8000-0000000000e3';
const apiKeyId = '10000000-0000-4000-8000-0000000000e4';
const otherKeyId = '10000000-0000-4000-8000-0000000000e5';
const roleId = '10000000-0000-4000-8000-0000000000e6';
const p1 = '10000000-0000-4000-8000-0000000000f1';
const p2 = '10000000-0000-4000-8000-0000000000f2';
const p3 = '10000000-0000-4000-8000-0000000000f3';

const organizationScope = {
  tenant: Tenant.OrganizationProject,
  id: `${organizationId}:${projectId}`,
};
const accountScope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

const permission = (id: string, name: string) => ({ id, name, action: 'Query', description: null });

interface Options {
  /** The key's own permission rows before the call. */
  current?: string[];
  /** The role on the key's pivot row. */
  pivotRoleId?: string | null;
  /** Permissions the key resolves to before the call (its role's or its own). */
  effective?: string[];
  refuseManage?: boolean;
  refuseAttach?: boolean;
  revoked?: boolean;
  replaced?: { added: string[]; removed: string[] };
}

function build(options: Options = {}) {
  const order: string[] = [];
  const tx = { __tx: true };
  const key = { id: apiKeyId, name: 'Receiver key' };

  const apiKeys = {
    getApiKeys: vi.fn(),
    createApiKey: vi.fn(),
    getEditableApiKey: options.revoked
      ? vi.fn().mockRejectedValue(new BadRequestError('Cannot change a revoked key'))
      : vi.fn().mockResolvedValue(key),
    publishApiKeyUpdated: vi.fn().mockImplementation(async () => void order.push('event')),
  };
  const pivotRoleId = options.pivotRoleId ?? null;
  const accountProjectApiKeys = {
    getAccountProjectApiKeys: vi.fn().mockResolvedValue([{ apiKeyId, accountRoleId: pivotRoleId }]),
    getByApiKeyAndAccountAndProject: vi
      .fn()
      .mockResolvedValue({ id: 'pivot', apiKeyId, accountRoleId: pivotRoleId }),
    clearAccountProjectApiKeyRole: vi.fn().mockImplementation(async () => void order.push('clear')),
  };
  const organizationProjectApiKeys = {
    getOrganizationProjectApiKeys: vi
      .fn()
      .mockResolvedValue([{ apiKeyId, organizationRoleId: pivotRoleId }]),
    getByApiKeyAndOrganizationAndProject: vi
      .fn()
      .mockResolvedValue({ id: 'pivot', apiKeyId, organizationRoleId: pivotRoleId }),
    clearOrganizationProjectApiKeyRole: vi
      .fn()
      .mockImplementation(async () => void order.push('clear')),
  };
  const apiKeyAttenuation = {
    assertCanManage: options.refuseManage
      ? vi.fn().mockRejectedValue(new AuthorizationError('refused'))
      : vi.fn().mockImplementation(async () => void order.push('manage')),
    assertAttachable: options.refuseAttach
      ? vi.fn().mockRejectedValue(new AuthorizationError('refused'))
      : vi.fn().mockImplementation(async () => void order.push('attach')),
    effectivePermissionIdsForKey: vi
      .fn()
      .mockResolvedValue(options.effective ?? options.current ?? []),
    attachableGrants: vi.fn(),
  };
  const apiKeyPermissions = {
    attach: vi.fn(),
    listForKey: vi.fn().mockResolvedValue(options.current ?? []),
    listForKeys: vi.fn().mockResolvedValue(new Map([[apiKeyId, options.current ?? []]])),
    replace: vi.fn().mockImplementation(async () => {
      order.push('replace');
      return options.replaced ?? { added: [], removed: [] };
    }),
  };
  const roles = {
    getRoles: vi.fn().mockResolvedValue({ roles: [{ id: roleId, name: 'Organization Dev' }] }),
  };
  const permissions = {
    getPermissions: vi.fn().mockImplementation(async ({ ids }: { ids: string[] }) => ({
      permissions: ids.map((id) => permission(id, `name-${id.slice(-2)}`)),
    })),
  };
  const cache = {
    permissions: {
      keys: vi.fn().mockImplementation(async (pattern: string) => {
        order.push(`invalidate ${pattern}`);
        return ['auth:result:cached'];
      }),
      delete: vi.fn(),
    },
  };
  const db = {
    withTransaction: async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => {
      order.push('begin');
      const result = await fn(tx);
      order.push('commit');
      return result;
    },
  };

  const handler = new ApiKeysHandler(
    apiKeys as never,
    accountProjectApiKeys as never,
    organizationProjectApiKeys as never,
    {} as never,
    apiKeyAttenuation as never,
    apiKeyPermissions as never,
    roles as never,
    permissions as never,
    cache as never,
    {} as never,
    db as never
  );
  return {
    handler,
    order,
    tx,
    apiKeys,
    accountProjectApiKeys,
    organizationProjectApiKeys,
    apiKeyAttenuation,
    apiKeyPermissions,
    roles,
    permissions,
    cache,
  };
}

describe('ApiKeysHandler.setApiKeyPermissions', () => {
  it('adds a permission the editor covers: manage check, then attenuation of the addition only, then the write, the event and the invalidation after the commit', async () => {
    const { handler, order, apiKeyAttenuation, apiKeyPermissions, apiKeys, tx } = build({
      current: [p1],
      replaced: { added: [p2], removed: [] },
    });

    const result = await handler.setApiKeyPermissions({
      input: { scope: organizationScope, id: apiKeyId, permissionIds: [p1, p2, p2] },
    });

    expect(apiKeyAttenuation.assertCanManage).toHaveBeenCalledWith(
      { scope: organizationScope, apiKeyId },
      tx
    );
    expect(apiKeyAttenuation.assertAttachable).toHaveBeenCalledOnce();
    expect(apiKeyAttenuation.assertAttachable).toHaveBeenCalledWith(
      { scope: organizationScope, permissionIds: [p2] },
      tx
    );
    expect(apiKeyPermissions.replace).toHaveBeenCalledWith(
      { apiKeyId, projectId, permissionIds: [p1, p2], fromRoleId: null },
      tx
    );
    expect(apiKeys.publishApiKeyUpdated).toHaveBeenCalledWith(
      {
        apiKey: { id: apiKeyId, name: 'Receiver key' },
        before: { permissionCount: 1 },
        after: { permissionCount: 2 },
      },
      tx
    );
    expect(order).toEqual([
      'begin',
      'manage',
      'attach',
      'replace',
      'event',
      'commit',
      `invalidate auth:result:${apiKeyId}:*`,
    ]);
    expect(result.permissions?.map((p) => p.id)).toEqual([p1]);
  });

  it('removes permissions without asking the editor to cover anything, and invalidates', async () => {
    const { handler, apiKeyAttenuation, apiKeys, cache } = build({
      current: [p1, p2],
      replaced: { added: [], removed: [p2] },
    });

    await handler.setApiKeyPermissions({
      input: { scope: organizationScope, id: apiKeyId, permissionIds: [p1] },
    });

    expect(apiKeyAttenuation.assertCanManage).toHaveBeenCalledOnce();
    expect(apiKeyAttenuation.assertAttachable).not.toHaveBeenCalled();
    expect(apiKeys.publishApiKeyUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        before: { permissionCount: 2 },
        after: { permissionCount: 1 },
      }),
      expect.anything()
    );
    expect(cache.permissions.delete).toHaveBeenCalledWith('auth:result:cached');
  });

  it('publishes nothing for a set the key already carries, but still drops its cached results', async () => {
    const { handler, apiKeys, cache } = build({ current: [p1, p2] });

    await handler.setApiKeyPermissions({
      input: { scope: organizationScope, id: apiKeyId, permissionIds: [p2, p1] },
    });

    expect(apiKeys.publishApiKeyUpdated).not.toHaveBeenCalled();
    expect(cache.permissions.keys).toHaveBeenCalledOnce();
  });

  it('converts a role key: every requested permission is an addition bounded by the editor, the role is cleared, and the role is named for the audit', async () => {
    const {
      handler,
      apiKeyAttenuation,
      apiKeyPermissions,
      organizationProjectApiKeys,
      apiKeys,
      order,
      tx,
    } = build({
      current: [],
      pivotRoleId: roleId,
      effective: [p1, p2, p3],
      replaced: { added: [p1], removed: [] },
    });

    await handler.setApiKeyPermissions({
      input: { scope: organizationScope, id: apiKeyId, permissionIds: [p1] },
    });

    expect(apiKeyAttenuation.assertAttachable).toHaveBeenCalledWith(
      { scope: organizationScope, permissionIds: [p1] },
      tx
    );
    expect(apiKeyPermissions.replace).toHaveBeenCalledWith(
      { apiKeyId, projectId, permissionIds: [p1], fromRoleId: roleId },
      tx
    );
    expect(organizationProjectApiKeys.clearOrganizationProjectApiKeyRole).toHaveBeenCalledWith(
      { apiKeyId, organizationId, projectId },
      tx
    );
    expect(apiKeys.publishApiKeyUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        before: { permissionCount: 3 },
        after: { permissionCount: 1 },
      }),
      tx
    );
    expect(order.indexOf('replace')).toBeLessThan(order.indexOf('clear'));
  });

  it('converts an account project key through the account pivot', async () => {
    const { handler, accountProjectApiKeys, organizationProjectApiKeys, tx } = build({
      pivotRoleId: roleId,
      replaced: { added: [p1], removed: [] },
    });

    await handler.setApiKeyPermissions({
      input: { scope: accountScope, id: apiKeyId, permissionIds: [p1] },
    });

    expect(accountProjectApiKeys.clearAccountProjectApiKeyRole).toHaveBeenCalledWith(
      { apiKeyId, accountId, projectId },
      tx
    );
    expect(organizationProjectApiKeys.clearOrganizationProjectApiKeyRole).not.toHaveBeenCalled();
  });

  it('does not clear the role of a key that has none', async () => {
    const { handler, accountProjectApiKeys, organizationProjectApiKeys } = build({
      current: [p1],
      replaced: { added: [p2], removed: [] },
    });

    await handler.setApiKeyPermissions({
      input: { scope: organizationScope, id: apiKeyId, permissionIds: [p1, p2] },
    });

    expect(organizationProjectApiKeys.clearOrganizationProjectApiKeyRole).not.toHaveBeenCalled();
    expect(accountProjectApiKeys.clearAccountProjectApiKeyRole).not.toHaveBeenCalled();
  });

  it('writes nothing, publishes nothing and keeps the cache when the editor does not cover the key', async () => {
    const { handler, apiKeyPermissions, apiKeys, cache } = build({
      current: [p1],
      refuseManage: true,
    });

    await expect(
      handler.setApiKeyPermissions({
        input: { scope: organizationScope, id: apiKeyId, permissionIds: [p1, p2] },
      })
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(apiKeyPermissions.replace).not.toHaveBeenCalled();
    expect(apiKeys.publishApiKeyUpdated).not.toHaveBeenCalled();
    expect(cache.permissions.keys).not.toHaveBeenCalled();
  });

  it('writes nothing when an added permission is outside the editor cohort', async () => {
    const { handler, apiKeyPermissions, apiKeys, cache, organizationProjectApiKeys } = build({
      current: [p1],
      refuseAttach: true,
    });

    await expect(
      handler.setApiKeyPermissions({
        input: { scope: organizationScope, id: apiKeyId, permissionIds: [p1, p3] },
      })
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(apiKeyPermissions.replace).not.toHaveBeenCalled();
    expect(organizationProjectApiKeys.clearOrganizationProjectApiKeyRole).not.toHaveBeenCalled();
    expect(apiKeys.publishApiKeyUpdated).not.toHaveBeenCalled();
    expect(cache.permissions.keys).not.toHaveBeenCalled();
  });

  it('refuses a revoked key before anything is checked or written', async () => {
    const { handler, apiKeyAttenuation, apiKeyPermissions } = build({ revoked: true });

    await expect(
      handler.setApiKeyPermissions({
        input: { scope: organizationScope, id: apiKeyId, permissionIds: [p1] },
      })
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(apiKeyAttenuation.assertCanManage).not.toHaveBeenCalled();
    expect(apiKeyPermissions.replace).not.toHaveBeenCalled();
  });

  it('refuses an empty set without opening a transaction', async () => {
    const { handler, order } = build();

    await expect(
      handler.setApiKeyPermissions({
        input: { scope: organizationScope, id: apiKeyId, permissionIds: [] },
      })
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(order).toEqual([]);
  });

  it.each([
    ['organization', Tenant.Organization],
    ['project user', Tenant.ProjectUser],
    ['account project user', Tenant.AccountProjectUser],
  ])('refuses a %s scope: only project keys carry permissions', async (_label, tenant) => {
    const { handler, order } = build();

    await expect(
      handler.setApiKeyPermissions({
        input: { scope: { tenant, id: organizationId }, id: apiKeyId, permissionIds: [p1] },
      })
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(order).toEqual([]);
  });

  it('reports a key that is not in the named scope as not found, through the manage check', async () => {
    const { handler, apiKeyAttenuation, apiKeyPermissions } = build();
    apiKeyAttenuation.assertCanManage.mockRejectedValue(new NotFoundError('ApiKey', otherKeyId));

    await expect(
      handler.setApiKeyPermissions({
        input: { scope: organizationScope, id: otherKeyId, permissionIds: [p1] },
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(apiKeyPermissions.replace).not.toHaveBeenCalled();
  });
});

describe('ApiKeysHandler.getAttachableGrants', () => {
  it('returns the permissions with their machine-only flag and the roles the caller may assign', async () => {
    const { handler, apiKeyAttenuation, roles } = build();
    apiKeyAttenuation.attachableGrants.mockResolvedValue({
      permissions: [
        { permissionId: p2, machineOnly: true },
        { permissionId: p1, machineOnly: false },
      ],
      roleIds: [roleId],
    });

    const result = await handler.getAttachableGrants({ scope: organizationScope });

    expect(apiKeyAttenuation.attachableGrants).toHaveBeenCalledWith(organizationScope);
    expect(result.permissions.map((entry) => [entry.permission.id, entry.machineOnly])).toEqual([
      [p1, false],
      [p2, true],
    ]);
    expect(result.roles.map((role) => role.id)).toEqual([roleId]);
    expect(roles.getRoles).toHaveBeenCalledOnce();
  });

  it('reads no roles when the caller may assign none', async () => {
    const { handler, apiKeyAttenuation, roles } = build();
    apiKeyAttenuation.attachableGrants.mockResolvedValue({
      permissions: [{ permissionId: p1, machineOnly: false }],
      roleIds: [],
    });

    const result = await handler.getAttachableGrants({ scope: accountScope });

    expect(result.roles).toEqual([]);
    expect(roles.getRoles).not.toHaveBeenCalled();
  });

  it('reads nothing for a caller that may attach nothing', async () => {
    const { handler, apiKeyAttenuation, roles, permissions } = build();
    apiKeyAttenuation.attachableGrants.mockResolvedValue({ permissions: [], roleIds: [] });

    await expect(handler.getAttachableGrants({ scope: organizationScope })).resolves.toEqual({
      permissions: [],
      roles: [],
    });
    expect(roles.getRoles).not.toHaveBeenCalled();
    expect(permissions.getPermissions).not.toHaveBeenCalled();
  });
});

describe('ApiKeysHandler.getApiKeys enrichment', () => {
  it('shows a role key with its role and no permissions, and a scope key with its permissions and no role', async () => {
    const { handler, apiKeys, organizationProjectApiKeys, apiKeyPermissions } = build();
    apiKeys.getApiKeys.mockResolvedValue({
      apiKeys: [{ id: apiKeyId }, { id: otherKeyId }],
      totalCount: 2,
      hasNextPage: false,
    });
    organizationProjectApiKeys.getOrganizationProjectApiKeys.mockResolvedValue([
      { apiKeyId, organizationRoleId: null },
      { apiKeyId: otherKeyId, organizationRoleId: roleId },
    ]);
    apiKeyPermissions.listForKeys.mockResolvedValue(new Map([[apiKeyId, [p1, p2]]]));

    const page = await handler.getApiKeys({ scope: organizationScope } as never);

    const [scopeKey, roleKey] = page.apiKeys as never as Array<{
      id: string;
      role: { id: string } | null;
      permissions: { id: string }[] | null;
    }>;
    expect(scopeKey.role).toBeNull();
    expect(scopeKey.permissions?.map((p) => p.id)).toEqual([p1, p2]);
    expect(roleKey.role?.id).toBe(roleId);
    expect(roleKey.permissions).toBeNull();
    expect(apiKeyPermissions.listForKeys).toHaveBeenCalledOnce();
    expect(apiKeyPermissions.listForKeys).toHaveBeenCalledWith([apiKeyId]);
  });

  it('leaves the keys of a user scope without a role or permissions field', async () => {
    const { handler, apiKeys, apiKeyPermissions } = build();
    apiKeys.getApiKeys.mockResolvedValue({
      apiKeys: [{ id: apiKeyId }],
      totalCount: 1,
      hasNextPage: false,
    });

    const page = await handler.getApiKeys({
      scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${apiKeyId}` },
    } as never);

    expect(page.apiKeys).toEqual([{ id: apiKeyId }]);
    expect(apiKeyPermissions.listForKeys).not.toHaveBeenCalled();
  });
});

describe('ApiKeysHandler.createApiKey permissionIds', () => {
  it('refuses permissionIds for a project user key: the key is the user and nothing narrows it', async () => {
    const { handler, apiKeys } = build();

    await expect(
      handler.createApiKey({
        input: {
          scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${apiKeyId}` },
          permissionIds: [p1],
        },
      } as never)
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(apiKeys.createApiKey).not.toHaveBeenCalled();
  });
});
