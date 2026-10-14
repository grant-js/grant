/**
 * ProjectHandler's half of a CDM import by reference (ADR 0009): minting the upload URL and
 * starting a job from the upload. What these hold in place is the security bar: the key is
 * derived on the server from the authorized project, the document is never read on the request
 * path, and every refusal the request path owns happens before a row exists.
 */
import {
  CdmModeStrategy,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  Tenant,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { ProjectHandler } from '@/handlers/projects.handler';
import { PayloadTooLargeError, ValidationError } from '@/lib/errors';

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

const projectId = '00000000-0000-4000-8000-000000000011';
const otherProjectId = '00000000-0000-4000-8000-0000000000ff';
const accountId = '00000000-0000-4000-8000-000000000020';
const userId = '30000000-0000-4000-8000-000000000099';
const uploadId = '123e4567-e89b-42d3-a456-426614174077';
const scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const merge = { strategy: CdmModeStrategy.Merge, onConflict: null, confirmDestructive: false };
const expectedKey = `imports/projects/${projectId}/${uploadId}.json`;

function buildJob() {
  return {
    id: '40000000-0000-4000-8000-000000000077',
    projectId,
    status: ProjectSyncJobStatus.Pending,
    cdmVersion: 1,
    jobName: null,
    operation: ProjectSyncJobOperation.Import,
    modeStrategy: CdmModeStrategy.Merge,
    result: null,
    warnings: [],
    errorMessage: null,
    enqueuedAt: new Date(),
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hasSnapshot: false,
    snapshotTakenAt: null,
    snapshotSizeBytes: null,
  };
}

function build() {
  const syncJobs = {
    create: vi.fn().mockResolvedValue(buildJob()),
    findActiveByJobKey: vi.fn().mockResolvedValue(null),
    getPayload: vi.fn(),
  };
  const fileStorage = {
    getUploadUrl: vi
      .fn()
      .mockImplementation(async (path: string, options: { contentType: string }) => ({
        url: `https://bucket.example/${path}?sig=x`,
        method: 'PUT',
        headers: { 'Content-Type': options.contentType },
        expiresAt: new Date('2026-10-14T12:05:00Z'),
      })),
    getMetadata: vi.fn(),
    download: vi.fn(),
    getUrl: vi.fn(),
  };
  const enqueue = vi.fn().mockResolvedValue(undefined);

  const handler = new ProjectHandler(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    syncJobs as never,
    { enqueue } as never,
    {} as never,
    {} as never,
    {} as never,
    fileStorage as never
  );
  return { handler, syncJobs, fileStorage, enqueue };
}

describe('ProjectHandler.requestProjectSyncUploadUrl', () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it('mints a URL at a key derived from the authorized project and a server-minted id', async () => {
    const result = await ctx.handler.requestProjectSyncUploadUrl({
      id: projectId,
      scope,
      input: { contentLength: 6 * 1024 * 1024 },
    });

    expect(ctx.fileStorage.getUploadUrl).toHaveBeenCalledTimes(1);
    const [path, options] = ctx.fileStorage.getUploadUrl.mock.calls[0] as [
      string,
      { contentLength: number; contentType: string; expiresInSeconds: number },
    ];
    expect(path).toBe(`imports/projects/${projectId}/${result.uploadId}.json`);
    expect(result.uploadId).toMatch(/^[0-9a-f-]{36}$/);
    // Exact length committed (ADR 0007), type pinned, expiry from the CDM policy.
    expect(options).toEqual({
      contentLength: 6 * 1024 * 1024,
      contentType: 'application/json',
      expiresInSeconds: config.storage.cdmImport.expirySeconds,
    });
    expect(result).toMatchObject({
      url: expect.stringContaining(path),
      method: 'PUT',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
    });
  });

  it('mints a fresh id every time', async () => {
    const first = await ctx.handler.requestProjectSyncUploadUrl({
      id: projectId,
      scope,
      input: { contentLength: 10 },
    });
    const second = await ctx.handler.requestProjectSyncUploadUrl({
      id: projectId,
      scope,
      input: { contentLength: 10 },
    });

    expect(first.uploadId).not.toBe(second.uploadId);
  });

  it('refuses an id that is not the project in the authorized scope, before minting', async () => {
    // The project in the key comes from the scope the authorizer checked. An `id` argument
    // pointing somewhere else must not be able to steer the key to another tenant.
    await expect(
      ctx.handler.requestProjectSyncUploadUrl({
        id: otherProjectId,
        scope,
        input: { contentLength: 10 },
      })
    ).rejects.toThrow(ValidationError);

    expect(ctx.fileStorage.getUploadUrl).not.toHaveBeenCalled();
  });

  it('refuses a scope that is not a project scope', async () => {
    await expect(
      ctx.handler.requestProjectSyncUploadUrl({
        id: projectId,
        scope: { tenant: Tenant.Account, id: accountId },
        input: { contentLength: 10 },
      })
    ).rejects.toThrow(/accountProject or organizationProject/);

    expect(ctx.fileStorage.getUploadUrl).not.toHaveBeenCalled();
  });

  it('refuses a content type other than application/json, the image policy included', async () => {
    for (const contentType of ['image/png', 'text/plain', 'application/json; charset=utf-8']) {
      await expect(
        ctx.handler.requestProjectSyncUploadUrl({
          id: projectId,
          scope,
          input: { contentLength: 10, contentType },
        })
      ).rejects.toThrow(ValidationError);
    }
    expect(ctx.fileStorage.getUploadUrl).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses a length of %s', async (contentLength) => {
    await expect(
      ctx.handler.requestProjectSyncUploadUrl({
        id: projectId,
        scope,
        input: { contentLength },
      })
    ).rejects.toThrow(ValidationError);
  });

  it('refuses a length over CDM_UPLOAD_MAX_BYTES with 413 semantics, and accepts exactly the max', async () => {
    const max = config.storage.cdmImport.maxBytes;

    await expect(
      ctx.handler.requestProjectSyncUploadUrl({
        id: projectId,
        scope,
        input: { contentLength: max + 1 },
      })
    ).rejects.toMatchObject({
      constructor: PayloadTooLargeError,
      limitBytes: max,
      receivedBytes: max + 1,
    });
    expect(ctx.fileStorage.getUploadUrl).not.toHaveBeenCalled();

    await expect(
      ctx.handler.requestProjectSyncUploadUrl({
        id: projectId,
        scope,
        input: { contentLength: max },
      })
    ).resolves.toMatchObject({ method: 'PUT' });
  });

  it('does not widen the image policy: a CDM-sized length is refused only by the CDM policy', () => {
    // Pinned so the two policies cannot be merged by accident: a picture is capped at 5 MiB
    // by `upload`, a CDM import at its own, larger ceiling by `cdmImport`.
    expect(config.storage.cdmImport.maxBytes).toBeGreaterThan(config.storage.upload.maxFileSize);
    expect(config.storage.upload.allowedTypes).not.toContain('application/json');
    expect(config.storage.cdmImport.contentTypes).toEqual(['application/json']);
  });
});

