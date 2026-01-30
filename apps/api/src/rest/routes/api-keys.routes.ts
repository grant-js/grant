import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKey, ApiKeySortInput } from '@grantjs/schema';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailVerificationRest } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  apiKeyIdParamsSchema,
  createApiKeyRequestSchema,
  deleteApiKeyRequestSchema,
  getApiKeysQuerySchema,
  revokeApiKeyRequestSchema,
} from '@/rest/schemas/api-keys.schemas';
import { TypedRequest } from '@/rest/types';
import { queryListCommons } from '@/rest/utils/list-query';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createApiKeysRoutes(context: RequestContext) {
  const router = Router();

  router.get(
    '/',
    validate({ query: getApiKeysQuerySchema }),
    authorizeRestRoute({
      resource: ResourceSlug.ApiKey,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getApiKeysQuerySchema }>, res: Response) => {
      const { scopeId, tenant, page, limit, search, sortField, sortOrder, ids } = req.query;

      const { sort, scope } = queryListCommons<ApiKey, ApiKeySortInput>({
        sortField,
        sortOrder,
        scopeId,
        tenant,
      });

      const apiKeys = await context.handlers.apiKeys.getApiKeys({
        scope: scope!,
        page,
        limit,
        search,
        sort,
        ids,
      });

      sendSuccessResponse(res, apiKeys);
    }
  );

  router.post(
    '/',
    validate({ body: createApiKeyRequestSchema }),
    requireEmailVerificationRest({ allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ApiKey,
      action: ResourceAction.Create,
    }),
    async (req: TypedRequest<{ body: typeof createApiKeyRequestSchema }>, res: Response) => {
      const { name, description, expiresAt, scope, roleId } = req.body;

      const result = await context.handlers.apiKeys.createApiKey({
        input: {
          name,
          description,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          scope,
          roleId,
        },
      });

      sendSuccessResponse(res, result, 201);
    }
  );

  router.post(
    '/:id/revoke',
    validate({ params: apiKeyIdParamsSchema, body: revokeApiKeyRequestSchema }),
    requireEmailVerificationRest({ allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ApiKey,
      action: ResourceAction.Revoke,
    }),
    async (
      req: TypedRequest<{
        params: typeof apiKeyIdParamsSchema;
        body: typeof revokeApiKeyRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { scope } = req.body;

      const apiKey = await context.handlers.apiKeys.revokeApiKey({
        input: { id, scope },
      });

      sendSuccessResponse(res, apiKey);
    }
  );

  router.delete(
    '/:id',
    validate({ params: apiKeyIdParamsSchema, body: deleteApiKeyRequestSchema }),
    requireEmailVerificationRest({ allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ApiKey,
      action: ResourceAction.Delete,
    }),
    async (
      req: TypedRequest<{
        params: typeof apiKeyIdParamsSchema;
        body: typeof deleteApiKeyRequestSchema;
      }>,
      res: Response
    ) => {
      const { id } = req.params;
      const { hardDelete, scope } = req.body;

      const apiKey = await context.handlers.apiKeys.deleteApiKey({
        input: { id, hardDelete, scope },
      });

      sendSuccessResponse(res, apiKey);
    }
  );

  return router;
}
