import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  CreateResourceMutationVariables,
  DeleteResourceMutationVariables,
  Resource,
  UpdateResourceMutationVariables,
} from '@grantjs/schema';
import { ResourceSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  createResourceRequestSchema,
  deleteResourceQuerySchema,
  getResourcesQuerySchema,
  resourceParamsSchema,
  updateResourceRequestSchema,
} from '@/rest/schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createResourcesRouter(context: RequestContext): Router {
  const router = Router();

  router.get(
    '/',
    validate({ query: getResourcesQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Resource,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getResourcesQuerySchema }>, res: Response) => {
      const { page, limit, search, sortField, sortOrder, scopeId, tenant, isActive } = req.query;

      const requestedFields: Array<keyof Resource> = [];
      const { sort, scope } = queryListCommons<Resource, ResourceSortInput>({
        sortField,
        sortOrder,
        scopeId,
        tenant,
      });

      const result = await context.handlers.resources.getResources({
        page,
        limit,
        search,
        sort,
        isActive,
        scope: scope!,
        requestedFields,
      });

      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/',
    validate({ body: createResourceRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Resource,
      action: ResourceAction.Create,
    }),
    async (req, res) => {
      const variables: CreateResourceMutationVariables = {
        input: req.body,
      };

      const resource: Resource = await context.handlers.resources.createResource(variables);

      sendSuccessResponse(res, resource, 201);
    }
  );

  router.patch(
    '/:id',
    validate({ params: resourceParamsSchema, body: updateResourceRequestSchema, query: deleteResourceQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Resource,
      action: ResourceAction.Update,
    }),
    async (
      req: TypedRequest<{
        params: typeof resourceParamsSchema;
        body: typeof updateResourceRequestSchema;
        query: typeof deleteResourceQuerySchema;
      }>,
      res
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: UpdateResourceMutationVariables = {
        id,
        input: {
          ...req.body,
          scope: { id: scopeId, tenant },
        },
      };

      const resource: Resource = await context.handlers.resources.updateResource(variables);

      sendSuccessResponse(res, resource);
    }
  );

  router.delete(
    '/:id',
    validate({ params: resourceParamsSchema, query: deleteResourceQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Resource,
      action: ResourceAction.Delete,
    }),
    async (
      req: TypedRequest<{
        params: typeof resourceParamsSchema;
        query: typeof deleteResourceQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: DeleteResourceMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const resource: Resource = await context.handlers.resources.deleteResource(variables);

      sendSuccessResponse(res, resource);
    }
  );

  return router;
}
