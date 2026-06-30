import { EVENT_TYPES, WEBHOOK_ORDERING_MODES } from '@grantjs/schema';
import { z } from 'zod';

const eventTypeSchema = z.enum(EVENT_TYPES);

export const createWebhookSubscriptionSchema = z.object({
  url: z.string().url().max(2048),
  eventTypes: z.array(eventTypeSchema).min(1),
  orderingMode: z.enum(WEBHOOK_ORDERING_MODES).optional(),
  description: z.string().max(500).nullish(),
  active: z.boolean().optional(),
});

export const updateWebhookSubscriptionSchema = z
  .object({
    url: z.string().url().max(2048),
    eventTypes: z.array(eventTypeSchema).min(1),
    orderingMode: z.enum(WEBHOOK_ORDERING_MODES),
    description: z.string().max(500).nullish(),
    active: z.boolean(),
  })
  .partial();

export type CreateWebhookSubscriptionSchema = z.infer<typeof createWebhookSubscriptionSchema>;
export type UpdateWebhookSubscriptionSchema = z.infer<typeof updateWebhookSubscriptionSchema>;