describe('ProjectHandler.startProjectSync by reference', () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
    ctx.fileStorage.getMetadata.mockResolvedValue({ size: 6 * 1024 * 1024 });
  });

  const start = (input: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
    ctx.handler.startProjectSync({
      id: projectId,
      scope,
      input: { mode: merge, source: { uploadId, entityCount: 4000 }, ...input } as never,
      enqueuedById: userId,
      ...overrides,
    });

  it('records the reference, not the document, and enqueues once', async () => {
    const job = await start({});

    expect(job).toMatchObject({ id: expect.any(String) });
    expect(ctx.syncJobs.create).toHaveBeenCalledWith({
      projectId,
      scope,
      cdmVersion: 1,
      jobName: null,
      operation: 'import',
      modeStrategy: 'merge',
      payload: null,
      payloadRef: { path: expectedKey, sizeBytes: 6 * 1024 * 1024, entityCountHint: 4000 },
      enqueuedById: userId,
    });
    expect(ctx.enqueue).toHaveBeenCalledTimes(1);
  });

  it('derives the key from the project in the authorized scope, never from the client', async () => {
    await start({});

    expect(ctx.fileStorage.getMetadata).toHaveBeenCalledTimes(1);
    expect(ctx.fileStorage.getMetadata).toHaveBeenCalledWith(expectedKey);
  });

  it("cannot reach another project's upload: the same id resolves under this project's prefix", async () => {
    // A client that learned another tenant's uploadId gains nothing: the key is rebuilt from
    // *this* project, so it addresses an object that does not exist, and the answer is 404.
    ctx.fileStorage.getMetadata.mockImplementation(async (path: string) =>
      path === `imports/projects/${otherProjectId}/${uploadId}.json` ? { size: 10 } : null
    );

    await expect(start({})).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect(ctx.fileStorage.getMetadata).toHaveBeenCalledWith(expectedKey);
    expect(ctx.syncJobs.create).not.toHaveBeenCalled();
  });

  it('refuses an upload id that is not a uuid before asking the store anything', async () => {
    await expect(
      start({ source: { uploadId: '../../organizations/o/picture.png' } })
    ).rejects.toThrow(ValidationError);

    expect(ctx.fileStorage.getMetadata).not.toHaveBeenCalled();
    expect(ctx.syncJobs.create).not.toHaveBeenCalled();
  });

  it('answers not-found when nothing was uploaded', async () => {
    ctx.fileStorage.getMetadata.mockResolvedValue(null);

    await expect(start({})).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(ctx.syncJobs.create).not.toHaveBeenCalled();
    expect(ctx.enqueue).not.toHaveBeenCalled();
  });

  it('refuses an empty upload', async () => {
    ctx.fileStorage.getMetadata.mockResolvedValue({ size: 0 });

    await expect(start({})).rejects.toThrow(/empty/);
    expect(ctx.syncJobs.create).not.toHaveBeenCalled();
  });

  it('refuses an upload over the policy maximum, with the limit', async () => {
    const max = config.storage.cdmImport.maxBytes;
    ctx.fileStorage.getMetadata.mockResolvedValue({ size: max + 1 });

    await expect(start({})).rejects.toMatchObject({
      constructor: PayloadTooLargeError,
      limitBytes: max,
      receivedBytes: max + 1,
    });
    expect(ctx.syncJobs.create).not.toHaveBeenCalled();
  });

  it('refuses a content type the store recorded that is not JSON', async () => {
    ctx.fileStorage.getMetadata.mockResolvedValue({ size: 10, contentType: 'image/png' });

    await expect(start({})).rejects.toThrow(/image\/png/);
    expect(ctx.syncJobs.create).not.toHaveBeenCalled();
  });

  it.each(['application/json', 'application/json; charset=utf-8', undefined])(
    'accepts a recorded content type of %s (the local adapter records none)',
    async (contentType) => {
      ctx.fileStorage.getMetadata.mockResolvedValue({ size: 10, contentType });

      await expect(start({})).resolves.toBeDefined();
    }
  );

  it('never downloads or parses the document on the request path', async () => {
    await start({});

    expect(ctx.fileStorage.download).not.toHaveBeenCalled();
  });

  it('never asks for a URL to the document', async () => {
    await start({});

    expect(ctx.fileStorage.getUrl).not.toHaveBeenCalled();
  });

  it('keeps jobName idempotency: an in-flight job is returned and nothing else happens', async () => {
    const inflight = { ...buildJob(), jobName: 'nightly' };
    ctx.syncJobs.findActiveByJobKey.mockResolvedValue(inflight);

    const result = await start({ id: 'nightly' });

    expect(result).toBe(inflight);
    expect(ctx.syncJobs.findActiveByJobKey).toHaveBeenCalledWith({
      projectId,
      operation: 'import',
      jobName: 'nightly',
      statuses: ['pending', 'running'],
    });
    expect(ctx.fileStorage.getMetadata).not.toHaveBeenCalled();
    expect(ctx.syncJobs.create).not.toHaveBeenCalled();
    expect(ctx.enqueue).not.toHaveBeenCalled();
  });

  it('passes the job name through to the row', async () => {
    await start({ id: 'nightly' });

    expect(ctx.syncJobs.create).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: 'nightly' })
    );
  });

  it('accepts a version of 1 and refuses any other', async () => {
    await expect(start({ version: 1 })).resolves.toBeDefined();
    await expect(start({ version: 2 })).rejects.toThrow(/version/);
  });

  it.each(['roles', 'users', 'resources', 'permissions', 'groups', 'tags'])(
    'refuses `%s` beside a source, even empty, before touching the store',
    async (field) => {
      await expect(start({ [field]: [] })).rejects.toThrow(`${field} must be absent`);

      expect(ctx.fileStorage.getMetadata).not.toHaveBeenCalled();
      expect(ctx.syncJobs.create).not.toHaveBeenCalled();
    }
  );

  it('still refuses replace without confirmation, synchronously, by reference too', async () => {
    await expect(
      start({ mode: { strategy: CdmModeStrategy.Replace, confirmDestructive: false } })
    ).rejects.toThrow(/confirmDestructive/);

    expect(ctx.fileStorage.getMetadata).not.toHaveBeenCalled();
    expect(ctx.syncJobs.create).not.toHaveBeenCalled();
  });

  it('records a confirmed replace as replace', async () => {
    await start({ mode: { strategy: CdmModeStrategy.Replace, confirmDestructive: true } });

    expect(ctx.syncJobs.create).toHaveBeenCalledWith(
      expect.objectContaining({ modeStrategy: 'replace' })
    );
  });

  it.each([-1, 1.5, 2_147_483_648])(
    'refuses an entity count hint of %s (GraphQL cannot bound it for us)',
    async (entityCount) => {
      await expect(start({ source: { uploadId, entityCount } })).rejects.toThrow(/entityCount/);
      expect(ctx.syncJobs.create).not.toHaveBeenCalled();
    }
  );

  it('stores no hint when none was sent', async () => {
    await start({ source: { uploadId } });

    expect(ctx.syncJobs.create).toHaveBeenCalledWith(
      expect.objectContaining({ payloadRef: expect.objectContaining({ entityCountHint: null }) })
    );
  });
});

