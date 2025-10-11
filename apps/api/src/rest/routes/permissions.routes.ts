import { Router } from 'express';

import { validate } from '@/middleware/validation.middleware';
import {
  createPermissionRequestSchema,
  deletePermissionQuerySchema,
  getPermissionsQuerySchema,
  permissionParamsSchema,
  updatePermissionRequestSchema,
} from '@/rest/schemas';
import {
  RequestContext,
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/types'; // RequestContext
import {
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/rest/types';

import { PermissionsController } from '../controllers/permissions.controller';

export function createPermissionsRouter(context: RequestContext): Router {
  const router = Router();
  const permissionsController = new PermissionsController(context);

  router.get('/', validate({ query: getPermissionsQuerySchema }), (req, res) =>
    permissionsController.getPermissions(
      req as TypedRequest<TypedRequestQuery<typeof getPermissionsQuerySchema>>,
      res
    )
  );

  router.post('/', validate({ body: createPermissionRequestSchema }), (req, res) =>
    permissionsController.createPermission(
      req as TypedRequest<TypedRequestBody<typeof createPermissionRequestSchema>>,
      res
    )
  );

  router.patch(
    '/:id',
    validate({ params: permissionParamsSchema, body: updatePermissionRequestSchema }),
    (req, res) =>
      permissionsController.updatePermission(
        req as TypedRequest<
          TypedRequestBody<typeof updatePermissionRequestSchema> &
            TypedRequestParams<typeof permissionParamsSchema>
        >,
        res
      )
  );

  router.delete(
    '/:id',
    validate({ params: permissionParamsSchema, query: deletePermissionQuerySchema }),
    (req, res) =>
      permissionsController.deletePermission(
        req as TypedRequest<
          TypedRequestParams<typeof permissionParamsSchema> &
            TypedRequestQuery<typeof deletePermissionQuerySchema>
        >,
        res
      )
  );

  return router;
}
