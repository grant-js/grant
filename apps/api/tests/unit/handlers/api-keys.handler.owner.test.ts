import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeysHandler } from '@/handlers/api-keys.handler';

const accountId = '10000000-0000-4000-8000-0000000000a1';
const organizationId = '10000000-0000-4000-8000-0000000000a2';
const projectId = '10000000-0000-4000-8000-0000000000a3';
const userId = '10000000-0000-4000-8000-0000000000a4';
const roleId = '10000000-0000-4000-8000-0000000000a5';
const apiKeyId = '10000000-0000-4000-8000-0000000000a6';

function build() {
  const tx = { __tx: true };
  const apiKeys = {
    createApiKey: vi
      .fn()
      .mockResolvedValue({ id: apiKeyId, clientId: 'client', clientSecret: 's' }),
  };
  const projectUserApiKeys = { addProjectUserApiKey: vi.fn() };
  const accountProjectApiKeys = {
    addAccountProjectApiKey: vi.fn(),
    resolveAccountRoleIdForCurrentUser: vi.fn().mockResolvedValue(roleId),
  };
  const organizationProjectApiKeys = {
    addOrganizationProjectApiKey: vi.fn(),
    validateOrganizationProjectApiKeyRolePermission: vi.fn(),
  };
  const cache = { apiKeys: { has: vi.fn().mockResolvedValue(false) } };

  const handler = new ApiKeysHandler(
    apiKeys as never,
    accountProjectApiKeys as never,
    organizationProjectApiKeys as never,
    projectUserApiKeys as never,
    {} as never,
    cache as never,
    {} as never,
    { withTransaction: async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx) } as never
  );
  return { handler, apiKeys, projectUserApiKeys, tx };
}

describe('ApiKeysHandler.createApiKey owner', () => {
  it.each([
    ['projectUser', Tenant.ProjectUser, `${projectId}:${userId}`],
    ['accountProjectUser', Tenant.AccountProjectUser, `${accountId}:${projectId}:${userId}`],
    [
      'organizationProjectUser',
      Tenant.OrganizationProjectUser,
      `${organizationId}:${projectId}:${userId}`,
    ],
  ])('passes the project and user of a %s scope to the service', async (_label, tenant, id) => {
    const { handler, apiKeys, projectUserApiKeys, tx } = build();

    await handler.createApiKey({ input: { scope: { tenant, id }, name: 'Prod key' } } as never);

    expect(apiKeys.createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ owner: { projectId, userId } }),
      tx
    );
    expect(projectUserApiKeys.addProjectUserApiKey).toHaveBeenCalledWith(
      { projectId, userId, apiKeyId },
      tx
    );
  });

  it.each([
    ['accountProject', Tenant.AccountProject, `${accountId}:${projectId}`],
    ['organizationProject', Tenant.OrganizationProject, `${organizationId}:${projectId}`],
  ])('passes no owner for a %s scope', async (_label, tenant, id) => {
    const { handler, apiKeys, tx } = build();

    await handler.createApiKey({
      input: { scope: { tenant, id }, name: 'Prod key', roleId },
    } as never);

    expect(apiKeys.createApiKey).toHaveBeenCalledOnce();
    const [params, passedTx] = apiKeys.createApiKey.mock.calls[0];
    expect(params).not.toHaveProperty('owner');
    expect(passedTx).toBe(tx);
  });
});
