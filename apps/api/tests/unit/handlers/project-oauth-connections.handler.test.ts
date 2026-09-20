import { ProjectOAuthConnectionProvider, Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectOAuthConnectionsHandler } from '@/handlers/project-oauth-connections.handler';

const projectId = '10000000-0000-4000-8000-000000000001';
const accountId = '10000000-0000-4000-8000-000000000003';
const scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

const mockConnections = {
  listByProject: vi.fn(),
  upsert: vi.fn(),
  clear: vi.fn(),
};
const mockDb = {
  withTransaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({})),
};

function createHandler(): ProjectOAuthConnectionsHandler {
  return new ProjectOAuthConnectionsHandler(
    mockConnections as never,
    {} as never,
    {} as never,
    mockDb as never
  );
}

describe('ProjectOAuthConnectionsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnections.listByProject.mockResolvedValue([]);
    mockConnections.upsert.mockResolvedValue({
      id: 'conn-1',
      projectId,
      provider: ProjectOAuthConnectionProvider.Github,
      clientId: 'byo-github-client',
      isConfigured: true,
    });
    mockConnections.clear.mockResolvedValue(true);
  });

  it('lists connections for the project in scope', async () => {
    const handler = createHandler();
    await handler.getProjectOAuthConnections(scope);
    expect(mockConnections.listByProject).toHaveBeenCalledWith(projectId);
  });

  it('rejects non-project scopes', async () => {
    const handler = createHandler();
    await expect(
      handler.getProjectOAuthConnections({ tenant: Tenant.Account, id: accountId })
    ).rejects.toThrow('accountProject or organizationProject');
  });

  it('upserts inside a transaction using the scoped project id', async () => {
    const handler = createHandler();
    await handler.upsertProjectOAuthConnection({
      scope,
      provider: ProjectOAuthConnectionProvider.Github,
      clientId: 'byo-github-client',
      clientSecret: 'byo-github-secret',
    });
    expect(mockDb.withTransaction).toHaveBeenCalled();
    expect(mockConnections.upsert).toHaveBeenCalledWith(
      {
        projectId,
        provider: ProjectOAuthConnectionProvider.Github,
        clientId: 'byo-github-client',
        clientSecret: 'byo-github-secret',
      },
      {}
    );
  });

  it('clears using the scoped project id, not a client-supplied project id', async () => {
    const handler = createHandler();
    await handler.clearProjectOAuthConnection({
      scope,
      provider: ProjectOAuthConnectionProvider.Google,
    });
    expect(mockConnections.clear).toHaveBeenCalledWith(
      { projectId, provider: ProjectOAuthConnectionProvider.Google },
      {}
    );
  });
});
