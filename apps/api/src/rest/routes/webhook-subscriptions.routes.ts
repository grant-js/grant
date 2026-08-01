import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Response, Router } from 'express';

import { authorizeRestRoute, requireEmailThenMfaRest } from '@/lib/authorization';
import { validate } from '@/middleware/validation.middleware';
import {
  createWebhookSubscriptionRequestSchema,
  listWebhookDeliveriesQuerySchema,
  listWebhookSubscriptionsQuerySchema,
  updateWebhookSubscriptionRequestSchema,
  webhookDeliveryParamsSchema,
  webhookScopeQuerySchema,
  webhookSubscriptionParamsSchema,
  webhookSubscriptionScopeBodySchema,
} from '@/rest/schemas/webhook-subscriptions.schemas';
import { TypedRequest } from '@/rest/types';
import { sendSuccessResponse } from '@/rest/utils/response';
import { RequestContext } from '@/types';

export function createWebhookSubscriptionsRoutes(context: RequestContext) {
  const router = Router();

  const mfa = () =>
    requireEmailThenMfaRest({ allowPersonalContext: true }, { allowPersonalContext: true });

  router.get(
    '/deliveries',
    validate({ query: listWebhookDeliveriesQuerySchema }),
    mfa(),
    authorizeRestRoute({ resource: ResourceSlug.Project, action: ResourceAction.Query }),
    async (
      req: TypedRequest<{ query: typeof listWebhookDeliveriesQuerySchema }>,
      res: Response
    ) => {
      const { scopeId, tenant, subscriptionId, status, page, limit } = req.query;
      const scope = { id: scopeId!, tenant: tenant! };
      const result = await context.handlers.webhookSubscriptions.listDeliveries(scope, {
        subscriptionId,
        status,
        page,
        limit,
      });
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/deliveries/:deliveryId/replay',
    validate({
      params: webhookDeliveryParamsSchema,
      body: webhookSubscriptionScopeBodySchema,
    }),
    mfa(),
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof webhookDeliveryParamsSchema;
        body: typeof webhookSubscriptionScopeBodySchema;
      }>,
      res: Response
    ) => {
      const result = await context.handlers.webhookSubscriptions.replayDelivery(
        req.body.scope,
        req.params.deliveryId
      );
      sendSuccessResponse(res, result);
    }
  );

  router.get(
    '/',
    validate({ query: listWebhookSubscriptionsQuerySchema }),
    mfa(),
    authorizeRestRoute({ resource: ResourceSlug.Project, action: ResourceAction.Query }),
    async (
      req: TypedRequest<{ query: typeof listWebhookSubscriptionsQuerySchema }>,
      res: Response
    ) => {
      const { scopeId, tenant } = req.query;
      const result = await context.handlers.webhookSubscriptions.list({
        id: scopeId!,
        tenant: tenant!,
      });
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/',
    validate({ body: createWebhookSubscriptionRequestSchema }),
    mfa(),
    authorizeRestRoute({ resource: ResourceSlug.Project, action: ResourceAction.Create }),
    async (
      req: TypedRequest<{ body: typeof createWebhookSubscriptionRequestSchema }>,
      res: Response
    ) => {
      const { scope, ...input } = req.body;
      const result = await context.handlers.webhookSubscriptions.create(scope, input);
      sendSuccessResponse(res, result, 201);
    }
  );

  router.get(
    '/:id',
    validate({ params: webhookSubscriptionParamsSchema, query: webhookScopeQuerySchema }),
    mfa(),
    authorizeRestRoute({ resource: ResourceSlug.Project, action: ResourceAction.Query }),
    async (
      req: TypedRequest<{
        params: typeof webhookSubscriptionParamsSchema;
        query: typeof webhookScopeQuerySchema;
      }>,
      res: Response
    ) => {
      const { scopeId, tenant } = req.query;
      const result = await context.handlers.webhookSubscriptions.getById(
        { id: scopeId!, tenant: tenant! },
        req.params.id
      );
      sendSuccessResponse(res, result);
    }
  );

  router.patch(
    '/:id',
    validate({
      params: webhookSubscriptionParamsSchema,
      body: updateWebhookSubscriptionRequestSchema,
    }),
    mfa(),
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof webhookSubscriptionParamsSchema;
        body: typeof updateWebhookSubscriptionRequestSchema;
      }>,
      res: Response
    ) => {
      const { scope, ...input } = req.body;
      const result = await context.handlers.webhookSubscriptions.update(
        scope,
        req.params.id,
        input
      );
      sendSuccessResponse(res, result);
    }
  );

  router.post(
    '/:id/rotate-secret',
    validate({
      params: webhookSubscriptionParamsSchema,
      body: webhookSubscriptionScopeBodySchema,
    }),
    mfa(),
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Update,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof webhookSubscriptionParamsSchema;
        body: typeof webhookSubscriptionScopeBodySchema;
      }>,
      res: Response
    ) => {
      const result = await context.handlers.webhookSubscriptions.rotateSecret(
        req.body.scope,
        req.params.id
      );
      sendSuccessResponse(res, result);
    }
  );

  router.delete(
    '/:id',
    validate({ params: webhookSubscriptionParamsSchema, query: webhookScopeQuerySchema }),
    mfa(),
    authorizeRestRoute({
      resource: ResourceSlug.Project,
      action: ResourceAction.Delete,
      resourceResolver: 'projectApp',
    }),
    async (
      req: TypedRequest<{
        params: typeof webhookSubscriptionParamsSchema;
        query: typeof webhookScopeQuerySchema;
      }>,
      res: Response
    ) => {
      const { scopeId, tenant } = req.query;
      await context.handlers.webhookSubscriptions.delete(
        { id: scopeId!, tenant: tenant! },
        req.params.id
      );
      sendSuccessResponse(res, { success: true });
    }
  );

  return router;
}
