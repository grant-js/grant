/**
 * E2E: a CDM import by reference through a presigned upload (ADR 0009), over the real stack:
 * the real routes, the local storage adapter's PUT route, the real queue and worker, Postgres.
 *
 *   mint (POST /sync/upload-url) → PUT the file → start (POST /sync/jobs, `source`) → poll → COMPLETED
 *
 * The cases that matter most are the ones inline cannot reach: a document above the old 5 MiB
 * request-body ceiling that now imports, and a document over the entity cap that is refused by
 * the worker as an asynchronous FAILED job rather than a synchronous 4xx.
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true, JOB_PROVIDER=node-cron, STORAGE_PROVIDER=local
 * and the default CDM_IMPORT_MAX_ENTITIES (5,000).
 */
import { CdmModeStrategy, ProjectSyncJobStatus } from '@grantjs/schema';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper } from '../helpers/db-tokens';
import { pollJob, scopeForAccountProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

const MiB = 1024 * 1024;
/**
 * Resource slugs are global, and other scenarios import a resource called `docs`: sharing the slug made
 * the replace-teardown scenario's orphan check see this file's rows. Unique per run, so neither can.
 */
const RUN = Date.now().toString(36);
const RESOURCE = `byref-${RUN}`;
const MERGE = { strategy: CdmModeStrategy.Merge, onConflict: null, confirmDestructive: false };

afterAll(async () => {
  await closeDbHelper();
});

interface Minted {
  uploadId: string;
  url: string;
  headers: { name: string; value: string }[];
}

type Scope = ReturnType<typeof scopeForAccountProject>;

/**
 * A document of `roles` roles, each carrying `padBytes` of metadata. A role needs a permission to
 * be valid, so the document also holds one resource and one permission: it has `roles + 2` entities.
 */
function document(roles: number, padBytes = 0, overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    mode: MERGE,
    resources: [{ key: RESOURCE, slug: RESOURCE, name: 'By-reference docs', actions: ['read'] }],
    permissions: [
      {
        key: `${RESOURCE}-read`,
        resource: RESOURCE,
        action: 'read',
        name: 'By-reference docs: read',
      },
    ],
    roles: Array.from({ length: roles }, (_, i) => ({
      key: `role-${i}`,
      name: `Role ${i}`,
      permissions: [`${RESOURCE}-read`],
      ...(padBytes > 0 ? { metadata: { pad: 'x'.repeat(padBytes) } } : {}),
    })),
    users: [],
    ...overrides,
  };
}

