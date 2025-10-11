import { Router } from 'express';

import { TagsController } from '../controllers/tags.controller';

import { validate } from '@/middleware/validation.middleware';
import {
  createTagRequestSchema,
  deleteTagQuerySchema,
  getTagsQuerySchema,
  tagParamsSchema,
  updateTagRequestSchema,
} from '@/rest/schemas';
import {
  TypedRequest,
  TypedRequestBody,
  TypedRequestParams,
  TypedRequestQuery,
} from '@/rest/types';
import { RequestContext } from '@/types';

export function createTagsRouter(context: RequestContext): Router {
  const router = Router();
  const tagsController = new TagsController(context);

  router.get('/', validate({ query: getTagsQuerySchema }), (req, res) =>
    tagsController.getTags(req as TypedRequest<TypedRequestQuery<typeof getTagsQuerySchema>>, res)
  );

  router.post('/', validate({ body: createTagRequestSchema }), (req, res) =>
    tagsController.createTag(
      req as TypedRequest<TypedRequestBody<typeof createTagRequestSchema>>,
      res
    )
  );

  router.patch(
    '/:id',
    validate({ params: tagParamsSchema, body: updateTagRequestSchema }),
    (req, res) =>
      tagsController.updateTag(
        req as TypedRequest<
          TypedRequestBody<typeof updateTagRequestSchema> &
            TypedRequestParams<typeof tagParamsSchema>
        >,
        res
      )
  );

  router.delete(
    '/:id',
    validate({ params: tagParamsSchema, query: deleteTagQuerySchema }),
    (req, res) =>
      tagsController.deleteTag(
        req as TypedRequest<
          TypedRequestParams<typeof tagParamsSchema> &
            TypedRequestQuery<typeof deleteTagQuerySchema>
        >,
        res
      )
  );

  return router;
}
