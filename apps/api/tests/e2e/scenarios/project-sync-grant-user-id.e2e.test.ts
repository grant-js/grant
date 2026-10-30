/**
 * E2E: a keyed CDM user document names the existing Grant user it is (`key.grantUserId`).
 *
 * Import 1 matches the user and marks the membership row; import 2 of the same document
 * without the hint resolves the key through the row-aware lookup to the same user. The
 * global user is never changed and no user row is created. Refusals fail the job with a
 * message that names the position only. Replace mode removes no membership.
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true and JOB_PROVIDER=node-cron.
 */
import { CdmFindBy, ProjectSyncJobStatus } from '@grantjs/schema';
import { afterAll, describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

import { cdmWithRoleTemplate, replaceMode } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import { closeDbHelper, query } from '../helpers/db-tokens';
import { postImport, resolveJob, scopeForAccountProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

interface CreateProjectResponseBody {
  data?: { id: string };
}

interface MemberRow extends Record<string, unknown> {
  marker: { projectId?: string; kind?: string; externalKey?: string } | null;
  live_rows: string;
}

interface UserMetadataRow extends Record<string, unknown> {
  metadata: unknown;
}

interface CountRow extends Record<string, unknown> {
  count: string;
}

async function createAccountProject(owner: TestUser, name: string): Promise<string> {
  const res = await apiClient()
    .post('/api/projects')
    .set('Authorization', owner.authHeader)
    .send({ name, scope: { id: owner.accountId, tenant: 'account' } });
  expect(res.status).toBe(201);
  const projectId = (res.body as CreateProjectResponseBody).data?.id;
  expect(projectId).toBeDefined();
  return projectId!;
}

function cdmWithKeyedUser(
  roleKey: string,
  key: { value: string; grantUserId?: string },
  overrides: Partial<CdmDocumentInput> = {}
): CdmDocumentInput {
  return cdmWithRoleTemplate(roleKey, {
    users: [
      {
        key: { value: key.value, findBy: CdmFindBy.Key, grantUserId: key.grantUserId },
        name: 'Matched Key User',
        roles: [roleKey],
        groups: [],
        permissions: [],
        tags: [],
        primaryTag: null,
        apiKeys: [],
        metadata: null,
      },
    ],
    ...overrides,
  });
}

async function membership(projectId: string, userId: string): Promise<MemberRow[]> {
  return query<MemberRow>`
    SELECT metadata->'cdmImport' AS marker, COUNT(*) OVER ()::text AS live_rows
    FROM project_users
    WHERE project_id = ${projectId}::uuid
      AND user_id = ${userId}::uuid
      AND deleted_at IS NULL
  `;
}

async function userMetadata(userId: string): Promise<unknown> {
  const rows = await query<UserMetadataRow>`
    SELECT metadata FROM users WHERE id = ${userId}::uuid
  `;
  return rows[0]?.metadata;
}

/**
 * Users an import of this project created: they carry the project's marker on the global
 * user. Compared with `->>` (not a jsonb parameter, which this driver would encode twice).
 */
async function usersCreatedByImportsOf(projectId: string): Promise<number> {
  const rows = await query<CountRow>`
    SELECT COUNT(*)::text AS count
    FROM users
    WHERE metadata->'cdmImport'->>'projectId' = ${projectId}
  `;
  return Number(rows[0]?.count ?? '0');
}

async function keyedMembers(projectId: string, key: string): Promise<number> {
  const rows = await query<CountRow>`
    SELECT COUNT(*)::text AS count
    FROM project_users
    WHERE project_id = ${projectId}::uuid
      AND deleted_at IS NULL
      AND metadata->'cdmImport'->>'kind' = 'user'
      AND metadata->'cdmImport'->>'externalKey' = ${key}
  `;
  return Number(rows[0]?.count ?? '0');
}

afterAll(async () => {
  await closeDbHelper();
});

describe('Project sync jobs - CDM key.grantUserId match', () => {
  it('matches the named Grant user, marks the membership row, and lets a later import key it normally', async () => {
    const owner = await TestUser.create();
    const existing = await TestUser.create();
    const grantUserId = existing.userId!;
    const suffix = Date.now();
    const roleKey = `grant-id-role-${suffix}`;
    const key = `legacy-user-${suffix}`;
    const projectId = await createAccountProject(owner, 'E2E CDM grantUserId');
    const scope = scopeForAccountProject(owner.accountId, projectId);
    const globalBefore = await userMetadata(grantUserId);

    // Import 1: the hint names the existing user.
    const first = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithKeyedUser(roleKey, { value: key, grantUserId })
    );
    expect(first.status).toBe(202);
    const firstDone = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      first.job,
      ProjectSyncJobStatus.Completed
    );
    expect(firstDone.result?.usersCreated).toBe(0);

    const rows = await membership(projectId, grantUserId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.marker).toEqual({ projectId, kind: 'user', externalKey: key });
    expect(await userMetadata(grantUserId)).toEqual(globalBefore);
    expect(await usersCreatedByImportsOf(projectId)).toBe(0);

    // Import 2: the same document without the hint keys the same user.
    const second = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithKeyedUser(roleKey, { value: key })
    );
    expect(second.status).toBe(202);
    const secondDone = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      second.job,
      ProjectSyncJobStatus.Completed
    );
    expect(secondDone.result?.usersCreated).toBe(0);
    expect(await usersCreatedByImportsOf(projectId)).toBe(0);
    expect(await keyedMembers(projectId, key)).toBe(1);
    const afterSecond = await membership(projectId, grantUserId);
    expect(afterSecond).toHaveLength(1);
    expect(afterSecond[0]!.marker).toEqual({ projectId, kind: 'user', externalKey: key });
    expect(await userMetadata(grantUserId)).toEqual(globalBefore);

    // Control for the counts above: a key with no hint still creates a user, and the helper sees it.
    const third = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithKeyedUser(roleKey, { value: `${key}-unhinted` })
    );
    expect(third.status).toBe(202);
    const thirdDone = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      third.job,
      ProjectSyncJobStatus.Completed
    );
    expect(thirdDone.result?.usersCreated).toBe(1);
    expect(await usersCreatedByImportsOf(projectId)).toBe(1);
  });

  it('refuses a hint that names no user, naming the position and neither the key nor the id', async () => {
    const owner = await TestUser.create();
    const suffix = Date.now();
    const key = `legacy-missing-${suffix}`;
    const missingId = '00000000-0000-4000-8000-00000000dead';
    const projectId = await createAccountProject(owner, 'E2E CDM grantUserId refusal');
    const scope = scopeForAccountProject(owner.accountId, projectId);

    const res = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithKeyedUser(`grant-id-missing-${suffix}`, { value: key, grantUserId: missingId })
    );
    expect(res.status).toBe(202);
    const failed = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      res.job,
      ProjectSyncJobStatus.Failed
    );

    expect(failed.errorMessage).toContain('users[0]: grantUserId does not name an existing user');
    expect(failed.errorMessage).not.toContain(key);
    expect(failed.errorMessage).not.toContain(missingId);
    // The import rolled back: no user was created as a fallback.
    expect(await usersCreatedByImportsOf(projectId)).toBe(0);
    expect(await keyedMembers(projectId, key)).toBe(0);
  });

  it('removes no membership and keeps the marker when a replace import follows', async () => {
    const owner = await TestUser.create();
    const existing = await TestUser.create();
    const grantUserId = existing.userId!;
    const suffix = Date.now();
    const roleKey = `grant-id-replace-${suffix}`;
    const key = `legacy-replace-${suffix}`;
    const projectId = await createAccountProject(owner, 'E2E CDM grantUserId replace');
    const scope = scopeForAccountProject(owner.accountId, projectId);

    const first = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithKeyedUser(roleKey, { value: key, grantUserId })
    );
    expect(first.status).toBe(202);
    await resolveJob(owner.authHeader, projectId, scope, first.job, ProjectSyncJobStatus.Completed);
    const before = await membership(projectId, grantUserId);
    expect(before).toHaveLength(1);

    const replace = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmWithKeyedUser(roleKey, { value: key }, { mode: replaceMode(true) })
    );
    expect(replace.status).toBe(202);
    const done = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      replace.job,
      ProjectSyncJobStatus.Completed
    );
    expect(done.result?.usersCreated).toBe(0);

    const after = await membership(projectId, grantUserId);
    expect(after).toHaveLength(1);
    expect(after[0]!.marker).toEqual({ projectId, kind: 'user', externalKey: key });
    expect(await usersCreatedByImportsOf(projectId)).toBe(0);
  });
});
