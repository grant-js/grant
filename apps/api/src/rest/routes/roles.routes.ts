import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  CreateRoleMutationVariables,
  DeleteRoleMutationVariables,
  Role,
  UpdateRoleMutationVariables,
} from '@grantjs/schema';
import { RoleSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  createRoleRequestSchema,
  deleteRoleQuerySchema,
  getRolesQuerySchema,
  roleParamsSchema,
  updateRoleRequestSchema,
} from '@/rest/schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createRolesRouter(context: RequestContext): Router {
  const router = Router();

  router.get(
    '/',
    validate({ query: getRolesQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Role,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getRolesQuerySchema }>, res: Response) => {
      const { page, limit, search, sortField, sortOrder, tagIds, scopeId, tenant, relations } =
        req.query;

      const { requestedFields, sort, scope } = queryListCommons<Role, RoleSortInput>({
        relations,
        sortField,
        sortOrder,
        scopeId,
        tenant,
      });

      const result = await context.handlers.roles.getRoles({
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
    validate({ body: createRoleRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Role,
      action: ResourceAction.Create,
    }),
    async (req, res) => {
      const variables: CreateRoleMutationVariables = {
        input: req.body,
      };

      const role: Role = await context.handlers.roles.createRole(variables);

      sendSuccessResponse(res, role, 201);
    }
  );

  router.patch(
    '/:id',
    validate({ params: roleParamsSchema, body: updateRoleRequestSchema, query: deleteRoleQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Role,
      action: ResourceAction.Update,
    }),
    async (
      req: TypedRequest<{
        params: typeof roleParamsSchema;
        body: typeof updateRoleRequestSchema;
        query: typeof deleteRoleQuerySchema;
      }>,
      res
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: UpdateRoleMutationVariables = {
        id,
        input: {
          ...req.body,
          scope: { id: scopeId, tenant },
        },
      };

      const role: Role = await context.handlers.roles.updateRole(variables);

      sendSuccessResponse(res, role);
    }
  );

  router.delete(
    '/:id',
    validate({ params: roleParamsSchema, query: deleteRoleQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Role,
      action: ResourceAction.Delete,
    }),
    async (
      req: TypedRequest<{
        params: typeof roleParamsSchema;
        query: typeof deleteRoleQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: DeleteRoleMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const role: Role = await context.handlers.roles.deleteRole(variables);

      sendSuccessResponse(res, role);
    }
  );

  return router;
}
