import { SortOrder } from '@grantjs/schema';

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
