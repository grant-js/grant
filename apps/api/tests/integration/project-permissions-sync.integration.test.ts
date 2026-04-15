/**
 * Integration: POST /api/projects/:id/permissions/sync wires validation and handler.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createProjectsRouter } from '@/rest/routes/projects.routes';
import type { RequestContext } from '@/types';

const noopLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: () => noopLogger,
};

vi.mock('@/middleware/request-logging.middleware', () => ({
  getRequestLogger: () => noopLogger,
}));

vi.mock('@/lib/authorization', () => ({
  authorizeRestRoute:
    () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
  requireEmailThenMfaRest:
    () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
}));

const projectId = '00000000-0000-4000-8000-000000000011';
const accountId = '00000000-0000-4000-8000-000000000020';

describe('project permissions sync REST', () => {
  let app: express.Express;
  let syncProjectPermissions: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    syncProjectPermissions = vi.fn().mockResolvedValue({
      projectId,
      importId: null,
      rolesCreated: 1,
      groupsCreated: 1,
      roleGroupsLinked: 1,
      groupPermissionsLinked: 1,
      projectRolesLinked: 1,
      projectGroupsLinked: 1,
      projectPermissionsLinked: 1,
      projectResourcesLinked: 0,
      projectUsersEnsured: 0,
      userRolesAssigned: 0,
      warnings: [],
    });

    const context = {
      handlers: {
        projects: {
          syncProjectPermissions,
        },
      },
    } as unknown as RequestContext;

    app = express();
    app.use(express.json());
    app.use('/api/projects', createProjectsRouter(context));
  });

  it('returns 200 with sync result', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/permissions/sync`)
      .send({
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
        cdmVersion: 1,
        roleTemplates: [
          {
            externalKey: 'viewer',
            name: 'Viewer',
            permissionRefs: [{ resourceSlug: 'Tag', action: 'Query' }],
          },
        ],
        userAssignments: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.projectId).toBe(projectId);
    expect(syncProjectPermissions).toHaveBeenCalledTimes(1);
    expect(syncProjectPermissions.mock.calls[0][0]).toMatchObject({
      id: projectId,
      input: {
        cdmVersion: 1,
        roleTemplates: expect.any(Array),
      },
    });
  });

  it('returns 400 when body is invalid', async () => {
    const res = await request(app).post(`/api/projects/${projectId}/permissions/sync`).send({
      cdmVersion: 1,
      roleTemplates: [],
      userAssignments: [],
    });

    expect(res.status).toBe(400);
    expect(syncProjectPermissions).not.toHaveBeenCalled();
  });
});
