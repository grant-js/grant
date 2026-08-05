import { SortOrder } from '@grantjs/schema';
import { z } from 'zod';

export type WebhookView = 'card' | 'table';

export enum WebhookSortableField {
  Url = 'url',
  CreatedAt = 'createdAt',
  Active = 'active',
}

export interface WebhookSortInput {
  field: WebhookSortableField;
  order: SortOrder;
}

export const createWebhookSchema = z.object({
  url: z.string().url('errors.validation.invalidUrl').max(2048),
  description: z.string().max(500).optional(),
  eventTypes: z.array(z.string()).min(1, 'errors.validation.eventTypesMinOne'),
});

export type WebhookCreateFormValues = z.infer<typeof createWebhookSchema>;
