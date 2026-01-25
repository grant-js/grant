import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import {
  CreateTagMutationVariables,
  DeleteTagMutationVariables,
  Tag,
  UpdateTagMutationVariables,
} from '@grantjs/schema';
import { TagSortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  createTagRequestSchema,
  deleteTagQuerySchema,
  getTagsQuerySchema,
  tagParamsSchema,
  updateTagRequestSchema,
} from '@/rest/schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createTagsRouter(context: RequestContext): Router {
  const router = Router();

  router.get(
    '/',
    validate({ query: getTagsQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Tag,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getTagsQuerySchema }>, res: Response) => {
      const { page, limit, search, sortField, sortOrder, scopeId, tenant } = req.query;

      const { sort, scope } = queryListCommons<Tag, TagSortInput>({
        sortField,
        sortOrder,
        scopeId,
        tenant,
      });

      const result = await context.handlers.tags.getTags({
        page,
        limit,
        search,
        sort,
        scope: scope!,
      });

      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/',
    validate({ body: createTagRequestSchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Tag,
      action: ResourceAction.Create,
    }),
    async (req, res) => {
      const variables: CreateTagMutationVariables = {
        input: req.body,
      };

      const tag: Tag = await context.handlers.tags.createTag(variables);

      sendSuccessResponse(res, tag, 201);
    }
  );

  router.patch(
    '/:id',
    validate({ params: tagParamsSchema, body: updateTagRequestSchema, query: deleteTagQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Tag,
      action: ResourceAction.Update,
    }),
    async (
      req: TypedRequest<{
        params: typeof tagParamsSchema;
        body: typeof updateTagRequestSchema;
        query: typeof deleteTagQuerySchema;
      }>,
      res
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: UpdateTagMutationVariables = {
        id,
        input: {
          ...req.body,
          scope: { id: scopeId, tenant },
        },
      };

      const tag: Tag = await context.handlers.tags.updateTag(variables);

      sendSuccessResponse(res, tag);
    }
  );

  router.delete(
    '/:id',
    validate({ params: tagParamsSchema, query: deleteTagQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.Tag,
      action: ResourceAction.Delete,
    }),
    async (
      req: TypedRequest<{
        params: typeof tagParamsSchema;
        query: typeof deleteTagQuerySchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scopeId, tenant } = req.query;

      const variables: DeleteTagMutationVariables = {
        id,
        scope: { id: scopeId, tenant },
      };

      const tag: Tag = await context.handlers.tags.deleteTag(variables);

      sendSuccessResponse(res, tag);
    }
  );

  return router;
}
