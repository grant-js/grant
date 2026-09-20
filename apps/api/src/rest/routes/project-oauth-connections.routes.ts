import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  clearProjectOAuthConnectionRequestSchema,
  listProjectOAuthConnectionsQuerySchema,
  upsertProjectOAuthConnectionRequestSchema,
} from '@/rest/schemas/project-oauth-connections.schemas';
import { TypedRequest } from '@/rest/types';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createProjectOAuthConnectionsRoutes(context: RequestContext): Router {
  const router = Router();

  const mfa = () =>
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true });

  router.get(
    '/',
    validate({ query: listProjectOAuthConnectionsQuerySchema }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    mfa(),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Query,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{ query: typeof listProjectOAuthConnectionsQuerySchema }>,
      res: Response
    ) => {
      const { scopeId, tenant } = req.query;
      const result = await context.handlers.projectOAuthConnections.getProjectOAuthConnections({
        id: scopeId!,
        tenant: tenant!,
      });
      sendSuccessResponse(res, result);
    }
  );

  router.put(
    '/',
    validate({ body: upsertProjectOAuthConnectionRequestSchema }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    mfa(),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    async (
      req: TypedRequest<{ body: typeof upsertProjectOAuthConnectionRequestSchema }>,
      res: Response
    ) => {
      const result = await context.handlers.projectOAuthConnections.upsertProjectOAuthConnection(
        req.body
      );
      sendSuccessResponse(res, result);
    }
  );

  router.delete(
    '/',
    validate({ body: clearProjectOAuthConnectionRequestSchema }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    mfa(),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    async (
      req: TypedRequest<{ body: typeof clearProjectOAuthConnectionRequestSchema }>,
      res: Response
    ) => {
      const cleared = await context.handlers.projectOAuthConnections.clearProjectOAuthConnection(
        req.body
      );
      sendSuccessResponse(res, { cleared });
    }
  );

  return router;
}
