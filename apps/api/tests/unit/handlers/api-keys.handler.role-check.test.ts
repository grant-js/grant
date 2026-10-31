import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysHandler } from '@/handlers/api-keys.handler';
import { AuthorizationError } from '@/lib/errors';

const accountId = '10000000-0000-4000-8000-0000000000d1';
const projectId = '10000000-0000-4000-8000-0000000000d2';
const suppliedRoleId = '10000000-0000-4000-8000-0000000000d3';
const resolvedRoleId = '10000000-0000-4000-8000-0000000000d4';
const apiKeyId = '10000000-0000-4000-8000-0000000000d5';

function build(options: { refuseSupplied?: boolean; refuseManage?: boolean } = {}) {
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
    validateCanManageAccountProjectApiKey: options.refuseManage
      ? vi.fn().mockRejectedValue(new AuthorizationError('refused'))
      : vi.fn(),
    validateAccountProjectApiKeyRolePermission: options.refuseSupplied
      ? vi.fn().mockRejectedValue(new AuthorizationError('refused'))
      : vi.fn(),
    resolveAccountRoleIdForCurrentUser: vi.fn().mockResolvedValue(resolvedRoleId),
  };
  const cache = { apiKeys: { has: vi.fn().mockResolvedValue(false) } };
  const handler = new ApiKeysHandler(
    apiKeys as never,
    accountProjectApiKeys as never,
    {} as never,
    {} as never,
    {} as never,
    cache as never,
    {} as never,
    { withTransaction: async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx) } as never
  );
  return { handler, apiKeys, accountProjectApiKeys, tx };
}

const scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

describe('ApiKeysHandler.createApiKey for an account project', () => {
  it('validates a supplied role before the key is created', async () => {
    const { handler, apiKeys, accountProjectApiKeys, tx } = build();

    await handler.createApiKey({ input: { scope, roleId: suppliedRoleId } } as never);

    expect(accountProjectApiKeys.validateAccountProjectApiKeyRolePermission).toHaveBeenCalledWith(
      accountId,
      suppliedRoleId,
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
    const { handler, apiKeys, accountProjectApiKeys } = build({ refuseSupplied: true });

    await expect(
      handler.createApiKey({ input: { scope, roleId: suppliedRoleId } } as never)
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(apiKeys.createApiKey).not.toHaveBeenCalled();
    expect(accountProjectApiKeys.addAccountProjectApiKey).not.toHaveBeenCalled();
  });

  it('passes the resolved default role without a supplied-role check', async () => {
    const { handler, accountProjectApiKeys, tx } = build();

    await handler.createApiKey({ input: { scope } } as never);

    expect(accountProjectApiKeys.validateAccountProjectApiKeyRolePermission).not.toHaveBeenCalled();
    expect(accountProjectApiKeys.addAccountProjectApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ accountRoleId: resolvedRoleId }),
      tx
    );
  });
});

describe.each([
  ['revoke', 'revokeApiKey'],
  ['rotate', 'rotateApiKey'],
  ['delete', 'deleteApiKey'],
] as const)('ApiKeysHandler %s for an account project', (_label, method) => {
  const input = { id: apiKeyId, scope };

  it('runs the manage check before the key is changed', async () => {
    const { handler, apiKeys, accountProjectApiKeys, tx } = build();

    await handler[method]({ input } as never);

    expect(accountProjectApiKeys.validateCanManageAccountProjectApiKey).toHaveBeenCalledWith(
      accountId,
      projectId,
      apiKeyId,
      tx
    );
    expect(apiKeys[method]).toHaveBeenCalledOnce();
  });

  it('leaves the key unchanged when the manage check refuses', async () => {
    const { handler, apiKeys } = build({ refuseManage: true });

    await expect(handler[method]({ input } as never)).rejects.toBeInstanceOf(AuthorizationError);

    expect(apiKeys[method]).not.toHaveBeenCalled();
  });
});
