import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  CreateGroupMutationVariables,
  DeleteGroupMutationVariables,
  Group,
  UpdateGroupMutationVariables,
} from '@grantjs/schema';
import { GroupSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  createGroupRequestSchema,
  deleteGroupQuerySchema,
  getGroupsQuerySchema,
  groupParamsSchema,
  updateGroupRequestSchema,
} from '@/rest/schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createGroupsRouter(context: RequestContext): Router {
  const router = Router();

  router.get(
    '/',
    validate({ query: getGroupsQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Group,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getGroupsQuerySchema }>, res: Response) => {
      const { page, limit, search, sortField, sortOrder, tagIds, scopeId, tenant, relations } =
        req.query;

      const { requestedFields, sort, scope } = queryListCommons<Group, GroupSortInput>({
        relations,
        sortField,
        sortOrder,
        scopeId,
        tenant,
      });

      const result = await context.handlers.groups.getGroups({
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
    validate({ body: createGroupRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Group,
      action: ResourceAction.Create,
    }),
    async (req, res) => {
      const variables: CreateGroupMutationVariables = {
        input: req.body,
      };

      const group: Group = await context.handlers.groups.createGroup(variables);

      sendSuccessResponse(res, group, 201);
    }
  );

  router.patch(
    '/:id',
    validate({ params: groupParamsSchema, body: updateGroupRequestSchema, query: deleteGroupQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Group,
      action: ResourceAction.Update,
    }),
    async (
      req: TypedRequest<{
        params: typeof groupParamsSchema;
        body: typeof updateGroupRequestSchema;
        query: typeof deleteGroupQuerySchema;
      }>,
      res
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: UpdateGroupMutationVariables = {
        id,
        input: {
          ...req.body,
          scope: { id: scopeId, tenant },
        },
      };

      const group: Group = await context.handlers.groups.updateGroup(variables);

      sendSuccessResponse(res, group);
    }
  );

  router.delete(
    '/:id',
    validate({ params: groupParamsSchema, query: deleteGroupQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Group,
      action: ResourceAction.Delete,
    }),
    async (
      req: TypedRequest<{
        params: typeof groupParamsSchema;
        query: typeof deleteGroupQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: DeleteGroupMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const group: Group = await context.handlers.groups.deleteGroup(variables);

      sendSuccessResponse(res, group);
    }
  );

  return router;
}
