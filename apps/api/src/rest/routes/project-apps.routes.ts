import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  clearProjectAppPictureRequestSchema,
  confirmProjectAppPictureUploadRequestSchema,
  createProjectAppRequestSchema,
  deleteProjectAppQuerySchema,
  getProjectAppsQuerySchema,
  projectAppIdParamsSchema,
  requestProjectAppPictureUploadUrlRequestSchema,
  updateProjectAppRequestSchema,
  uploadProjectAppPictureRequestSchema,
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
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
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
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
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
        primaryColor,
        showHelpPanel,
        themeMode,
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
          primaryColor,
          showHelpPanel,
          themeMode,
          tagIds,
          primaryTagId,
        },
      });

      sendSuccessResponse(res, updated);
    }
  );

  router.post(
    '/:id/picture',
    validate({ params: projectAppIdParamsSchema, body: uploadProjectAppPictureRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectApp,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectAppIdParamsSchema;
        body: typeof uploadProjectAppPictureRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { file, filename, contentType, scope } = req.body;
      const result = await context.handlers.projectApps.uploadProjectAppPicture({
        projectAppId: id,
        file,
        filename,
        contentType,
        scope,
      });
      sendSuccessResponse(res, result, 201);
    }
  );

  router.post(
    '/:id/picture/upload-url',
    validate({
      params: projectAppIdParamsSchema,
      body: requestProjectAppPictureUploadUrlRequestSchema,
    }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectApp,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectAppIdParamsSchema;
        body: typeof requestProjectAppPictureUploadUrlRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { filename, contentType, contentLength, scope } = req.body;
      const result = await context.handlers.projectApps.requestProjectAppPictureUploadUrl({
        projectAppId: id,
        filename,
        contentType,
        contentLength,
        scope,
      });
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/:id/picture/confirm',
    validate({ params: projectAppIdParamsSchema, body: confirmProjectAppPictureUploadRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectApp,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectAppIdParamsSchema;
        body: typeof confirmProjectAppPictureUploadRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { filename, scope } = req.body;
      const result = await context.handlers.projectApps.confirmProjectAppPictureUpload({
        projectAppId: id,
        filename,
        scope,
      });
      sendSuccessResponse(res, result, 201);
    }
  );

  router.delete(
    '/:id/picture',
    validate({ params: projectAppIdParamsSchema, body: clearProjectAppPictureRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ProjectApp,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof projectAppIdParamsSchema;
        body: typeof clearProjectAppPictureRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const projectApp = await context.handlers.projectApps.clearProjectAppPicture({
        projectAppId: id,
        scope: req.body.scope,
      });
      sendSuccessResponse(res, projectApp);
    }
  );

  router.delete(
    '/:id',
    validate({ params: projectAppIdParamsSchema, query: deleteProjectAppQuerySchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
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
