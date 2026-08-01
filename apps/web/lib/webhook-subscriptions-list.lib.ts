import type { WebhookSubscription } from '@grantjs/schema';
import { SortOrder } from '@grantjs/schema';

import type {
  WebhookSortableField,
  WebhookSortInput,
} from '@/components/features/webhooks/webhook-types';

export function filterWebhookSubscriptions(
  subscriptions: WebhookSubscription[],
  search: string
): WebhookSubscription[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return subscriptions;
  }

  return subscriptions.filter(
    (subscription) =>
      subscription.url.toLowerCase().includes(query) ||
      (subscription.description?.toLowerCase().includes(query) ?? false) ||
      subscription.eventTypes.some((eventType) => eventType.toLowerCase().includes(query))
  );
}

export function sortWebhookSubscriptions(
  subscriptions: WebhookSubscription[],
  sort: WebhookSortInput
): WebhookSubscription[] {
  const sorted = [...subscriptions];
  const direction = sort.order === SortOrder.Desc ? -1 : 1;

  sorted.sort((left, right) => {
    switch (sort.field as WebhookSortableField) {
      case 'url':
        return direction * left.url.localeCompare(right.url);
      case 'active':
        return direction * (Number(left.active) - Number(right.active));
      case 'createdAt':
      default:
        return (
          direction * (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
        );
    }
  });

  return sorted;
}

export function paginateItems<T>(items: T[], page: number, limit: number): T[] {
  const offset = (page - 1) * limit;
  return items.slice(offset, offset + limit);
}
