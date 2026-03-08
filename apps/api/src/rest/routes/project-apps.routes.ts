import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailVerificationRest } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  createProjectAppRequestSchema,
  deleteProjectAppQuerySchema,
  getProjectAppsQuerySchema,
  projectAppIdParamsSchema,
  updateProjectAppRequestSchema,
} from '@/rest/schemas/project-apps.schemas';
import { TypedRequest } from '@/rest/types';
import { buildScope } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createProjectAppsRouter(context: RequestContext): Router {
  const router = Router();

  router.get(
    '/',
    validate({ query: getProjectAppsQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectApp,
      action: ResourceAction.Query,
      resourceResolver: 'projectApp',
    }),
    async (req: TypedRequest<{ query: typeof getProjectAppsQuerySchema }>, res: Response) => {
      const { scopeId, tenant, page, limit, ids } = req.query;
      const scope = buildScope(scopeId, tenant)!;

      const result = await context.handlers.projectApps.getProjectApps({
        scope,
        page,
        limit,
        ...(ids?.length ? { ids } : {}),
      });

      sendSuccessResponse(res, {
        projectApps: result.projectApps,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    }
  );

  router.post(
    '/',
    validate({ body: createProjectAppRequestSchema }),
    requireEmailVerificationRest({ allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectApp,
      action: ResourceAction.Create,
      resourceResolver: 'projectApp',
    }),
    async (req: TypedRequest<{ body: typeof createProjectAppRequestSchema }>, res: Response) => {
      const {
        scope,
        name,
        redirectUris,
        scopes,
        enabledProviders,
        allowSignUp,
        signUpRoleId,
        tagIds,
        primaryTagId,
      } = req.body;

      const result = await context.handlers.projectApps.createProjectApp({
        input: {
          scope,
          name,
          redirectUris,
          scopes,
          enabledProviders,
          allowSignUp,
          signUpRoleId,
          tagIds,
          primaryTagId,
        },
      });

      sendSuccessResponse(
        res,
        {
          id: result.id,
          clientId: result.clientId,
          clientSecret: result.clientSecret ?? undefined,
          name: result.name ?? null,
          redirectUris: result.redirectUris,
          allowSignUp: result.allowSignUp,
          signUpRoleId: result.signUpRoleId ?? undefined,
          createdAt: result.createdAt,
        },
        201
      );
    }
  );

  router.patch(
    '/:id',
    validate({ params: projectAppIdParamsSchema, body: updateProjectAppRequestSchema }),
    requireEmailVerificationRest({ allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectApp,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectAppIdParamsSchema;
        body: typeof updateProjectAppRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const {
        scope,
        name,
        redirectUris,
        scopes,
        enabledProviders,
        allowSignUp,
        signUpRoleId,
        tagIds,
        primaryTagId,
      } = req.body;

      const updated = await context.handlers.projectApps.updateProjectApp({
        id,
        input: {
          scope,
          name,
          redirectUris,
          scopes,
          enabledProviders,
          allowSignUp,
          signUpRoleId,
          tagIds,
          primaryTagId,
        },
      });

      sendSuccessResponse(res, updated);
    }
  );

  router.delete(
    '/:id',
    validate({ params: projectAppIdParamsSchema, query: deleteProjectAppQuerySchema }),
    requireEmailVerificationRest({ allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectApp,
      action: ResourceAction.Delete,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectAppIdParamsSchema;
        query: typeof deleteProjectAppQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;
      const scope = buildScope(scopeId, tenant)!;

      const projectApp = await context.handlers.projectApps.deleteProjectApp({ id, scope });

      sendSuccessResponse(res, projectApp);
    }
  );

  return router;
}
