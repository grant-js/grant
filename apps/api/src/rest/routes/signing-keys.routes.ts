import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import { requestContext } from '@/rest/request-context';
import {
  getSigningKeysQuerySchema,
  rotateSigningKeyRequestSchema,
} from '@/rest/schemas/signing-keys.schemas';
import { TypedRequest } from '@/rest/types';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createSigningKeysRoutes(fallback?: RequestContext) {
  const router = Router();

  router.get(
    '/',
    validate({ query: getSigningKeysQuerySchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ApiKey,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ query: typeof getSigningKeysQuerySchema }>, res: Response) => {
      const { scopeId, tenant, limit } = req.query;
      const scope = { id: scopeId!, tenant: tenant! };
      const keys = await requestContext(req, fallback).handlers.signingKeys.getSigningKeys(scope, {
        limit,
      });
      sendSuccessResponse(res, keys);
    }
  );

  router.post(
    '/rotate',
    validate({ body: rotateSigningKeyRequestSchema }),
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true }),
    authorizeRestRoute({
      resource: ResourceSlug.ApiKey,
      action: ResourceAction.Query,
    }),
    async (req: TypedRequest<{ body: typeof rotateSigningKeyRequestSchema }>, res: Response) => {
      const { scope } = req.body;
      const newKey = await requestContext(req, fallback).handlers.signingKeys.rotateSigningKey(
        scope
      );
      sendSuccessResponse(res, newKey, 201);
    }
  );

  return router;
}
