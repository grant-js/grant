/**
 * E2E: CDM email identity import across projects.
 *
 * Guards the global-user behavior for `users[].key.findBy=email`: importing the
 * same email into multiple projects must reuse one global user/auth method while
 * creating project membership in each project.
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true and JOB_PROVIDER=node-cron.
 */
import { CdmFindBy, ProjectSyncJobStatus, type SyncProjectInput } from '@grantjs/schema';
import { afterAll, describe, expect, it } from 'vitest';

import { cdmWithRoleTemplate } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import { closeDbHelper, query } from '../helpers/db-tokens';
import { postImport, resolveJob, scopeForAccountProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

interface CreateProjectResponseBody {
  data?: { id: string };
}

type ImportedEmailIdentityRow = Record<string, unknown> & {
  user_id: string;
  is_verified: boolean;
  auth_method_count: string;
  account_count: string;
  project_count: string;
  project_ids: string[];
};

function cdmWithEmailUser(roleKey: string, email: string): SyncProjectInput {
  return cdmWithRoleTemplate(roleKey, {
    users: [
      {
        key: { value: email, findBy: CdmFindBy.Email },
        name: 'Shared Email User',
        roles: [roleKey],
        groups: [],
        permissions: [],
        tags: [],
        primaryTag: null,
        apiKeys: [],
        metadata: null,
      },
    ],
  });
}

async function createAccountProject(owner: TestUser, name: string): Promise<string> {
  const projectRes = await apiClient()
    .post('/api/projects')
    .set('Authorization', owner.authHeader)
    .send({
      name,
      scope: { id: owner.accountId, tenant: 'account' },
    });

  expect(projectRes.status).toBe(201);
  const body = projectRes.body as CreateProjectResponseBody;
  const projectId = body.data?.id;
  expect(projectId).toBeDefined();
  return projectId!;
}

async function getImportedEmailIdentity(
  email: string,
  projectAId: string,
  projectBId: string
): Promise<ImportedEmailIdentityRow[]> {
  return query<ImportedEmailIdentityRow>`
    SELECT
      uam.user_id::text AS user_id,
      bool_or(uam.is_verified)::boolean AS is_verified,
      COUNT(DISTINCT uam.id)::text AS auth_method_count,
      COUNT(DISTINCT a.id)::text AS account_count,
      COUNT(DISTINCT pu.project_id)::text AS project_count,
      ARRAY_AGG(DISTINCT pu.project_id::text) FILTER (WHERE pu.project_id IS NOT NULL) AS project_ids
    FROM user_authentication_methods uam
    LEFT JOIN accounts a
      ON a.owner_id = uam.user_id
     AND a.deleted_at IS NULL
    LEFT JOIN project_users pu
      ON pu.user_id = uam.user_id
     AND pu.deleted_at IS NULL
     AND (
       pu.project_id = ${projectAId}::uuid
       OR pu.project_id = ${projectBId}::uuid
     )
    WHERE uam.provider = 'email'
      AND uam.provider_id = ${email}
      AND uam.deleted_at IS NULL
    GROUP BY uam.user_id
  `;
}

afterAll(async () => {
  await closeDbHelper();
});

describe('Project sync jobs - CDM email identity import', () => {
  it('imports the same email into two projects as one global unverified identity', async () => {
    const owner = await TestUser.create();
    const suffix = Date.now();
    const email = `e2e-cdm-shared-${suffix}@test.grant.dev`;
    const projectAId = await createAccountProject(owner, 'E2E CDM Email A');
    const projectBId = await createAccountProject(owner, 'E2E CDM Email B');
    const scopeA = scopeForAccountProject(owner.accountId, projectAId);
    const scopeB = scopeForAccountProject(owner.accountId, projectBId);

    const importA = await postImport(
      owner.authHeader,
      projectAId,
      scopeA,
      cdmWithEmailUser(`email-a-${suffix}`, email)
    );
    expect(importA.status).toBe(202);
    await resolveJob(owner.authHeader, projectAId, scopeA, importA.job, ProjectSyncJobStatus.Completed);

    const importB = await postImport(
      owner.authHeader,
      projectBId,
      scopeB,
      cdmWithEmailUser(`email-b-${suffix}`, email)
    );
    expect(importB.status).toBe(202);
    await resolveJob(owner.authHeader, projectBId, scopeB, importB.job, ProjectSyncJobStatus.Completed);

    const rows = await getImportedEmailIdentity(email, projectAId, projectBId);

    expect(rows).toHaveLength(1);
    const identity = rows[0]!;
    expect(identity.auth_method_count).toBe('1');
    expect(identity.is_verified).toBe(false);
    expect(identity.account_count).toBe('0');
    expect(identity.project_count).toBe('2');
    expect(identity.project_ids).toEqual(expect.arrayContaining([projectAId, projectBId]));
  });
});
