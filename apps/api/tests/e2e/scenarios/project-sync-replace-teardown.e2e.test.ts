/**
 * E2E: CDM replace-mode pivot teardown and direct user.groups authorization.
 *
 * Guards regressions from stagger soft-delete (deleted_at unique index) and
 * orphan pivots (e.g. project_app_tags on manual apps after CDM tag tombstone).
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true and JOB_PROVIDER=node-cron.
 */
import {
  CreateProjectAppDocument,
  GetProjectAppsDocument,
  ProjectSyncJobStatus,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { cdmDirectGroupAuth, richMergeCdm, richReplaceCdm } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import {
  closeDbHelper,
  countDuplicateDeletedAtValues,
  countOrphanProjectAppTags,
  countOrphanProjectResources,
  getLiveTagIdByName,
} from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { postImport, resolveJob, scopeForAccountProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

interface MeResponseBody {
  data?: {
    accounts?: Array<{ owner?: { id?: string } }>;
  };
}

interface ProjectAppCreateData {
  createProjectApp?: { id: string; clientId: string; name: string };
}

interface ProjectAppPageData {
  projectApps?: {
    projectApps: Array<{
      id: string;
      name?: string;
      tags?: Array<{ id: string; name: string; isPrimary?: boolean }>;
    }>;
    totalCount: number;
  };
}

async function getOwnerUserId(owner: TestUser): Promise<string> {
  const profile = await owner.getProfile();
  expect(profile.status).toBe(200);
  const body = profile.body as MeResponseBody;
  const userId = body.data?.accounts?.[0]?.owner?.id;
  expect(userId).toBeDefined();
  return userId!;
}

afterAll(async () => {
  await closeDbHelper();
});

describe('Project sync – replace teardown pivots and stagger', () => {
  let owner: TestUser;
  let projectId: string;
  let scope: ReturnType<typeof scopeForAccountProject>;
  let prefix: string;
  let tagName: string;
  let projectAppId: string;

  it('Setup: personal account and project', async () => {
    owner = await TestUser.create();
    const projectRes = await apiClient()
      .post('/api/projects')
      .set('Authorization', owner.authHeader)
      .send({
        name: 'E2E Replace Teardown',
        scope: { id: owner.accountId, tenant: 'account' },
      });
    expect(projectRes.status).toBe(201);
    projectId = projectRes.body.data?.id as string;
    scope = scopeForAccountProject(owner.accountId, projectId);
    prefix = `e2e-rich-${Date.now()}`;
    tagName = `${prefix}-tag`;
  });

  it('merge import rich CDM → COMPLETED', async () => {
    const userId = await getOwnerUserId(owner);
    const { status, job } = await postImport(
      owner.authHeader,
      projectId,
      scope,
      richMergeCdm(prefix, userId)
    );
    expect(status).toBe(202);
    const completed = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      job,
      ProjectSyncJobStatus.Completed
    );
    expect(completed.status).toBe(ProjectSyncJobStatus.Completed);
  });

  it('manual project app linked to CDM tag shows tag before replace', async () => {
    const tagId = await getLiveTagIdByName(projectId, tagName);
    expect(tagId).toBeTruthy();

    const createRes = await graphqlRequest<ProjectAppCreateData>({
      query: print(CreateProjectAppDocument),
      variables: {
        input: {
          scope: { tenant: 'accountProject', id: scope.id },
          name: 'E2E Replace Teardown App',
          redirectUris: ['https://example.com/callback'],
          scopes: [],
          allowSignUp: false,
          tagIds: [tagId],
          primaryTagId: tagId,
        },
      },
      accessToken: owner.accessToken,
    });
    expect(createRes.status).toBe(200);
    expect(createRes.body.errors).toBeUndefined();
    projectAppId = createRes.body.data!.createProjectApp!.id;

    const listRes = await graphqlRequest<ProjectAppPageData>({
      query: print(GetProjectAppsDocument),
      variables: { scope: { tenant: 'accountProject', id: scope.id }, page: 1, limit: 20 },
      accessToken: owner.accessToken,
    });
    expect(listRes.body.errors).toBeUndefined();
    const app = listRes.body.data?.projectApps?.projectApps.find((a) => a.id === projectAppId);
    expect(app?.tags?.some((t) => t.name === tagName)).toBe(true);
  });

  it('replace import rich CDM → COMPLETED with clean pivot teardown', async () => {
    const userId = await getOwnerUserId(owner);
    const { status, job } = await postImport(
      owner.authHeader,
      projectId,
      scope,
      richReplaceCdm(prefix, userId)
    );
    expect(status).toBe(202);
    const completed = await resolveJob(
      owner.authHeader,
      projectId,
      scope,
      job,
      ProjectSyncJobStatus.Completed
    );
    expect(completed.status).toBe(ProjectSyncJobStatus.Completed);

    expect(await countOrphanProjectAppTags(projectId)).toBe(0);
    expect(await countOrphanProjectResources(projectId)).toBe(0);
    expect(await countDuplicateDeletedAtValues('project_resources', projectId)).toBe(0);
    expect(await countDuplicateDeletedAtValues('project_user_groups', projectId)).toBe(0);

    const listRes = await graphqlRequest<ProjectAppPageData>({
      query: print(GetProjectAppsDocument),
      variables: { scope: { tenant: 'accountProject', id: scope.id }, page: 1, limit: 20 },
      accessToken: owner.accessToken,
    });
    expect(listRes.body.errors).toBeUndefined();
    const app = listRes.body.data?.projectApps?.projectApps.find((a) => a.id === projectAppId);
    expect(app?.tags ?? []).toHaveLength(0);
  });
});

describe('Project sync – direct user.groups permission evaluation', () => {
  let owner: TestUser;
  let projectId: string;
  let scope: ReturnType<typeof scopeForAccountProject>;

  it('Setup: personal account and project', async () => {
    owner = await TestUser.create();
    const projectRes = await apiClient()
      .post('/api/projects')
      .set('Authorization', owner.authHeader)
      .send({
        name: 'E2E Direct Group Auth',
        scope: { id: owner.accountId, tenant: 'account' },
      });
    expect(projectRes.status).toBe(201);
    projectId = projectRes.body.data?.id as string;
    scope = scopeForAccountProject(owner.accountId, projectId);
  });

  it('merge import with users[].groups grants permission via is-authorized', async () => {
    const userId = await getOwnerUserId(owner);
    const { status, job } = await postImport(
      owner.authHeader,
      projectId,
      scope,
      cdmDirectGroupAuth(userId)
    );
    expect(status).toBe(202);
    await resolveJob(owner.authHeader, projectId, scope, job, ProjectSyncJobStatus.Completed);

    const authRes = await apiClient()
      .post('/api/auth/is-authorized')
      .set('Authorization', owner.authHeader)
      .send({
        permission: {
          resource: 'docs',
          action: 'read',
        },
        context: {
          resource: null,
        },
        scope: {
          id: scope.id,
          tenant: 'accountProject',
        },
      });

    expect(authRes.status).toBe(200);
    expect(authRes.body.success).toBe(true);
    expect(authRes.body.data.authorized).toBe(true);
  });
});
