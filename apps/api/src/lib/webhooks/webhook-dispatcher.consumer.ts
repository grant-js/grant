import type { IEventConsumer } from '@grantjs/core';
import type { DomainEvent } from '@grantjs/schema';

import { createLogger } from '@/lib/logger';
import { tryProjectIdFromScope } from '@/lib/project-id-from-scope.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';
import type { WebhookDeliveryRepository } from '@/repositories/webhook-deliveries.repository';
import type { WebhookSubscriptionRepository } from '@/repositories/webhook-subscriptions.repository';

const logger = createLogger('WebhookDispatcherConsumer');

/**
 * Fans a domain event out to per-project webhook subscriptions by creating an
 * idempotent `pending` delivery row per matching subscription. The actual HTTP
 * POST is performed later by the webhook delivery job. Only project-scoped
 * events can match a subscription (webhooks are per project).
 */
export class WebhookDispatcherConsumer implements IEventConsumer {
  public readonly name = 'webhooks';

  constructor(
    private readonly subscriptions: WebhookSubscriptionRepository,
    private readonly deliveries: WebhookDeliveryRepository
  ) {}

  async process(event: DomainEvent, transaction?: unknown): Promise<void> {
    const tx = transaction as Transaction | undefined;
    const projectId = tryProjectIdFromScope(event.scope);
    if (!projectId) return;

    const matches = await this.subscriptions.findActiveMatching(projectId, event.type, tx);
    if (matches.length === 0) return;

    for (const subscription of matches) {
      await this.deliveries.upsertPending(event.id, subscription.id, tx);
    }

    logger.debug({
      msg: 'Queued webhook deliveries for event',
      eventId: event.id,
      type: event.type,
      projectId,
      subscriptions: matches.length,
    });
  }
}
