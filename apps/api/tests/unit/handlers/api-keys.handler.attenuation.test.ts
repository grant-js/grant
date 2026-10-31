import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysHandler } from '@/handlers/api-keys.handler';
import { AuthorizationError, BadRequestError } from '@/lib/errors';

const accountId = '10000000-0000-4000-8000-0000000000d1';
const organizationId = '10000000-0000-4000-8000-0000000000d6';
const projectId = '10000000-0000-4000-8000-0000000000d2';
const suppliedRoleId = '10000000-0000-4000-8000-0000000000d3';
const resolvedRoleId = '10000000-0000-4000-8000-0000000000d4';
const apiKeyId = '10000000-0000-4000-8000-0000000000d5';
const permissionIds = [
  '10000000-0000-4000-8000-0000000000f1',
  '10000000-0000-4000-8000-0000000000f2',
];

function build(options: { refuseAttach?: boolean; refuseManage?: boolean } = {}) {
  const tx = { __tx: true };
  const apiKeys = {
    createApiKey: vi
      .fn()
      .mockResolvedValue({ id: apiKeyId, clientId: 'client', clientSecret: 's' }),
    revokeApiKey: vi.fn().mockResolvedValue({ id: apiKeyId }),
    rotateApiKey: vi.fn().mockResolvedValue({ id: apiKeyId }),
    deleteApiKey: vi.fn().mockResolvedValue({ id: apiKeyId }),
  };
  const accountProjectApiKeys = {
    addAccountProjectApiKey: vi.fn(),
    resolveAccountRoleIdForCurrentUser: vi.fn().mockResolvedValue(resolvedRoleId),
  };
  const organizationProjectApiKeys = { addOrganizationProjectApiKey: vi.fn() };
  const apiKeyAttenuation = {
    assertAttachable: options.refuseAttach
      ? vi.fn().mockRejectedValue(new AuthorizationError('refused'))
      : vi.fn(),
    assertCanManage: options.refuseManage
      ? vi.fn().mockRejectedValue(new AuthorizationError('refused'))
      : vi.fn(),
  };
  const apiKeyPermissions = { attach: vi.fn() };
  const cache = { apiKeys: { has: vi.fn().mockResolvedValue(false) } };
  const handler = new ApiKeysHandler(
    apiKeys as never,
    accountProjectApiKeys as never,
    organizationProjectApiKeys as never,
    {} as never,
    apiKeyAttenuation as never,
    apiKeyPermissions as never,
    {} as never,
    cache as never,
    {} as never,
    { withTransaction: async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx) } as never
  );
  return {
    handler,
    apiKeys,
    accountProjectApiKeys,
    organizationProjectApiKeys,
    apiKeyAttenuation,
    apiKeyPermissions,
    tx,
  };
}

const accountScope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const organizationScope = {
  tenant: Tenant.OrganizationProject,
  id: `${organizationId}:${projectId}`,
};

describe('ApiKeysHandler.createApiKey for an account project', () => {
  it('attenuates a supplied role before the key is created', async () => {
    const { handler, apiKeys, accountProjectApiKeys, apiKeyAttenuation, tx } = build();

    await handler.createApiKey({ input: { scope: accountScope, roleId: suppliedRoleId } } as never);

    expect(apiKeyAttenuation.assertAttachable).toHaveBeenCalledWith(
      { scope: accountScope, roleId: suppliedRoleId, permissionIds: null },
      tx
    );
    expect(accountProjectApiKeys.resolveAccountRoleIdForCurrentUser).not.toHaveBeenCalled();
    expect(accountProjectApiKeys.addAccountProjectApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ accountRoleId: suppliedRoleId }),
      tx
    );
    expect(apiKeys.createApiKey).toHaveBeenCalledOnce();
  });

  it('creates no key when the supplied role is refused', async () => {
    const { handler, apiKeys, accountProjectApiKeys } = build({ refuseAttach: true });

    await expect(
      handler.createApiKey({ input: { scope: accountScope, roleId: suppliedRoleId } } as never)
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(apiKeys.createApiKey).not.toHaveBeenCalled();
    expect(accountProjectApiKeys.addAccountProjectApiKey).not.toHaveBeenCalled();
  });

  it('attenuates the resolved default role like a supplied one', async () => {
    const { handler, accountProjectApiKeys, apiKeyAttenuation, tx } = build();

    await handler.createApiKey({ input: { scope: accountScope } } as never);

    expect(apiKeyAttenuation.assertAttachable).toHaveBeenCalledWith(
      { scope: accountScope, roleId: resolvedRoleId, permissionIds: null },
      tx
    );
    expect(accountProjectApiKeys.addAccountProjectApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ accountRoleId: resolvedRoleId }),
      tx
    );
  });

  it('writes a key that carries permissions without a role', async () => {
    const { handler, accountProjectApiKeys, apiKeyAttenuation, apiKeyPermissions, tx } = build();

    await handler.createApiKey({ input: { scope: accountScope, permissionIds } } as never);

    expect(accountProjectApiKeys.resolveAccountRoleIdForCurrentUser).not.toHaveBeenCalled();
    expect(apiKeyAttenuation.assertAttachable).toHaveBeenCalledWith(
      { scope: accountScope, roleId: undefined, permissionIds },
      tx
    );
    expect(accountProjectApiKeys.addAccountProjectApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ accountRoleId: null }),
      tx
    );
    expect(apiKeyPermissions.attach).toHaveBeenCalledWith(
      { apiKeyId, projectId, permissionIds },
      tx
    );
  });
});

