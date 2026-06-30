import { EVENT_TYPES, Tenant, WEBHOOK_ORDERING_MODES } from '@grantjs/schema';

import { z } from '@/lib/zod-openapi.lib';
import { scopeIdSchema, scopeSchema } from '@/rest/schemas/common.schemas';

const tenantSchema = z.enum(Object.values(Tenant) as [Tenant, ...Tenant[]]);
const eventTypeSchema = z.enum(EVENT_TYPES);
const orderingModeSchema = z.enum(WEBHOOK_ORDERING_MODES);

const limitQuery = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) =>
    val === undefined ? undefined : typeof val === 'string' ? parseInt(val, 10) : val
  )
  .pipe(z.number().int().positive().max(100).optional());

const pageQuery = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) =>
    val === undefined ? undefined : typeof val === 'string' ? parseInt(val, 10) : val
  )
  .pipe(z.number().int().positive().optional());

export const webhookScopeQuerySchema = z.object({
  scopeId: scopeIdSchema,
  tenant: tenantSchema,
});

export const listWebhookSubscriptionsQuerySchema = webhookScopeQuerySchema;

export const webhookSubscriptionParamsSchema = z.object({
  id: z.string().uuid(),
});

export const webhookDeliveryParamsSchema = z.object({
  deliveryId: z.string().uuid(),
});

export const createWebhookSubscriptionRequestSchema = z.object({
  scope: scopeSchema,
  url: z.string().url().max(2048),
  eventTypes: z.array(eventTypeSchema).min(1),
  orderingMode: orderingModeSchema.optional(),
  description: z.string().max(500).nullish(),
  active: z.boolean().optional(),
});

export const updateWebhookSubscriptionRequestSchema = z.object({
  scope: scopeSchema,
  url: z.string().url().max(2048).optional(),
  eventTypes: z.array(eventTypeSchema).min(1).optional(),
  orderingMode: orderingModeSchema.optional(),
  description: z.string().max(500).nullish(),
  active: z.boolean().optional(),
});

export const webhookSubscriptionScopeBodySchema = z.object({
  scope: scopeSchema,
});

export const listWebhookDeliveriesQuerySchema = webhookScopeQuerySchema.extend({
  subscriptionId: z.string().uuid().optional(),
  status: z.enum(['pending', 'running', 'delivered', 'failed', 'dead']).optional(),
  page: pageQuery,
  limit: limitQuery,
});
