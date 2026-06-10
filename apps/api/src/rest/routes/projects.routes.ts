import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  CreateProjectMutationVariables,
  MutationDeleteProjectArgs,
  MutationUpdateProjectArgs,
  Project,
  ProjectSyncJob,
  ProjectSyncJobSortableField,
  ProjectSyncJobStatus,
  SyncProjectInput,
} from '@grantjs/schema';
import { ProjectSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { AuthenticationError } from '@/lib/errors';
import { resolveSyncJobEnqueuedById } from '@/lib/resolve-sync-job-enqueued-by.lib';
import { validate } from '@/middleware/validation.middleware';
import {
  createProjectRequestSchema,
  deleteProjectQuerySchema,
  getProjectsQuerySchema,
  listProjectSyncJobsQuerySchema,
  projectParamsSchema,
  projectSyncJobParamsSchema,
  projectSyncJobScopeQuerySchema,
  startProjectExportJobRequestSchema,
  startProjectSyncRequestSchema,
  updateProjectRequestSchema,
} from '@/rest/schemas';
import { TypedRequest } from '@/rest/types';
import { buildSortInput, queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createProjectsRouter(context: RequestContext): Router {
  const router = Router();

  router.get(
    '/',
    validate({ query: getProjectsQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getProjectsQuerySchema }>, res: Response) => {
      const { page, limit, search, sortField, sortOrder, tagIds, scopeId, tenant, relations } =
        req.query;

      const { requestedFields, sort, scope } = queryListCommons<Project, ProjectSortInput>({
        relations,
        sortField,
        sortOrder,
        scopeId,
        tenant,
      });

      const result = await context.handlers.projects.getProjects({
        page,
        limit,
        search,
        sort,
        tagIds,
        scope: scope!,
        requestedFields,
      });

      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/',
    validate({ body: createProjectRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Create,
    }),
    async (req, res) => {
      const variables: CreateProjectMutationVariables = {
        input: req.body,
      };

      const project: Project = await context.handlers.projects.createProject(variables);

      sendSuccessResponse(res, project, 201);
    }
  );

  router.post(
    '/:id/sync/jobs',
    validate({ params: projectParamsSchema, body: startProjectSyncRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectSyncJob,
      action: ResourceAction.Update,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectParamsSchema;
        body: typeof startProjectSyncRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scope, ...input } = req.body;

      const enqueuedById = resolveSyncJobEnqueuedById(context.user);
      if (!enqueuedById) {
        throw new AuthenticationError('Authenticated user required to start a sync job');
      }

      /**
       * `input` is the Zod-validated CDM body minus `scope`. We forward every
       * remaining field (incl. `tags`, `projectUserApiKeys`) to the handler.
       * Zod parses `Date` fields (e.g. `projectUserApiKeys[].expiresAt`) as
       * strings; the handler/service layer normalises them to `Date` again,
       * so the cast through `unknown` is a contract gap, not a runtime bug.
       */
      const job: ProjectSyncJob = await context.handlers.projects.startProjectSync({
        id,
        scope,
        input: input as unknown as SyncProjectInput,
        enqueuedById,
      });

      sendSuccessResponse(res, job, 202);
    }
  );

  router.post(
    '/:id/sync/jobs/export',
    validate({ params: projectParamsSchema, body: startProjectExportJobRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectSyncJob,
      action: ResourceAction.Update,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectParamsSchema;
        body: typeof startProjectExportJobRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scope, version, jobName, sections, includeUserApiKeys, mode } = req.body;

      const enqueuedById = resolveSyncJobEnqueuedById(context.user);
      if (!enqueuedById) {
        throw new AuthenticationError('Authenticated user required to start an export job');
      }

      const job: ProjectSyncJob = await context.handlers.projects.startProjectExport({
        id,
        scope,
        input: {
          version,
          jobName: jobName ?? undefined,
          sections: sections ?? undefined,
          includeUserApiKeys: includeUserApiKeys ?? undefined,
          mode: mode ?? undefined,
        },
        enqueuedById,
      });

      sendSuccessResponse(res, job, 202);
    }
  );

  router.get(
    '/:id/sync/jobs',
    validate({
      params: projectParamsSchema,
      query: listProjectSyncJobsQuerySchema,
    }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectSyncJob,
      action: ResourceAction.Query,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectParamsSchema;
        query: typeof listProjectSyncJobsQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scopeId, tenant, page, limit, search, sortField, sortOrder, status } = req.query;

      const sort = buildSortInput<ProjectSyncJobSortableField>(sortField, sortOrder);

      const result = await context.handlers.projects.listProjectSyncJobs({
        id,
        scope: { id: scopeId, tenant },
        page,
        limit,
        search,
        sort,
        status: (status ?? null) as ProjectSyncJobStatus | null,
      });

      sendSuccessResponse(res, result);
    }
  );

  router.get(
    '/:id/sync/jobs/:jobId/payload',
    validate({
      params: projectSyncJobParamsSchema,
      query: projectSyncJobScopeQuerySchema,
    }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectSyncJob,
      action: ResourceAction.Query,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectSyncJobParamsSchema;
        query: typeof projectSyncJobScopeQuerySchema;
      }>,
      res: Response
    ) => {
      const { id, jobId } = req.params;
      const { scopeId, tenant } = req.query;

      const { payload, jobName } = await context.handlers.projects.getProjectSyncJobPayload({
        id,
        jobId,
        scope: { id: scopeId, tenant },
      });

      const filename = `cdm-${jobName ?? jobId}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(JSON.stringify(payload));
    }
  );

  router.get(
    '/:id/sync/jobs/:jobId/snapshot',
    validate({
      params: projectSyncJobParamsSchema,
      query: projectSyncJobScopeQuerySchema,
    }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectSyncJob,
      action: ResourceAction.Query,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectSyncJobParamsSchema;
        query: typeof projectSyncJobScopeQuerySchema;
      }>,
      res: Response
    ) => {
      const { id, jobId } = req.params;
      const { scopeId, tenant } = req.query;

      const { snapshot } = await context.handlers.projects.getProjectSyncJobSnapshot({
        id,
        jobId,
        scope: { id: scopeId, tenant },
      });

      const filename = `cdm-snapshot-${jobId}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(JSON.stringify(snapshot));
    }
  );

  router.get(
    '/:id/sync/jobs/:jobId',
    validate({
      params: projectSyncJobParamsSchema,
      query: projectSyncJobScopeQuerySchema,
    }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectSyncJob,
      action: ResourceAction.Query,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectSyncJobParamsSchema;
        query: typeof projectSyncJobScopeQuerySchema;
      }>,
      res: Response
    ) => {
      const { id, jobId } = req.params;
      const { scopeId, tenant } = req.query;

      const job = await context.handlers.projects.getProjectSyncJob({
        id,
        jobId,
        scope: { id: scopeId, tenant },
      });

      sendSuccessResponse(res, job);
    }
  );

  router.delete(
    '/:id/sync/jobs/:jobId',
    validate({
      params: projectSyncJobParamsSchema,
      query: projectSyncJobScopeQuerySchema,
    }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectSyncJob,
      action: ResourceAction.Update,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectSyncJobParamsSchema;
        query: typeof projectSyncJobScopeQuerySchema;
      }>,
      res: Response
    ) => {
      const { id, jobId } = req.params;
      const { scopeId, tenant } = req.query;

      const job = await context.handlers.projects.cancelProjectSync({
        id,
        jobId,
        scope: { id: scopeId, tenant },
      });

      sendSuccessResponse(res, job);
    }
  );

  router.patch(
    '/:id',
    validate({ params: projectParamsSchema, body: updateProjectRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Update,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectParamsSchema;
        body: typeof updateProjectRequestSchema;
      }>,
      res
    ) => {
      const { id } = req.params;

      const variables: MutationUpdateProjectArgs = {
        id,
        input: req.body,
      };

      const project: Project = await context.handlers.projects.updateProject(variables);

      sendSuccessResponse(res, project);
    }
  );

  router.delete(
    '/:id',
    validate({ params: projectParamsSchema, query: deleteProjectQuerySchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Delete,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectParamsSchema;
        query: typeof deleteProjectQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: MutationDeleteProjectArgs = {
        id,
        scope: { id: scopeId, tenant },
      };

      const project: Project = await context.handlers.projects.deleteProject(variables);

      sendSuccessResponse(res, project);
    }
  );

  return router;
}
