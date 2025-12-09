import { Router } from 'express';

import { validate } from '@/middleware/validation.middleware';
import { ApiKeysController } from '@/rest/controllers/api-keys.controller';
import {
  apiKeyIdParamsSchema,
  createApiKeyRequestSchema,
  deleteApiKeyRequestSchema,
  getApiKeysQuerySchema,
  revokeApiKeyRequestSchema,
} from '@/rest/schemas/api-keys.schemas';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export function createApiKeysRoutes(context: RequestContext) {
  const router = Router();
  const controller = new ApiKeysController(context);

  router.get('/', validate({ query: getApiKeysQuerySchema }), (req, res) =>
    controller.getApiKeys(
      req as TypedRequest<{
        query: typeof getApiKeysQuerySchema;
      }>,
      res
    )
  );

  router.post('/', validate({ body: createApiKeyRequestSchema }), (req, res) =>
    controller.createApiKey(
      req as TypedRequest<{
        body: typeof createApiKeyRequestSchema;
      }>,
      res
    )
  );

  router.post(
    '/:id/revoke',
    validate({ params: apiKeyIdParamsSchema, body: revokeApiKeyRequestSchema }),
    (req, res) =>
      controller.revokeApiKey(
        req as TypedRequest<{
          params: typeof apiKeyIdParamsSchema;
          body: typeof revokeApiKeyRequestSchema;
        }>,
        res
      )
  );

  router.delete(
    '/:id',
    validate({ params: apiKeyIdParamsSchema, body: deleteApiKeyRequestSchema }),
    (req, res) =>
      controller.deleteApiKey(
        req as TypedRequest<{
          params: typeof apiKeyIdParamsSchema;
          body: typeof deleteApiKeyRequestSchema;
        }>,
        res
      )
  );

  return router;
}
