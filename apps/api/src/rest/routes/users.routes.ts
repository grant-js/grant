import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { User, UserSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { AuthenticationError } from '@/lib/errors';
import { NotFoundError } from '@/lib/errors';
import { validate } from '@/middleware/validation.middleware';
import { requestContext } from '@/rest/request-context';
import {
  createUserRequestSchema,
  deleteUserQuerySchema,
  exportProjectUserCredentialsRequestSchema,
  getUsersQuerySchema,
  setProjectUserEmailRequestSchema,
  setProjectUserPasswordRequestSchema,
  updateUserRequestSchema,
  userParamsSchema,
} from '@/rest/schemas/users.schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createUserRoutes(fallback?: RequestContext) {
  const router = Router();

  router.get(
    '/',
    validate({ query: getUsersQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.User,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getUsersQuerySchema }>, res: Response) => {
      const {
        page,
        limit,
        search,
        ids,
        relations,
        fields,
        sortField,
        sortOrder,
        tagIds,
        scopeId,
        tenant,
      } = req.query;

      const { requestedFields, sort, scope } = queryListCommons<User, UserSortInput>({
        fields,
        relations,
        sortField,
        sortOrder,
        scopeId,
        tenant,
      });

      const result = await requestContext(req, fallback).handlers.users.getUsers({
        page,
        limit,
        search,
        ids,
        sort,
        tagIds,
        scope: scope!,
        requestedFields,
      });

      sendSuccessResponse(res, {
        items: result.users,
        totalCount: result.totalCount,
        hasNextPage: result.hasNextPage,
      });
    }
  );

  router.get(
    '/:id',
    validate({ params: userParamsSchema, query: getUsersQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.User,
      action: ResourceAction.Read,
    }),
    async (
      req: TypedRequest<{
        params: typeof userParamsSchema;
        query: typeof getUsersQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { fields, relations, scopeId, tenant } = req.query;

      const { requestedFields } = queryListCommons<User, UserSortInput>({
        fields,
        relations,
        scopeId,
        tenant,
      });

      const result = await requestContext(req, fallback).handlers.users.getUsers({
        ids: [id],
        limit: 1,
        scope: { id: scopeId, tenant },
        requestedFields,
      });

      if (result.users.length === 0) {
        throw new NotFoundError('User');
      }

      sendSuccessResponse(res, result.users[0]);
    }
  );

  router.post(
    '/',
    validate({ body: createUserRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.User,
      action: ResourceAction.Create,
    }),
    async (req: TypedRequest<{ body: typeof createUserRequestSchema }>, res: Response) => {
      const { name, scope, roleIds, groupIds, permissionIds, tagIds, primaryTagId, email } =
        req.body;

      const actorUserId = requestContext(req, fallback).user?.userId;
      if (email !== undefined && email !== null && !actorUserId) {
        throw new AuthenticationError('Authentication required');
      }

      const user = await requestContext(req, fallback).handlers.users.createUser({
        input: {
          name,
          scope,
          roleIds,
          groupIds,
          permissionIds,
          tagIds,
          primaryTagId,
          email,
        },
        actorUserId,
      });

      sendSuccessResponse(res, user, 201);
    }
  );

  router.post(
    '/credentials/export',
    validate({ body: exportProjectUserCredentialsRequestSchema }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    authorizeRestRoute({
      resource: ResourceSlug.ProjectUser,
      action: ResourceAction.ExportCredentials,
    }),
    async (
      req: TypedRequest<{ body: typeof exportProjectUserCredentialsRequestSchema }>,
      res: Response
    ) => {
      const { scope, userIds, kinds } = req.body;
      const context = requestContext(req, fallback);

      const result = await context.handlers.users.exportProjectUserCredentials({
        input: { scope, userIds, kinds },
      });

      // The body carries hashes: never cached by an intermediary or the browser.
      res.setHeader('Cache-Control', 'no-store');
      sendSuccessResponse(res, result);
    }
  );

  router.put(
    '/:id/email',
    validate({ params: userParamsSchema, body: setProjectUserEmailRequestSchema }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    authorizeRestRoute({
      resource: ResourceSlug.ProjectUser,
      action: ResourceAction.SetEmail,
    }),
    async (
      req: TypedRequest<{
        params: typeof userParamsSchema;
        body: typeof setProjectUserEmailRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { email, scope } = req.body;

      const user = await requestContext(req, fallback).handlers.users.setProjectUserEmail({
        input: { userId: id, email, scope },
      });

      sendSuccessResponse(res, user);
    }
  );

  router.put(
    '/:id/password',
    validate({ params: userParamsSchema, body: setProjectUserPasswordRequestSchema }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    // codeql[js/missing-rate-limiting]: Global rateLimitMiddleware in create-app covers REST; CodeQL cannot see app-level middleware from this route factory.
    authorizeRestRoute({
      resource: ResourceSlug.ProjectUser,
      action: ResourceAction.SetPassword,
    }),
    async (
      req: TypedRequest<{
        params: typeof userParamsSchema;
        body: typeof setProjectUserPasswordRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { password, scope } = req.body;

      const context = requestContext(req, fallback);

      const user = await context.handlers.users.setProjectUserPassword({
        input: { userId: id, password, scope },
      });

      sendSuccessResponse(res, user);
    }
  );

  router.patch(
    '/:id',
    validate({ params: userParamsSchema, body: updateUserRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.User,
      action: ResourceAction.Update,
    }),
    async (
      req: TypedRequest<{
        params: typeof userParamsSchema;
        body: typeof updateUserRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { name, roleIds, groupIds, tagIds, primaryTagId, scope, pictureUrl, metadata } =
        req.body;

      const actorUserId = requestContext(req, fallback).user?.userId;
      if (!actorUserId) {
        throw new AuthenticationError('Authentication required');
      }

      const user = await requestContext(req, fallback).handlers.users.updateUser({
        id,
        input: { name, roleIds, groupIds, tagIds, primaryTagId, scope, pictureUrl, metadata },
        actorUserId,
      });

      sendSuccessResponse(res, user);
    }
  );

  router.delete(
    '/:id',
    validate({ params: userParamsSchema, query: deleteUserQuerySchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.User,
      action: ResourceAction.Delete,
    }),
    async (
      req: TypedRequest<{
        params: typeof userParamsSchema;
        query: typeof deleteUserQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scopeId, tenant, hardDelete } = req.query;

      const user = await requestContext(req, fallback).handlers.users.deleteUser({
        id,
        scope: { id: scopeId, tenant },
        hardDelete: hardDelete ?? false,
      });

      sendSuccessResponse(res, user);
    }
  );

  return router;
}
