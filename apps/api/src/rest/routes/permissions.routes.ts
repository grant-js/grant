import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  CreatePermissionMutationVariables,
  DeletePermissionMutationVariables,
  Permission,
  UpdatePermissionMutationVariables,
} from '@grantjs/schema';
import { PermissionSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  createPermissionRequestSchema,
  deletePermissionQuerySchema,
  getPermissionsQuerySchema,
  permissionParamsSchema,
  updatePermissionRequestSchema,
} from '@/rest/schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createPermissionsRouter(context: RequestContext): Router {
  const router = Router();

  router.get(
    '/',
    validate({ query: getPermissionsQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Permission,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getPermissionsQuerySchema }>, res: Response) => {
      const { page, limit, search, sortField, sortOrder, tagIds, scopeId, tenant, relations } =
        req.query;

      const { requestedFields, sort, scope } = queryListCommons<Permission, PermissionSortInput>({
        relations,
        sortField,
        sortOrder,
        scopeId,
        tenant,
      });

      const result = await context.handlers.permissions.getPermissions({
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
    validate({ body: createPermissionRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Permission,
      action: ResourceAction.Create,
    }),
    async (req, res) => {
      const variables: CreatePermissionMutationVariables = {
        input: req.body,
      };

      const permission: Permission = await context.handlers.permissions.createPermission(variables);

      sendSuccessResponse(res, permission, 201);
    }
  );

  router.patch(
    '/:id',
    validate({ params: permissionParamsSchema, body: updatePermissionRequestSchema, query: deletePermissionQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Permission,
      action: ResourceAction.Update,
    }),
    async (
      req: TypedRequest<{
        params: typeof permissionParamsSchema;
        body: typeof updatePermissionRequestSchema;
        query: typeof deletePermissionQuerySchema;
      }>,
      res
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: UpdatePermissionMutationVariables = {
        id,
        input: {
          ...req.body,
          scope: { id: scopeId, tenant },
        },
      };

      const permission: Permission = await context.handlers.permissions.updatePermission(variables);

      sendSuccessResponse(res, permission);
    }
  );

  router.delete(
    '/:id',
    validate({ params: permissionParamsSchema, query: deletePermissionQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Permission,
      action: ResourceAction.Delete,
    }),
    async (
      req: TypedRequest<{
        params: typeof permissionParamsSchema;
        query: typeof deletePermissionQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: DeletePermissionMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const permission: Permission = await context.handlers.permissions.deletePermission(variables);

      sendSuccessResponse(res, permission);
    }
  );

  return router;
}
