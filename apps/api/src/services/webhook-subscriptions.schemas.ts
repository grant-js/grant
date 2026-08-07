import { EVENT_TYPES } from '@grantjs/schema';
import { z } from 'zod';

const eventTypeSchema = z.enum(EVENT_TYPES);

export const createWebhookSubscriptionSchema = z.object({
  url: z.string().url().max(2048),
  eventTypes: z.array(eventTypeSchema).min(1),
  description: z.string().max(500).nullish(),
  active: z.boolean().optional(),
});

export const updateWebhookSubscriptionSchema = z
  .object({
    url: z.string().url().max(2048),
    eventTypes: z.array(eventTypeSchema).min(1),
    description: z.string().max(500).nullish(),
    active: z.boolean(),
  })
  .partial();
