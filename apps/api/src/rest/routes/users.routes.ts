import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { User, UserSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { AuthenticationError } from '@/lib/errors';
import { NotFoundError } from '@/lib/errors';
import { validate } from '@/middleware/validation.middleware';
import {
  createUserRequestSchema,
  deleteUserQuerySchema,
  getUsersQuerySchema,
  updateUserRequestSchema,
  userParamsSchema,
} from '@/rest/schemas/users.schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createUserRoutes(context: RequestContext) {
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

      const result = await context.handlers.users.getUsers({
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

      const result = await context.handlers.users.getUsers({
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
      const { name, scope, roleIds, groupIds, permissionIds, tagIds, primaryTagId } = req.body;

      const user = await context.handlers.users.createUser({
        input: {
          name,
          scope,
          roleIds,
          groupIds,
          permissionIds,
          tagIds,
          primaryTagId,
        },
      });

      sendSuccessResponse(res, user, 201);
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

      const actorUserId = context.user?.userId;
      if (!actorUserId) {
        throw new AuthenticationError('Authentication required');
      }

      const user = await context.handlers.users.updateUser({
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

      const user = await context.handlers.users.deleteUser({
        id,
        scope: { id: scopeId, tenant },
        hardDelete: hardDelete ?? false,
      });

      sendSuccessResponse(res, user);
    }
  );

  return router;
}
