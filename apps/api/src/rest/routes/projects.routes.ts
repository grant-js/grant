import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  CreateProjectMutationVariables,
  DeleteProjectMutationVariables,
  Project,
  SyncProjectPermissionsResult,
  UpdateProjectMutationVariables,
} from '@grantjs/schema';
import { ProjectSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  createProjectRequestSchema,
  deleteProjectQuerySchema,
  getProjectsQuerySchema,
  projectParamsSchema,
  syncProjectPermissionsRequestSchema,
  updateProjectRequestSchema,
} from '@/rest/schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
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
    '/:id/permissions/sync',
    validate({ params: projectParamsSchema, body: syncProjectPermissionsRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Update,
      resourceResolver: 'project',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectParamsSchema;
        body: typeof syncProjectPermissionsRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scope, cdmVersion, importId, roleTemplates, userAssignments } = req.body;

      const result: SyncProjectPermissionsResult =
        await context.handlers.projects.syncProjectPermissions({
          id,
          scope,
          input: { cdmVersion, importId, roleTemplates, userAssignments },
        });

      sendSuccessResponse(res, result);
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

      const variables: UpdateProjectMutationVariables = {
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

      const variables: DeleteProjectMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const project: Project = await context.handlers.projects.deleteProject(variables);

      sendSuccessResponse(res, project);
    }
  );

  return router;
}