describe('CDM import by reference', () => {
  let owner: TestUser;
  let projectId: string;
  let scope: Scope;

  async function createProject(user: TestUser, name: string) {
    const res = await apiClient()
      .post('/api/projects')
      .set('Authorization', user.authHeader)
      .send({ name, description: name, scope: { id: user.accountId, tenant: 'account' } });
    expect(res.status).toBe(201);
    return res.body.data?.id as string;
  }

  const mint = (
    user: TestUser,
    project: string,
    projectScope: Scope,
    body: Record<string, unknown>
  ) =>
    apiClient()
      .post(`/api/projects/${project}/sync/upload-url`)
      .set('Authorization', user.authHeader)
      .send({ scope: projectScope, ...body });

  /** PUT exactly what the minted URL committed to. The URL is application-relative on this target. */
  const put = (minted: Minted, text: string) => {
    const req = apiClient().put(minted.url);
    for (const { name, value } of minted.headers) req.set(name, value);
    return req.send(text);
  };

  const start = (
    user: TestUser,
    project: string,
    projectScope: Scope,
    body: Record<string, unknown>
  ) =>
    apiClient()
      .post(`/api/projects/${project}/sync/jobs`)
      .set('Authorization', user.authHeader)
      .send({ scope: projectScope, ...body });

  /** The whole flow for one document. Returns the start response and the upload id. */
  async function importByReference(text: string, extra: Record<string, unknown> = {}) {
    const minted = await mint(owner, projectId, scope, { contentLength: Buffer.byteLength(text) });
    expect(minted.status).toBe(200);
    const upload = minted.body.data as Minted;
    const stored = await put(upload, text);
    expect(stored.status).toBe(204);
    const started = await start(owner, projectId, scope, {
      mode: MERGE,
      source: { uploadId: upload.uploadId },
      ...extra,
    });
    return { started, upload };
  }

  beforeAll(async () => {
    owner = await TestUser.create();
    projectId = await createProject(owner, 'CDM by reference');
    scope = scopeForAccountProject(owner.accountId, projectId);
  });

  it('mints, uploads, starts and completes a small document, then deletes the object', async () => {
    const text = JSON.stringify(document(3));

    const { started, upload } = await importByReference(text, { id: 'by-ref-small' });

    expect(started.status).toBe(202);
    const job = started.body.data as { id: string; status: string; cdmVersion: number };
    expect(job.cdmVersion).toBe(1);

    const done = await pollJob(
      owner.authHeader,
      projectId,
      job.id,
      scope,
      ProjectSyncJobStatus.Completed
    );
    expect(done.result?.rolesCreated).toBe(3);

    // The only way to see the delete from outside the container: the upload is gone, so the
    // same upload id can no longer start a job.
    const again = await start(owner, projectId, scope, {
      mode: MERGE,
      source: { uploadId: upload.uploadId },
    });
    expect(again.status).toBe(404);
  }, 120_000);

  it('describes a by-reference job on /payload and never hands back the document', async () => {
    const text = JSON.stringify(document(2));
    const { started } = await importByReference(text);
    const job = started.body.data as { id: string };
    await pollJob(owner.authHeader, projectId, job.id, scope, ProjectSyncJobStatus.Completed);

    const res = await apiClient()
      .get(`/api/projects/${projectId}/sync/jobs/${job.id}/payload`)
      .query({ scopeId: scope.id, tenant: scope.tenant })
      .set('Authorization', owner.authHeader);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toBeUndefined();
    expect(res.body).toEqual({ byReference: true, sizeBytes: Buffer.byteLength(text) });
  }, 120_000);

  it('imports a 6 MiB document, which the 5 MiB request-body limit would have refused', async () => {
    // 160 roles x 40,000 bytes of metadata: past the AWS target's 5 MiB API_JSON_BODY_LIMIT_BYTES
    // and the local default's headroom, well under the entity cap.
    const text = JSON.stringify(document(160, 40_000));
    expect(Buffer.byteLength(text)).toBeGreaterThan(6 * MiB);

    const { started } = await importByReference(text, { id: 'by-ref-6mib' });

    expect(started.status).toBe(202);
    const job = started.body.data as { id: string };
    const done = await pollJob(
      owner.authHeader,
      projectId,
      job.id,
      scope,
      ProjectSyncJobStatus.Completed,
      { timeoutMs: 100_000 }
    );
    expect(done.result?.rolesCreated).toBe(160);
  }, 180_000);

  it('fails a document over the entity cap as an asynchronous job with a specific code', async () => {
    const text = JSON.stringify(document(4999)); // 4,999 roles + 1 resource + 1 permission = 5,001; the default cap is 5,000

    const { started } = await importByReference(text);

    // Accepted: the request path never reads the document, so it cannot know.
    expect(started.status).toBe(202);
    const job = started.body.data as { id: string };

    const failure = await pollJob(
      owner.authHeader,
      projectId,
      job.id,
      scope,
      ProjectSyncJobStatus.Failed
    );
    expect(failure.errorMessage).toMatch(/^CDM_IMPORT_TOO_MANY_ENTITIES: /);
    expect(failure.errorMessage).toContain('5001 entities');
    expect(failure.result).toBeNull();
  }, 120_000);

  it('fails a document that is not a valid CDM document, naming where', async () => {
    const text = JSON.stringify({
      version: 1,
      mode: MERGE,
      roles: [{ name: 'no key' }],
      users: [],
    });

    const { started } = await importByReference(text);

    expect(started.status).toBe(202);
    const failure = await pollJob(
      owner.authHeader,
      projectId,
      (started.body.data as { id: string }).id,
      scope,
      ProjectSyncJobStatus.Failed
    );
    expect(failure.errorMessage).toMatch(/^CDM_IMPORT_DOCUMENT_INVALID: /);
    expect(failure.errorMessage).toContain('roles.0.key');
  }, 120_000);

  it('fails a document that is not JSON', async () => {
    const { started } = await importByReference('{"version": 1,');

    const failure = await pollJob(
      owner.authHeader,
      projectId,
      (started.body.data as { id: string }).id,
      scope,
      ProjectSyncJobStatus.Failed
    );
    expect(failure.errorMessage).toMatch(/^CDM_IMPORT_DOCUMENT_NOT_JSON: /);
  }, 120_000);

  it('fails a document whose mode is not the one requested', async () => {
    const text = JSON.stringify(
      document(1, 0, { mode: { strategy: 'replace', confirmDestructive: true } })
    );

    const { started } = await importByReference(text);

    const failure = await pollJob(
      owner.authHeader,
      projectId,
      (started.body.data as { id: string }).id,
      scope,
      ProjectSyncJobStatus.Failed
    );
    expect(failure.errorMessage).toMatch(/^CDM_IMPORT_REQUEST_MISMATCH: /);
  }, 120_000);

  describe('what the request path still refuses, synchronously', () => {
    it('refuses a mint over CDM_UPLOAD_MAX_BYTES with 413', async () => {
      const res = await mint(owner, projectId, scope, { contentLength: 65 * MiB });

      expect(res.status).toBe(413);
    });

    it('refuses a mint for any type but application/json', async () => {
      const res = await mint(owner, projectId, scope, {
        contentLength: 10,
        contentType: 'image/png',
      });

      expect(res.status).toBe(400);
    });

    it('refuses a start for an upload that never happened with 404', async () => {
      const minted = await mint(owner, projectId, scope, { contentLength: 10 });
      const res = await start(owner, projectId, scope, {
        mode: MERGE,
        source: { uploadId: (minted.body.data as Minted).uploadId },
      });

      expect(res.status).toBe(404);
    });

    it('refuses entity arrays beside a source with 400', async () => {
      const res = await start(owner, projectId, scope, {
        version: 1,
        mode: MERGE,
        roles: [],
        users: [],
        source: { uploadId: '123e4567-e89b-42d3-a456-426614174077' },
      });

      expect(res.status).toBe(400);
    });

    it('refuses replace without confirmation, by reference too', async () => {
      const res = await start(owner, projectId, scope, {
        mode: { strategy: 'replace' },
        source: { uploadId: '123e4567-e89b-42d3-a456-426614174077' },
      });

      expect(res.status).toBe(400);
    });

    it('refuses an upload id that is not a uuid', async () => {
      const res = await start(owner, projectId, scope, {
        mode: MERGE,
        source: { uploadId: '../../users/1/avatar.png' },
      });

      expect(res.status).toBe(400);
    });

    it('refuses an unauthenticated mint', async () => {
      const res = await apiClient()
        .post(`/api/projects/${projectId}/sync/upload-url`)
        .send({ scope, contentLength: 10 });

      expect(res.status).toBe(401);
    });

    it('refuses a PUT that carries more than the URL committed to', async () => {
      const minted = await mint(owner, projectId, scope, { contentLength: 100 });

      const res = await put(minted.body.data as Minted, 'x'.repeat(200));

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('tenancy', () => {
    let intruder: TestUser;
    let intruderProjectId: string;
    let intruderScope: Scope;

    beforeAll(async () => {
      intruder = await TestUser.create();
      intruderProjectId = await createProject(intruder, 'Intruder project');
      intruderScope = scopeForAccountProject(intruder.accountId, intruderProjectId);
    });

    it("refuses to mint for another tenant's project", async () => {
      const res = await mint(intruder, projectId, scope, { contentLength: 10 });

      expect([403, 404]).toContain(res.status);
    });

    it("cannot start a job from another project's upload: the key is derived from your own project", async () => {
      const text = JSON.stringify(document(1));
      const minted = await mint(owner, projectId, scope, {
        contentLength: Buffer.byteLength(text),
      });
      const upload = minted.body.data as Minted;
      await put(upload, text).expect(204);

      const res = await start(intruder, intruderProjectId, intruderScope, {
        mode: MERGE,
        source: { uploadId: upload.uploadId },
      });

      expect(res.status).toBe(404);
    });

    it('never serves an upload over the static mount', async () => {
      const text = JSON.stringify(document(1));
      const minted = await mint(owner, projectId, scope, {
        contentLength: Buffer.byteLength(text),
      });
      const upload = minted.body.data as Minted;
      await put(upload, text).expect(204);

      const path = new URL(upload.url, 'http://placeholder.invalid').pathname;
      const res = await apiClient().get(path);

      expect(res.status).toBe(404);
    });
  });

  it('lets exactly one of two concurrent starts from the same upload through', async () => {
    const text = JSON.stringify(document(2));
    const minted = await mint(owner, projectId, scope, { contentLength: Buffer.byteLength(text) });
    const upload = minted.body.data as Minted;
    await put(upload, text).expect(204);

    const body = { mode: MERGE, source: { uploadId: upload.uploadId } };
    const [a, b] = await Promise.all([
      start(owner, projectId, scope, body),
      start(owner, projectId, scope, body),
    ]);

    const statuses = [a.status, b.status].sort();
    // One 202; the other either lost the unique index (409) or arrived after the first job
    // finished and deleted the object (404). Never two jobs.
    expect(statuses[0]).toBe(202);
    expect([404, 409]).toContain(statuses[1]);
  }, 60_000);
});
