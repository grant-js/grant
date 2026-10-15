/**
 * Integration: REST routes for the async CDM import/export job flow:
 *   POST   /api/projects/:id/sync/jobs                  — enqueue import job
 *   POST   /api/projects/:id/sync/jobs/export           — enqueue export job
 *   POST   /api/projects/:id/sync/upload-url            — mint a CDM import upload URL (by reference)
 *   GET    /api/projects/:id/sync/jobs                  — paginated list
 *   GET    /api/projects/:id/sync/jobs/:jobId           — poll status
 *   GET    /api/projects/:id/sync/jobs/:jobId/payload   — download original CDM JSON
 *   GET    /api/projects/:id/sync/jobs/:jobId/snapshot  — download rollback or export artifact
 *   DELETE /api/projects/:id/sync/jobs/:jobId           — cancel
 */
import { NotFoundError } from '@grantjs/core';
import {
  CdmFindBy,
  CdmModeStrategy,
  ProjectSyncJobOperation,
  type SyncProjectInput,
  TokenType,
} from '@grantjs/schema';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { errorHandler } from '@/middleware/error.middleware';
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
const userId = '30000000-0000-4000-8000-000000000099';
const jobId = '40000000-0000-4000-8000-000000000077';
const enqueuedAt = '2026-05-02T10:00:00.000Z';
const uploadId = '123e4567-e89b-42d3-a456-426614174077';

const canonicalMode: SyncProjectInput['mode'] = {
  strategy: CdmModeStrategy.Merge,
  onConflict: null,
  confirmDestructive: false,
};

function emptyCdm(overrides: Partial<SyncProjectInput> = {}): SyncProjectInput {
  return {
    version: 1,
    id: null,
    mode: canonicalMode,
    roles: [],
    users: [],
    resources: [],
    permissions: [],
    groups: [],
    tags: [],
    ...overrides,
  };
}

function buildJobResponse(status: 'PENDING' | 'COMPLETED' | 'CANCELLED' = 'PENDING') {
  return {
    id: jobId,
    projectId,
    status,
    cdmVersion: 1,
    jobName: null,
    operation: ProjectSyncJobOperation.Import,
    modeStrategy: CdmModeStrategy.Merge,
    result: null,
    warnings: [],
    errorMessage: null,
    enqueuedAt,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hasSnapshot: false,
    snapshotTakenAt: null,
    snapshotSizeBytes: null,
  };
}

