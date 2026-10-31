import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysHandler } from '@/handlers/api-keys.handler';
import { AuthorizationError } from '@/lib/errors';

const accountId = '10000000-0000-4000-8000-0000000000d1';
const projectId = '10000000-0000-4000-8000-0000000000d2';
const suppliedRoleId = '10000000-0000-4000-8000-0000000000d3';
const resolvedRoleId = '10000000-0000-4000-8000-0000000000d4';
const apiKeyId = '10000000-0000-4000-8000-0000000000d5';

function build(options: { refuseSupplied?: boolean } = {}) {
  const tx = { __tx: true };
  const apiKeys = {
    createApiKey: vi
      .fn()
      .mockResolvedValue({ id: apiKeyId, clientId: 'client', clientSecret: 's' }),
  };
  const accountProjectApiKeys = {
    addAccountProjectApiKey: vi.fn(),
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
