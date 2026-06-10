/**
 * Integration: GraphQL resolvers for project sync jobs call handlers with expected args.
 * Auth guards are bypassed; handler layer is mocked (same pattern as REST integration).
 */
import {
  CdmModeStrategy,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  Tenant,
  TokenType,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { cancelProjectSyncResolver } from '@/graphql/resolvers/projects/mutations/cancel-project-sync.resolver';
import { startProjectExportResolver } from '@/graphql/resolvers/projects/mutations/start-project-export.resolver';
import { startProjectSyncResolver } from '@/graphql/resolvers/projects/mutations/start-project-sync.resolver';
import { projectSyncJobResolver } from '@/graphql/resolvers/projects/queries/project-sync-job.resolver';
import { projectSyncJobsResolver } from '@/graphql/resolvers/projects/queries/project-sync-jobs.resolver';
import type { GraphqlContext } from '@/graphql/types';

import { invokeRootResolver } from '../graphql-field-resolver-invoke';

vi.mock('@/lib/authorization', () => ({
  authorizeGraphQLResolver: (_opts: unknown, resolver: unknown) => resolver,
  requireEmailThenMfaGraphQL: (_a: unknown, _b: unknown, resolver: unknown) => resolver,
}));

const projectId = '00000000-0000-4000-8000-000000000011';
const accountId = '00000000-0000-4000-8000-000000000020';
const userId = '30000000-0000-4000-8000-000000000099';
const jobId = '40000000-0000-4000-8000-000000000077';
const scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

function buildJob() {
  return {
    id: jobId,
    projectId,
    status: ProjectSyncJobStatus.Pending,
    cdmVersion: 1,
    jobName: null,
    operation: ProjectSyncJobOperation.Import,
    modeStrategy: CdmModeStrategy.Merge,
    result: null,
    warnings: [],
    errorMessage: null,
    enqueuedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hasSnapshot: false,
    snapshotTakenAt: null,
    snapshotSizeBytes: null,
  };
}

function buildContext(handlers: GraphqlContext['handlers']['projects']) {
  return {
    user: { userId },
    handlers: { projects: handlers },
  } as unknown as GraphqlContext;
}

describe('project sync GraphQL resolvers', () => {
  let startProjectSync: ReturnType<typeof vi.fn>;
  let startProjectExport: ReturnType<typeof vi.fn>;
  let cancelProjectSync: ReturnType<typeof vi.fn>;
  let getProjectSyncJob: ReturnType<typeof vi.fn>;
  let listProjectSyncJobs: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const job = buildJob();
    startProjectSync = vi.fn().mockResolvedValue(job);
    startProjectExport = vi.fn().mockResolvedValue({
      ...job,
      operation: ProjectSyncJobOperation.Export,
    });
    cancelProjectSync = vi.fn().mockResolvedValue({
      ...job,
      status: ProjectSyncJobStatus.Cancelled,
    });
    getProjectSyncJob = vi.fn().mockResolvedValue(job);
    listProjectSyncJobs = vi.fn().mockResolvedValue({
      jobs: [job],
      totalCount: 1,
      hasNextPage: false,
    });
  });

  it('startProjectSync forwards enqueuedById from context user', async () => {
    const ctx = buildContext({
      startProjectSync,
    } as never);

    const result = await invokeRootResolver<{ id: string }>(
      startProjectSyncResolver,
      {
        id: projectId,
        scope,
        input: {
          version: 1,
          id: null,
          mode: {
            strategy: CdmModeStrategy.Merge,
            onConflict: null,
            confirmDestructive: false,
          },
          roles: [],
          users: [],
          resources: [],
          permissions: [],
          groups: [],
          tags: [],
        },
      },
      ctx
    );

    expect(result.id).toBe(jobId);
    expect(startProjectSync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: projectId,
        scope,
        enqueuedById: userId,
      })
    );
  });

  it('startProjectSync maps project-level API key auth to system user for enqueuedById', async () => {
    const apiKeyId = 'd1bfe5e5-a05d-4e74-8e5e-5c1a64de802b';
    const ctx = {
      user: {
        userId: apiKeyId,
        tokenId: apiKeyId,
        type: TokenType.ApiKey,
        expiresAt: Date.now() + 60_000,
        scope,
      },
      handlers: { projects: { startProjectSync } },
    } as unknown as GraphqlContext;

    await invokeRootResolver(
      startProjectSyncResolver,
      {
        id: projectId,
        scope,
        input: {
          version: 1,
          id: null,
          mode: {
            strategy: CdmModeStrategy.Merge,
            onConflict: null,
            confirmDestructive: false,
          },
          roles: [],
          users: [],
          resources: [],
          permissions: [],
          groups: [],
          tags: [],
        },
      },
      ctx
    );

    expect(startProjectSync).toHaveBeenCalledWith(
      expect.objectContaining({
        enqueuedById: config.system.systemUserId,
      })
    );
  });

  it('startProjectExport forwards input to handler', async () => {
    const ctx = buildContext({ startProjectExport } as never);

    await invokeRootResolver(
      startProjectExportResolver,
      {
        id: projectId,
        scope,
        input: { version: 1, sections: ['roles'] },
      },
      ctx
    );

    expect(startProjectExport).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { version: 1, sections: ['roles'] },
        enqueuedById: userId,
      })
    );
  });

  it('cancelProjectSync forwards jobId and scope', async () => {
    const ctx = buildContext({ cancelProjectSync } as never);

    await invokeRootResolver(cancelProjectSyncResolver, { id: projectId, scope, jobId }, ctx);

    expect(cancelProjectSync).toHaveBeenCalledWith({
      id: projectId,
      scope,
      jobId,
    });
  });

  it('projectSyncJob query delegates to getProjectSyncJob', async () => {
    const ctx = buildContext({ getProjectSyncJob } as never);

    await invokeRootResolver(projectSyncJobResolver, { id: projectId, scope, jobId }, ctx);

    expect(getProjectSyncJob).toHaveBeenCalledWith({ id: projectId, jobId, scope });
  });

  it('projectSyncJobs query delegates list args', async () => {
    const ctx = buildContext({ listProjectSyncJobs } as never);

    await invokeRootResolver(
      projectSyncJobsResolver,
      { id: projectId, scope, page: 1, limit: 10, status: null },
      ctx
    );

    expect(listProjectSyncJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        id: projectId,
        scope,
        page: 1,
        limit: 10,
      })
    );
  });
});