describe('project CDM sync REST (async jobs)', () => {
  let app: express.Express;
  let startProjectSync: ReturnType<typeof vi.fn>;
  let getProjectSyncJob: ReturnType<typeof vi.fn>;
  let listProjectSyncJobs: ReturnType<typeof vi.fn>;
  let getProjectSyncJobPayload: ReturnType<typeof vi.fn>;
  let getProjectSyncJobSnapshot: ReturnType<typeof vi.fn>;
  let startProjectExport: ReturnType<typeof vi.fn>;
  let cancelProjectSync: ReturnType<typeof vi.fn>;
  let requestProjectSyncUploadUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    startProjectSync = vi.fn().mockResolvedValue(buildJobResponse('PENDING'));
    getProjectSyncJob = vi.fn().mockResolvedValue(buildJobResponse('COMPLETED'));
    listProjectSyncJobs = vi.fn().mockResolvedValue({
      jobs: [buildJobResponse('COMPLETED'), buildJobResponse('PENDING')],
      totalCount: 2,
      hasNextPage: false,
    });
    getProjectSyncJobPayload = vi.fn().mockResolvedValue({
      byReference: false,
      payload: emptyCdm({ id: 'imp-1' }),
      jobName: 'imp-1',
      cdmVersion: 1,
    });
    getProjectSyncJobSnapshot = vi.fn().mockResolvedValue({
      snapshot: emptyCdm({
        roles: [
          {
            key: 'role-1',
            name: 'Existing role',
            description: null,
            groups: [],
            permissions: [],
            tags: [],
            primaryTag: null,
            metadata: null,
          },
        ],
      }),
      takenAt: new Date('2026-05-02T10:05:00.000Z'),
      sizeBytes: 1234,
    });
    startProjectExport = vi.fn().mockResolvedValue({
      ...buildJobResponse('PENDING'),
      operation: ProjectSyncJobOperation.Export,
      modeStrategy: null,
    });
    cancelProjectSync = vi.fn().mockResolvedValue(buildJobResponse('CANCELLED'));
    requestProjectSyncUploadUrl = vi.fn().mockResolvedValue({
      uploadId: uploadId,
      url: '/storage/imports/projects/p/u.json?exp=1&len=2&ct=application%2Fjson&sig=x',
      method: 'PUT',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      expiresAt: new Date('2026-10-14T12:05:00.000Z'),
    });

    const context = {
      user: { userId },
      handlers: {
        projects: {
          startProjectSync,
          getProjectSyncJob,
          listProjectSyncJobs,
          getProjectSyncJobPayload,
          getProjectSyncJobSnapshot,
          startProjectExport,
          cancelProjectSync,
          requestProjectSyncUploadUrl,
        },
      },
    } as unknown as RequestContext;

    app = express();
    app.use(express.json());
    app.use('/api/projects', createProjectsRouter(context));
    app.use(errorHandler);
  });

  it('POST /sync/jobs returns 202 with the persisted job and forwards enqueuedById from auth context', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/sync/jobs`)
      .send({
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
        version: 1,
        mode: canonicalMode,
        roles: [
          {
            key: 'viewer',
            name: 'Viewer',
            description: null,
            groups: [],
            permissions: [],
            tags: [],
            primaryTag: null,
            metadata: { legacyRoleKey: 'viewer' },
          },
        ],
        users: [
          {
            key: { value: userId, findBy: CdmFindBy.Id },
            name: 'Member',
            roles: ['viewer'],
            groups: [],
            permissions: [],
            tags: [],
            primaryTag: null,
            apiKeys: [],
            metadata: { legacyUserKey: 'u-1' },
          },
        ],
      });

    expect(res.status).toBe(202);
    expect(res.body.data).toMatchObject({
      id: jobId,
      projectId,
      status: 'PENDING',
    });
    expect(startProjectSync).toHaveBeenCalledTimes(1);
    expect(startProjectSync.mock.calls[0][0]).toMatchObject({
      id: projectId,
      enqueuedById: userId,
      input: {
        version: 1,
        mode: canonicalMode,
        roles: [
          expect.objectContaining({
            key: 'viewer',
            metadata: { legacyRoleKey: 'viewer' },
          }),
        ],
        users: [
          expect.objectContaining({
            key: { value: userId, findBy: CdmFindBy.Id },
            metadata: { legacyUserKey: 'u-1' },
          }),
        ],
      },
    });
  });

  describe('imported password hashes (ADR 0010)', () => {
    const HASH = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';
    const body = (password: unknown, findBy: string = CdmFindBy.Email) => ({
      scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
      version: 1,
      mode: canonicalMode,
      roles: [],
      users: [{ key: { value: 'jane.doe@example.com', findBy }, name: 'Jane', password }],
    });

    it('POST /sync/jobs forwards a valid bcrypt credential to the handler', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/sync/jobs`)
        .send(body({ algorithm: 'bcrypt', hash: HASH }));

      expect(res.status).toBe(202);
      expect(startProjectSync.mock.calls[0][0].input.users[0].password).toEqual({
        algorithm: 'bcrypt',
        hash: HASH,
      });
    });

    it.each([
      ['an unknown algorithm', { algorithm: 'argon2id', hash: HASH }],
      ['a malformed hash', { algorithm: 'bcrypt', hash: HASH.slice(0, -3) }],
      ['a cost outside the range', { algorithm: 'bcrypt', hash: `$2a$31$${HASH.slice(7)}` }],
    ])(
      'POST /sync/jobs refuses %s with a 400 that does not echo the hash',
      async (_label, password) => {
        const res = await request(app)
          .post(`/api/projects/${projectId}/sync/jobs`)
          .send(body(password));

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('password');
        expect(JSON.stringify(res.body)).not.toContain(HASH);
        expect(JSON.stringify(res.body)).not.toContain(HASH.slice(7));
        expect(startProjectSync).not.toHaveBeenCalled();
      }
    );
  });

  it('POST /sync/jobs maps project-level API key auth to system user for enqueuedById', async () => {
    const apiKeyId = 'd1bfe5e5-a05d-4e74-8e5e-5c1a64de802b';
    const apiKeyContext = {
      user: {
        userId: apiKeyId,
        tokenId: apiKeyId,
        type: TokenType.ApiKey,
        expiresAt: Date.now() + 60_000,
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
      },
      handlers: {
        projects: {
          startProjectSync,
          getProjectSyncJob,
          listProjectSyncJobs,
          getProjectSyncJobPayload,
          getProjectSyncJobSnapshot,
          startProjectExport,
          cancelProjectSync,
        },
      },
    } as unknown as RequestContext;

    const apiKeyApp = express();
    apiKeyApp.use(express.json());
    apiKeyApp.use('/api/projects', createProjectsRouter(apiKeyContext));
    apiKeyApp.use(errorHandler);

    const res = await request(apiKeyApp)
      .post(`/api/projects/${projectId}/sync/jobs`)
      .send({
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
        version: 1,
        mode: canonicalMode,
        roles: [],
        users: [],
      });

    expect(res.status).toBe(202);
    expect(startProjectSync.mock.calls[0][0]).toMatchObject({
      enqueuedById: config.system.systemUserId,
    });
  });

  it('POST /sync/jobs forwards tags, nested user api keys, and tag cross-references end-to-end', async () => {
    const tagId = '60000000-0000-4000-8000-000000000aaa';
    const res = await request(app)
      .post(`/api/projects/${projectId}/sync/jobs`)
      .send({
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
        version: 1,
        id: 'imp-tags-1',
        mode: canonicalMode,
        tags: [{ key: tagId, name: 'Alpha', color: '#fff', metadata: null }],
        roles: [
          {
            key: 'viewer',
            name: 'Viewer',
            description: null,
            groups: [],
            permissions: [],
            tags: [tagId],
            primaryTag: null,
            metadata: null,
          },
        ],
        users: [
          {
            key: { value: userId, findBy: CdmFindBy.Id },
            name: 'Member',
            roles: ['viewer'],
            groups: [],
            permissions: [],
            tags: [tagId],
            primaryTag: null,
            apiKeys: [
              {
                key: 'k1',
                clientSecret: 'x'.repeat(32),
                name: 'Bot',
                clientId: null,
                description: null,
                expiresAt: null,
                metadata: null,
              },
            ],
            metadata: null,
          },
        ],
      });

    expect(res.status).toBe(202);
    expect(startProjectSync).toHaveBeenCalledTimes(1);
    expect(startProjectSync.mock.calls[0][0]).toMatchObject({
      id: projectId,
      enqueuedById: userId,
      input: {
        version: 1,
        id: 'imp-tags-1',
        mode: canonicalMode,
        tags: [expect.objectContaining({ key: tagId, name: 'Alpha' })],
        roles: [
          expect.objectContaining({
            key: 'viewer',
            tags: [tagId],
          }),
        ],
        users: [
          expect.objectContaining({
            key: { value: userId, findBy: CdmFindBy.Id },
            tags: [tagId],
            apiKeys: [expect.objectContaining({ key: 'k1', name: 'Bot' })],
          }),
        ],
      },
    });
  });

  it('POST /sync/jobs/export accepts `tags` as an exportable section', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/sync/jobs/export`)
      .send({
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
        version: 1,
        sections: ['tags', 'roles'],
      });

    expect(res.status).toBe(202);
    expect(startProjectExport).toHaveBeenCalledWith(
      expect.objectContaining({
        id: projectId,
        input: expect.objectContaining({
          sections: ['tags', 'roles'],
        }),
      })
    );
  });

  it('POST /sync/jobs returns 400 when body is invalid', async () => {
    const res = await request(app).post(`/api/projects/${projectId}/sync/jobs`).send({
      version: 1,
    });

    expect(res.status).toBe(400);
    expect(startProjectSync).not.toHaveBeenCalled();
  });

  it('GET /sync/jobs/:jobId returns the polled job status', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/sync/jobs/${jobId}`)
      .query({ scopeId: `${accountId}:${projectId}`, tenant: 'accountProject' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: jobId, status: 'COMPLETED' });
    expect(getProjectSyncJob).toHaveBeenCalledWith({
      id: projectId,
      jobId,
      scope: { id: `${accountId}:${projectId}`, tenant: 'accountProject' },
    });
  });

  it('DELETE /sync/jobs/:jobId cancels the job', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/sync/jobs/${jobId}`)
      .query({ scopeId: `${accountId}:${projectId}`, tenant: 'accountProject' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: jobId, status: 'CANCELLED' });
    expect(cancelProjectSync).toHaveBeenCalledWith({
      id: projectId,
      jobId,
      scope: { id: `${accountId}:${projectId}`, tenant: 'accountProject' },
    });
  });

  it('GET /sync/jobs returns the paginated list', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/sync/jobs`)
      .query({
        scopeId: `${accountId}:${projectId}`,
        tenant: 'accountProject',
        page: '1',
        limit: '20',
        sortField: 'enqueuedAt',
        sortOrder: 'DESC',
        status: 'PENDING',
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ totalCount: 2, hasNextPage: false });
    expect(res.body.data.jobs).toHaveLength(2);
    expect(listProjectSyncJobs).toHaveBeenCalledTimes(1);
    const args = listProjectSyncJobs.mock.calls[0][0];
    expect(args).toMatchObject({
      id: projectId,
      scope: { id: `${accountId}:${projectId}`, tenant: 'accountProject' },
      sort: { field: 'enqueuedAt', order: 'DESC' },
      status: 'PENDING',
    });
    // page/limit may arrive as strings or numbers depending on the Express
    // request shape and whether zod transforms propagated through query mutation;
    // assert numerically.
    expect(Number(args.page)).toBe(1);
    expect(Number(args.limit)).toBe(20);
  });

  it('GET /sync/jobs/:jobId/payload streams the CDM JSON with attachment headers', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/sync/jobs/${jobId}/payload`)
      .query({ scopeId: `${accountId}:${projectId}`, tenant: 'accountProject' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-disposition']).toBe('attachment; filename="cdm-imp-1.json"');
    expect(res.body).toMatchObject({
      version: 1,
      id: 'imp-1',
      roles: [],
      users: [],
    });
    expect(getProjectSyncJobPayload).toHaveBeenCalledWith({
      id: projectId,
      jobId,
      scope: { id: `${accountId}:${projectId}`, tenant: 'accountProject' },
    });
  });

  it('GET /sync/jobs/:jobId/payload falls back to jobId in filename when payload id is null', async () => {
    getProjectSyncJobPayload.mockResolvedValueOnce({
      byReference: false,
      payload: emptyCdm(),
      jobName: null,
      cdmVersion: 1,
    });

    const res = await request(app)
      .get(`/api/projects/${projectId}/sync/jobs/${jobId}/payload`)
      .query({ scopeId: `${accountId}:${projectId}`, tenant: 'accountProject' });

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toBe(`attachment; filename="cdm-${jobId}.json"`);
  });

  describe('by reference (ADR 0009)', () => {
    const scope = { tenant: 'accountProject', id: `${accountId}:${projectId}` };

    it('POST /sync/upload-url mints a URL for the project in the path and the scope in the body', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/sync/upload-url`)
        .send({ scope, contentLength: 6 * 1024 * 1024 });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        uploadId,
        method: 'PUT',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
      });
      expect(requestProjectSyncUploadUrl).toHaveBeenCalledWith({
        id: projectId,
        scope,
        input: { contentLength: 6 * 1024 * 1024, contentType: undefined },
      });
    });

    it('POST /sync/upload-url forwards an explicit content type for the handler to judge', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/sync/upload-url`)
        .send({ scope, contentLength: 10, contentType: 'image/png' })
        .expect(200);

      expect(requestProjectSyncUploadUrl.mock.calls[0][0]).toMatchObject({
        input: { contentType: 'image/png' },
      });
    });

    it.each([
      ['a missing length', { scope }],
      ['a zero length', { scope, contentLength: 0 }],
      ['a fractional length', { scope, contentLength: 1.5 }],
      ['a negative length', { scope, contentLength: -4 }],
      ['no scope', { contentLength: 10 }],
    ])('POST /sync/upload-url answers 400 for %s, before the handler', async (_label, body) => {
      const res = await request(app).post(`/api/projects/${projectId}/sync/upload-url`).send(body);

      expect(res.status).toBe(400);
      expect(requestProjectSyncUploadUrl).not.toHaveBeenCalled();
    });

    it('POST /sync/upload-url refuses a project id in the path that is not a uuid', async () => {
      const res = await request(app)
        .post('/api/projects/not-a-uuid/sync/upload-url')
        .send({ scope, contentLength: 10 });

      expect(res.status).toBe(400);
      expect(requestProjectSyncUploadUrl).not.toHaveBeenCalled();
    });

    it('POST /sync/jobs accepts a body that carries only mode and source, and forwards it', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/sync/jobs`)
        .send({
          scope,
          id: 'nightly',
          mode: canonicalMode,
          source: { uploadId, entityCount: 4200 },
        });

      expect(res.status).toBe(202);
      expect(startProjectSync.mock.calls[0][0]).toMatchObject({
        id: projectId,
        enqueuedById: userId,
        input: {
          id: 'nightly',
          mode: canonicalMode,
          source: { uploadId, entityCount: 4200 },
        },
      });
      expect(startProjectSync.mock.calls[0][0].input).not.toHaveProperty('roles');
      expect(startProjectSync.mock.calls[0][0].input).not.toHaveProperty('users');
    });

    it('POST /sync/jobs refuses entity arrays beside a source with 400, before the handler', async () => {
      const res = await request(app).post(`/api/projects/${projectId}/sync/jobs`).send({
        scope,
        version: 1,
        mode: canonicalMode,
        roles: [],
        users: [],
        source: { uploadId },
      });

      expect(res.status).toBe(400);
      expect(startProjectSync).not.toHaveBeenCalled();
    });

    it('POST /sync/jobs refuses a source whose upload id is not a uuid', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/sync/jobs`)
        .send({ scope, mode: canonicalMode, source: { uploadId: '../../x' } });

      expect(res.status).toBe(400);
      expect(startProjectSync).not.toHaveBeenCalled();
    });

    it('POST /sync/jobs still refuses an inline body with no roles, as before', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/sync/jobs`)
        .send({ scope, version: 1, mode: canonicalMode, users: [] });

      expect(res.status).toBe(400);
      expect(startProjectSync).not.toHaveBeenCalled();
    });

    it('POST /sync/jobs keeps `searchable` from an inline body, which the REST schema used to strip', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/sync/jobs`)
        .send({
          scope,
          version: 1,
          mode: canonicalMode,
          roles: [{ key: 'r', name: 'R', searchable: ['legacy-1'] }],
          users: [
            {
              key: { value: 'a@example.com', findBy: CdmFindBy.Email },
              name: 'A',
              searchable: { email: 'a@example.com' },
            },
          ],
          groups: [{ key: 'g', name: 'G', searchable: ['g-1'] }],
        })
        .expect(202);

      expect(startProjectSync.mock.calls[0][0].input).toMatchObject({
        roles: [expect.objectContaining({ searchable: ['legacy-1'] })],
        users: [expect.objectContaining({ searchable: { email: 'a@example.com' } })],
        groups: [expect.objectContaining({ searchable: ['g-1'] })],
      });
    });

    it('GET /sync/jobs/:jobId/payload describes a by-reference job and offers no download', async () => {
      getProjectSyncJobPayload.mockResolvedValueOnce({
        byReference: true,
        sizeBytes: 6_291_456,
        jobName: 'nightly',
        cdmVersion: 1,
      });

      const res = await request(app)
        .get(`/api/projects/${projectId}/sync/jobs/${jobId}/payload`)
        .query({ scopeId: `${accountId}:${projectId}`, tenant: 'accountProject' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toBeUndefined();
      expect(res.body).toEqual({ byReference: true, sizeBytes: 6_291_456 });
    });
  });

  it('GET /sync/jobs/:jobId/snapshot streams the rollback snapshot with attachment headers', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/sync/jobs/${jobId}/snapshot`)
      .query({ scopeId: `${accountId}:${projectId}`, tenant: 'accountProject' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="cdm-snapshot-${jobId}.json"`
    );
    expect(res.body).toMatchObject({
      version: 1,
      roles: [
        {
          key: 'role-1',
          name: 'Existing role',
        },
      ],
    });
    expect(getProjectSyncJobSnapshot).toHaveBeenCalledWith({
      id: projectId,
      jobId,
      scope: { id: `${accountId}:${projectId}`, tenant: 'accountProject' },
    });
  });

  it('POST /sync/jobs/export returns 202 and forwards body to startProjectExport', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/sync/jobs/export`)
      .send({
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
        version: 1,
        sections: ['roles', 'users'],
        includeUserApiKeys: false,
      });

    expect(res.status).toBe(202);
    expect(startProjectExport).toHaveBeenCalledWith({
      id: projectId,
      scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
      input: {
        version: 1,
        sections: ['roles', 'users'],
        includeUserApiKeys: false,
      },
      enqueuedById: userId,
    });
  });

  it('POST /sync/jobs/export returns 400 when permissions is requested without resources', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/sync/jobs/export`)
      .send({
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
        version: 1,
        sections: ['permissions'],
      });

    expect(res.status).toBe(400);
    expect(startProjectExport).not.toHaveBeenCalled();
  });

  it('POST /sync/jobs forwards replace mode with confirmDestructive to the handler', async () => {
    const replaceMode = {
      strategy: CdmModeStrategy.Replace,
      onConflict: null,
      confirmDestructive: true,
    };
    const res = await request(app)
      .post(`/api/projects/${projectId}/sync/jobs`)
      .send({
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
        version: 1,
        mode: replaceMode,
        roles: [],
        users: [],
        resources: [],
        permissions: [],
        groups: [],
        tags: [],
      });

    expect(res.status).toBe(202);
    expect(startProjectSync).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          mode: replaceMode,
        }),
      })
    );
  });

  it('POST /sync/jobs returns 400 for replace without confirmDestructive', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/sync/jobs`)
      .send({
        scope: { tenant: 'accountProject', id: `${accountId}:${projectId}` },
        version: 1,
        mode: {
          strategy: CdmModeStrategy.Replace,
          onConflict: null,
          confirmDestructive: false,
        },
        roles: [],
        users: [],
        resources: [],
        permissions: [],
        groups: [],
        tags: [],
      });

    expect(res.status).toBe(400);
    expect(startProjectSync).not.toHaveBeenCalled();
  });

  it('GET /sync/jobs/:jobId/snapshot returns 404 when handler throws NotFoundError', async () => {
    getProjectSyncJobSnapshot.mockRejectedValueOnce(
      new NotFoundError('ProjectSyncJobSnapshot', jobId)
    );

    const res = await request(app)
      .get(`/api/projects/${projectId}/sync/jobs/${jobId}/snapshot`)
      .query({ scopeId: `${accountId}:${projectId}`, tenant: 'accountProject' });

    expect(res.status).toBe(404);
  });

  it('GET /sync/jobs returns 400 for invalid status filter', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/sync/jobs`)
      .query({
        scopeId: `${accountId}:${projectId}`,
        tenant: 'accountProject',
        status: 'NOT_A_STATUS',
      });

    expect(res.status).toBe(400);
    expect(listProjectSyncJobs).not.toHaveBeenCalled();
  });

  it('GET /sync/jobs/:jobId returns 400 when scopeId is missing', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/sync/jobs/${jobId}`)
      .query({ tenant: 'accountProject' });

    expect(res.status).toBe(400);
    expect(getProjectSyncJob).not.toHaveBeenCalled();
  });
});