describe('ApiKeysHandler.createApiKey for an organization project', () => {
  it('attenuates the role before the key is created', async () => {
    const {
      handler,
      apiKeys,
      organizationProjectApiKeys,
      apiKeyAttenuation,
      apiKeyPermissions,
      tx,
    } = build();

    await handler.createApiKey({
      input: { scope: organizationScope, roleId: suppliedRoleId },
    } as never);

    expect(apiKeyAttenuation.assertAttachable).toHaveBeenCalledWith(
      { scope: organizationScope, roleId: suppliedRoleId, permissionIds: null },
      tx
    );
    expect(apiKeys.createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ grant: { kind: 'role', permissionCount: 0 } }),
      tx
    );
    expect(organizationProjectApiKeys.addOrganizationProjectApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ organizationRoleId: suppliedRoleId }),
      tx
    );
    expect(apiKeyPermissions.attach).not.toHaveBeenCalled();
  });

  it('creates no key, pivot row or permission row when the role is refused', async () => {
    const { handler, apiKeys, organizationProjectApiKeys, apiKeyPermissions } = build({
      refuseAttach: true,
    });

    await expect(
      handler.createApiKey({
        input: { scope: organizationScope, roleId: suppliedRoleId },
      } as never)
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(apiKeys.createApiKey).not.toHaveBeenCalled();
    expect(organizationProjectApiKeys.addOrganizationProjectApiKey).not.toHaveBeenCalled();
    expect(apiKeyPermissions.attach).not.toHaveBeenCalled();
  });

  it('creates no key when the permissions are refused', async () => {
    const { handler, apiKeys, apiKeyPermissions } = build({ refuseAttach: true });

    await expect(
      handler.createApiKey({ input: { scope: organizationScope, permissionIds } } as never)
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(apiKeys.createApiKey).not.toHaveBeenCalled();
    expect(apiKeyPermissions.attach).not.toHaveBeenCalled();
  });

  it('writes a key that carries permissions, counted in the audit metadata input', async () => {
    const { handler, apiKeys, organizationProjectApiKeys, apiKeyPermissions, tx } = build();

    await handler.createApiKey({ input: { scope: organizationScope, permissionIds } } as never);

    expect(apiKeys.createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ grant: { kind: 'permissions', permissionCount: 2 } }),
      tx
    );
    expect(organizationProjectApiKeys.addOrganizationProjectApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ organizationRoleId: null }),
      tx
    );
    expect(apiKeyPermissions.attach).toHaveBeenCalledWith(
      { apiKeyId, projectId, permissionIds },
      tx
    );
  });

  it('requires a role or permissions', async () => {
    const { handler, apiKeys } = build();

    await expect(
      handler.createApiKey({ input: { scope: organizationScope } } as never)
    ).rejects.toBeInstanceOf(BadRequestError);
    expect(apiKeys.createApiKey).not.toHaveBeenCalled();
  });
});

describe.each([
  ['an account project', accountScope],
  ['an organization project', organizationScope],
])('ApiKeysHandler revoke, rotate and delete for %s', (_label, scope) => {
  describe.each([
    ['revoke', 'revokeApiKey'],
    ['rotate', 'rotateApiKey'],
    ['delete', 'deleteApiKey'],
  ] as const)('%s', (_action, method) => {
    const input = { id: apiKeyId, scope };

    it('runs the manage check before the key is changed', async () => {
      const { handler, apiKeys, apiKeyAttenuation, tx } = build();

      await handler[method]({ input } as never);

      expect(apiKeyAttenuation.assertCanManage).toHaveBeenCalledWith({ scope, apiKeyId }, tx);
      expect(apiKeys[method]).toHaveBeenCalledOnce();
    });

    it('leaves the key unchanged when the manage check refuses', async () => {
      const { handler, apiKeys } = build({ refuseManage: true });

      await expect(handler[method]({ input } as never)).rejects.toBeInstanceOf(AuthorizationError);

      expect(apiKeys[method]).not.toHaveBeenCalled();
    });
  });
});

describe('ApiKeysHandler revoke, rotate and delete for a project user key', () => {
  it.each(['revokeApiKey', 'rotateApiKey', 'deleteApiKey'] as const)(
    'runs no attenuation check on %s',
    async (method) => {
      const { handler, apiKeyAttenuation } = build();
      const scope = { tenant: Tenant.ProjectUser, id: `${projectId}:${suppliedRoleId}` };

      await handler[method]({ input: { id: apiKeyId, scope } } as never);

      expect(apiKeyAttenuation.assertCanManage).not.toHaveBeenCalled();
    }
  );
});
