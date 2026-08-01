import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from '@/lib/zod-openapi.lib';
import {
  createWebhookSubscriptionRequestSchema,
  listWebhookDeliveriesQuerySchema,
  listWebhookSubscriptionsQuerySchema,
  updateWebhookSubscriptionRequestSchema,
  webhookScopeQuerySchema,
  webhookSubscriptionParamsSchema,
  webhookSubscriptionScopeBodySchema,
} from '@/rest/schemas/webhook-subscriptions.schemas';

const webhookSubscriptionSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  url: z.string().url(),
  eventTypes: z.array(z.string()),
  active: z.boolean(),
  description: z.string().nullable(),
  createdById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const webhookSubscriptionWithSecretSchema = webhookSubscriptionSchema.extend({
  secret: z.string().openapi({
    description: 'Plaintext signing secret. Returned only at creation / secret rotation.',
  }),
});

const webhookDeliverySchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  status: z.string(),
  attemptCount: z.number().int(),
  nextRetryAt: z.string().datetime().nullable(),
  lastResponseStatus: z.number().int().nullable(),
  errorDetails: z.record(z.string(), z.unknown()).nullable(),
  deliveredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const listResponse = z.object({
  success: z.literal(true),
  data: z.array(webhookSubscriptionSchema),
});
const itemResponse = z.object({ success: z.literal(true), data: webhookSubscriptionSchema });
const withSecretResponse = z.object({
  success: z.literal(true),
  data: webhookSubscriptionWithSecretSchema,
});
const deliveriesResponse = z.object({
  success: z.literal(true),
  data: z.object({
    items: z.array(webhookDeliverySchema),
    totalCount: z.number().int(),
    hasNextPage: z.boolean(),
  }),
});
const deliveryResponse = z.object({ success: z.literal(true), data: webhookDeliverySchema });

const TAG = 'Webhook Subscriptions';
const security = [{ bearerAuth: [] }];

export function registerWebhookSubscriptionsOpenApi(registry: OpenAPIRegistry) {
  registry.register('WebhookSubscription', webhookSubscriptionSchema);
  registry.register('WebhookDeliveryAttempt', webhookDeliverySchema);

  registry.registerPath({
    method: 'get',
    path: '/api/webhook-subscriptions',
    tags: [TAG],
    summary: 'List webhook subscriptions',
    description: 'Lists webhook subscriptions for a project scope.',
    security,
    request: { query: listWebhookSubscriptionsQuerySchema },
    responses: {
      200: {
        description: 'List of subscriptions',
        content: { 'application/json': { schema: listResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/webhook-subscriptions',
    tags: [TAG],
    summary: 'Create webhook subscription',
    description:
      'Creates a webhook subscription. The signing secret is generated server-side and returned only once in this response.',
    security,
    request: {
      body: {
        content: { 'application/json': { schema: createWebhookSubscriptionRequestSchema } },
      },
    },
    responses: {
      201: {
        description: 'Created subscription (includes the one-time secret)',
        content: { 'application/json': { schema: withSecretResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/webhook-subscriptions/deliveries',
    tags: [TAG],
    summary: 'List webhook delivery attempts',
    security,
    request: { query: listWebhookDeliveriesQuerySchema },
    responses: {
      200: {
        description: 'Paginated delivery attempts',
        content: { 'application/json': { schema: deliveriesResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/webhook-subscriptions/deliveries/{deliveryId}/replay',
    tags: [TAG],
    summary: 'Replay a webhook delivery',
    security,
    request: {
      params: z.object({ deliveryId: z.string().uuid() }),
      body: { content: { 'application/json': { schema: webhookSubscriptionScopeBodySchema } } },
    },
    responses: {
      200: {
        description: 'Delivery re-queued',
        content: { 'application/json': { schema: deliveryResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/webhook-subscriptions/{id}',
    tags: [TAG],
    summary: 'Get a webhook subscription',
    security,
    request: { params: webhookSubscriptionParamsSchema, query: webhookScopeQuerySchema },
    responses: {
      200: {
        description: 'Subscription',
        content: { 'application/json': { schema: itemResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/webhook-subscriptions/{id}',
    tags: [TAG],
    summary: 'Update a webhook subscription',
    security,
    request: {
      params: webhookSubscriptionParamsSchema,
      body: { content: { 'application/json': { schema: updateWebhookSubscriptionRequestSchema } } },
    },
    responses: {
      200: {
        description: 'Updated subscription',
        content: { 'application/json': { schema: itemResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/webhook-subscriptions/{id}/rotate-secret',
    tags: [TAG],
    summary: 'Rotate a webhook subscription secret',
    description: 'Generates a new signing secret and returns it once.',
    security,
    request: {
      params: webhookSubscriptionParamsSchema,
      body: { content: { 'application/json': { schema: webhookSubscriptionScopeBodySchema } } },
    },
    responses: {
      200: {
        description: 'Subscription with the new one-time secret',
        content: { 'application/json': { schema: withSecretResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/webhook-subscriptions/{id}',
    tags: [TAG],
    summary: 'Delete a webhook subscription',
    security,
    request: { params: webhookSubscriptionParamsSchema, query: webhookScopeQuerySchema },
    responses: {
      200: {
        description: 'Deleted',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.object({ success: z.boolean() }),
            }),
          },
        },
      },
    },
  });
}
