import { Router } from 'express';

import { validate } from '@/middleware/validation.middleware';
import { ProjectUserApiKeysController } from '@/rest/controllers/project-user-api-keys.controller';
import {
  apiKeyIdParamsSchema,
  createProjectUserApiKeyRequestSchema,
  deleteProjectUserApiKeyRequestSchema,
  exchangeProjectUserApiKeyRequestSchema,
  getProjectUserApiKeysQuerySchema,
  projectUserApiKeyParamsSchema,
  revokeProjectUserApiKeyRequestSchema,
} from '@/rest/schemas/project-user-api-keys.schemas';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export function createProjectUserApiKeysRoutes(context: RequestContext) {
  const router = Router();
  const controller = new ProjectUserApiKeysController(context);

  router.get(
    '/projects/:projectId/users/:userId/api-keys',
    validate({ params: projectUserApiKeyParamsSchema, query: getProjectUserApiKeysQuerySchema }),
    (req, res) =>
      controller.getProjectUserApiKeys(
        req as TypedRequest<{
          params: typeof projectUserApiKeyParamsSchema;
          query: typeof getProjectUserApiKeysQuerySchema;
        }>,
        res
      )
  );

  router.post(
    '/projects/:projectId/users/:userId/api-keys',
    validate({ params: projectUserApiKeyParamsSchema, body: createProjectUserApiKeyRequestSchema }),
    (req, res) =>
      controller.createProjectUserApiKey(
        req as TypedRequest<{
          params: typeof projectUserApiKeyParamsSchema;
          body: typeof createProjectUserApiKeyRequestSchema;
        }>,
        res
      )
  );

  router.post(
    '/auth/project-user/token',
    validate({ body: exchangeProjectUserApiKeyRequestSchema }),
    (req, res) =>
      controller.exchangeProjectUserApiKey(
        req as TypedRequest<{
          body: typeof exchangeProjectUserApiKeyRequestSchema;
        }>,
        res
      )
  );

  router.post(
    '/project-user-api-keys/:id/revoke',
    validate({ params: apiKeyIdParamsSchema, body: revokeProjectUserApiKeyRequestSchema }),
    (req, res) =>
      controller.revokeProjectUserApiKey(
        req as TypedRequest<{
          params: typeof apiKeyIdParamsSchema;
          body: typeof revokeProjectUserApiKeyRequestSchema;
        }>,
        res
      )
  );

  router.delete(
    '/project-user-api-keys/:id',
    validate({ params: apiKeyIdParamsSchema, body: deleteProjectUserApiKeyRequestSchema }),
    (req, res) =>
      controller.deleteProjectUserApiKey(
        req as TypedRequest<{
          params: typeof apiKeyIdParamsSchema;
          body: typeof deleteProjectUserApiKeyRequestSchema;
        }>,
        res
      )
  );

  return router;
}