describe('ProjectHandler.startProjectSync inline, with the GraphQL shape relaxed for `source`', () => {
  it.each(['version', 'roles', 'users'])(
    'still requires `%s` when there is no source',
    async (field) => {
      const ctx = build();
      const input = { version: 1, mode: merge, roles: [], users: [], [field]: null };

      await expect(
        ctx.handler.startProjectSync({
          id: projectId,
          scope,
          input: input as never,
          enqueuedById: userId,
        })
      ).rejects.toThrow(`${field} is required when source is absent`);

      expect(ctx.syncJobs.create).not.toHaveBeenCalled();
    }
  );

  it('stores the inline document without the `source` key', async () => {
    const ctx = build();
    const input = { version: 1, mode: merge, roles: [], users: [], source: null };

    await ctx.handler.startProjectSync({
      id: projectId,
      scope,
      input: input as never,
      enqueuedById: userId,
    });

    const [params] = ctx.syncJobs.create.mock.calls[0] as [
      { payload: Record<string, unknown>; payloadRef?: unknown },
    ];
    expect(params.payload).not.toHaveProperty('source');
    expect(params.payloadRef).toBeUndefined();
    expect(ctx.fileStorage.getMetadata).not.toHaveBeenCalled();
  });
});

describe('ProjectHandler.getProjectSyncJobPayload', () => {
  const params = { id: projectId, jobId: buildJob().id, scope };

  it('answers a by-reference job with its size and nothing of the document', async () => {
    const ctx = build();
    ctx.syncJobs.getPayload.mockResolvedValue({
      payload: null,
      payloadRef: { path: expectedKey, sizeBytes: 123456, entityCountHint: 9 },
      jobName: 'nightly',
      cdmVersion: 1,
    });

    const result = await ctx.handler.getProjectSyncJobPayload(params);

    expect(result).toEqual({
      byReference: true,
      sizeBytes: 123456,
      jobName: 'nightly',
      cdmVersion: 1,
    });
    // Neither the key nor a URL to the document leaves the handler, and the store is not read.
    expect(JSON.stringify(result)).not.toContain('imports/');
    expect(ctx.fileStorage.download).not.toHaveBeenCalled();
    expect(ctx.fileStorage.getUrl).not.toHaveBeenCalled();
  });

  it('leaves an inline job exactly as it was', async () => {
    const ctx = build();
    const document = { version: 1, mode: merge, roles: [], users: [] };
    ctx.syncJobs.getPayload.mockResolvedValue({
      payload: document,
      payloadRef: null,
      jobName: null,
      cdmVersion: 1,
    });

    await expect(ctx.handler.getProjectSyncJobPayload(params)).resolves.toEqual({
      byReference: false,
      payload: document,
      jobName: null,
      cdmVersion: 1,
    });
  });
});
