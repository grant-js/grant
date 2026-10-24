import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAppsHandler } from '@/handlers/project-apps.handler';
import { NotFoundError, ValidationError } from '@/lib/errors';

const accountId = '00000000-0000-4000-8000-0000000000a1';
const projectId = '00000000-0000-4000-8000-0000000000b1';
const otherProjectId = '00000000-0000-4000-8000-0000000000b2';
const projectAppId = '00000000-0000-4000-8000-0000000000c1';
const scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

function appFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: projectAppId,
    projectId,
    clientId: 'client-1',
    name: 'App',
    redirectUris: ['https://app.example/cb'],
    scopes: null,
    enabledProviders: null,
    allowSignUp: false,
    signUpRoleId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createHandler() {
  const projectApps = {
    getProjectAppById: vi.fn(),
    updateProjectApp: vi.fn(),
    deleteProjectApp: vi.fn(),
  };
  const projectAppTags = {
    getProjectAppTags: vi.fn().mockResolvedValue([]),
    addProjectAppTag: vi.fn(),
    removeProjectAppTag: vi.fn(),
    updateProjectAppTag: vi.fn(),
  };
  const db = {
    withTransaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({})),
  };
  const handler = new ProjectAppsHandler(
    projectApps as never,
    projectAppTags as never,
    {} as never,
    {
      projectRoles: { getProjectRoles: vi.fn().mockResolvedValue([]) },
      projectPermissions: { getAllowedScopeSlugsForProject: vi.fn().mockResolvedValue([]) },
    } as never,
    db as never,
    {} as never
  );
  vi.spyOn(handler, 'getScopedProjectIds').mockResolvedValue([projectId]);
  vi.spyOn(handler, 'removeProjectAppIdFromScopeCache').mockResolvedValue();
  return { handler, projectApps };
}

describe('ProjectAppsHandler project-app bind', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProjectApp', () => {
    it('rejects a missing project app as not found', async () => {
      const { handler, projectApps } = createHandler();
      projectApps.getProjectAppById.mockResolvedValue(null);

      await expect(
        handler.updateProjectApp({
          id: projectAppId,
          input: { scope, name: 'Renamed' },
        })
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(projectApps.updateProjectApp).not.toHaveBeenCalled();
    });

    it('rejects a cross-project id as validation error', async () => {
      const { handler, projectApps } = createHandler();
      projectApps.getProjectAppById.mockResolvedValue(appFixture({ projectId: otherProjectId }));

      await expect(
        handler.updateProjectApp({
          id: projectAppId,
          input: { scope, name: 'Renamed' },
        })
      ).rejects.toBeInstanceOf(ValidationError);
      await expect(
        handler.updateProjectApp({
          id: projectAppId,
          input: { scope, name: 'Renamed' },
        })
      ).rejects.toThrow('projectAppId must belong to the scoped project');
      expect(projectApps.updateProjectApp).not.toHaveBeenCalled();
    });

    it('updates when the app belongs to the scoped project', async () => {
      const { handler, projectApps } = createHandler();
      const existing = appFixture();
      const updated = appFixture({ name: 'Renamed' });
      projectApps.getProjectAppById.mockResolvedValue(existing);
      projectApps.updateProjectApp.mockResolvedValue(updated);

      await expect(
        handler.updateProjectApp({
          id: projectAppId,
          input: { scope, name: 'Renamed' },
        })
      ).resolves.toEqual(updated);
      expect(projectApps.updateProjectApp).toHaveBeenCalledWith(
        expect.objectContaining({ id: projectAppId, projectId, name: 'Renamed' }),
        {}
      );
    });
  });

  describe('deleteProjectApp', () => {
    it('rejects a missing project app as not found', async () => {
      const { handler, projectApps } = createHandler();
      projectApps.getProjectAppById.mockResolvedValue(null);

      await expect(handler.deleteProjectApp({ scope, id: projectAppId })).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(projectApps.deleteProjectApp).not.toHaveBeenCalled();
    });

    it('rejects a cross-project id as validation error', async () => {
      const { handler, projectApps } = createHandler();
      projectApps.getProjectAppById.mockResolvedValue(appFixture({ projectId: otherProjectId }));

      await expect(handler.deleteProjectApp({ scope, id: projectAppId })).rejects.toBeInstanceOf(
        ValidationError
      );
      await expect(handler.deleteProjectApp({ scope, id: projectAppId })).rejects.toThrow(
        'projectAppId must belong to the scoped project'
      );
      expect(projectApps.deleteProjectApp).not.toHaveBeenCalled();
    });

    it('deletes when the app belongs to the scoped project', async () => {
      const { handler, projectApps } = createHandler();
      const existing = appFixture();
      const deleted = appFixture({ deletedAt: new Date('2026-01-02T00:00:00.000Z') });
      projectApps.getProjectAppById.mockResolvedValue(existing);
      projectApps.deleteProjectApp.mockResolvedValue(deleted);

      await expect(handler.deleteProjectApp({ scope, id: projectAppId })).resolves.toEqual(deleted);
      expect(projectApps.deleteProjectApp).toHaveBeenCalledWith(
        { id: projectAppId, projectId },
        {}
      );
    });
  });
});
