import { Router } from 'express';

import { GroupsController } from '../controllers/groups.controller';

import { validate } from '@/middleware/validation.middleware';
import {
  createGroupRequestSchema,
  deleteGroupQuerySchema,
  getGroupsQuerySchema,
  groupParamsSchema,
  updateGroupRequestSchema,
} from '@/rest/schemas';
import {
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/rest/types';
import { RequestContext } from '@/types';

export function createGroupsRouter(context: RequestContext): Router {
  const router = Router();
  const groupsController = new GroupsController(context);

  router.get('/', validate({ query: getGroupsQuerySchema }), (req, res) =>
    groupsController.getGroups(
      req as TypedRequest<TypedRequestQuery<typeof getGroupsQuerySchema>>,
      res
    )
  );

  router.post('/', validate({ body: createGroupRequestSchema }), (req, res) =>
    groupsController.createGroup(
      req as TypedRequest<TypedRequestBody<typeof createGroupRequestSchema>>,
      res
    )
  );

  router.patch(
    '/:id',
    validate({ params: groupParamsSchema, body: updateGroupRequestSchema }),
    (req, res) =>
      groupsController.updateGroup(
        req as TypedRequest<
          TypedRequestBody<typeof updateGroupRequestSchema> &
            TypedRequestParams<typeof groupParamsSchema>
        >,
        res
      )
  );

  router.delete(
    '/:id',
    validate({ params: groupParamsSchema, query: deleteGroupQuerySchema }),
    (req, res) =>
      groupsController.deleteGroup(
        req as TypedRequest<
          TypedRequestParams<typeof groupParamsSchema> &
            TypedRequestQuery<typeof deleteGroupQuerySchema>
        >,
        res
      )
  );

  return router;
}
