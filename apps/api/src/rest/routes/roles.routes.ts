import { Router } from 'express';

import { RolesController } from '../controllers/roles.controller';

import { validate } from '@/middleware/validation.middleware';
import {
  createRoleRequestSchema,
  deleteRoleQuerySchema,
  getRolesQuerySchema,
  roleParamsSchema,
  updateRoleRequestSchema,
} from '@/rest/schemas';
import {
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/rest/types';
import { RequestContext } from '@/types';

export function createRolesRouter(context: RequestContext): Router {
  const router = Router();
  const rolesController = new RolesController(context);

  router.get('/', validate({ query: getRolesQuerySchema }), (req, res) =>
    rolesController.getRoles(
      req as TypedRequest<TypedRequestQuery<typeof getRolesQuerySchema>>,
      res
    )
  );

  router.post('/', validate({ body: createRoleRequestSchema }), (req, res) =>
    rolesController.createRole(
      req as TypedRequest<TypedRequestBody<typeof createRoleRequestSchema>>,
      res
    )
  );

  router.patch(
    '/:id',
    validate({ params: roleParamsSchema, body: updateRoleRequestSchema }),
    (req, res) =>
      rolesController.updateRole(
        req as TypedRequest<
          TypedRequestBody<typeof updateRoleRequestSchema> &
            TypedRequestParams<typeof roleParamsSchema>
        >,
        res
      )
  );

  router.delete(
    '/:id',
    validate({ params: roleParamsSchema, query: deleteRoleQuerySchema }),
    (req, res) =>
      rolesController.deleteRole(
        req as TypedRequest<
          TypedRequestParams<typeof roleParamsSchema> &
            TypedRequestQuery<typeof deleteRoleQuerySchema>
        >,
        res
      )
  );

  return router;
}
