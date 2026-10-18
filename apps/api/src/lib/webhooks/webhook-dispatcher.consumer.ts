import type { IEventConsumer } from '@grantjs/core';
import type { DomainEvent } from '@grantjs/schema';

import { createLogger } from '@/lib/logger';
import { tryOwningProjectIdFromScope } from '@/lib/scope.lib';
import type { Transaction } from '@/lib/transaction-manager.lib';
import type { WebhookDeliveryRepository } from '@/repositories/webhook-deliveries.repository';
import type { WebhookSubscriptionRepository } from '@/repositories/webhook-subscriptions.repository';

const logger = createLogger('WebhookDispatcherConsumer');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Every project an event is relevant to: the project its scope names (any
 * project-bearing tenant, `projectUser` included) plus the projects the
 * publisher recorded for an entity-bound event. Order is stable, duplicates
 * dropped, and anything that is not a uuid is ignored: it would fail the
 * subscription query and abort the whole relay batch on every retry.
 */
export function webhookProjectIdsOf(event: DomainEvent): string[] {
  const candidates = [tryOwningProjectIdFromScope(event.scope), ...(event.projectIds ?? [])];
  return [...new Set(candidates.filter((id): id is string => !!id && UUID_RE.test(id)))];
}

/**
 * Fans a domain event out to per-project webhook subscriptions by creating an
 * idempotent `pending` delivery row per matching subscription. The actual HTTP
 * POST is performed later by the webhook delivery job. Webhooks are per project,
 * so an event reaches a subscription when it is relevant to that project, whatever
 * scope the request that caused it ran in (ADR 0012): an event with no project
 * (an organization-only entity, a platform event) matches nothing.
 */
export class WebhookDispatcherConsumer implements IEventConsumer {
  public readonly name = 'webhooks';

  constructor(
    private readonly subscriptions: WebhookSubscriptionRepository,
    private readonly deliveries: WebhookDeliveryRepository
  ) {}

  async process(event: DomainEvent, transaction?: unknown): Promise<void> {
    const tx = transaction as Transaction | undefined;

    for (const projectId of webhookProjectIdsOf(event)) {
      const matches = await this.subscriptions.findActiveMatching(projectId, event.type, tx);
      if (matches.length === 0) continue;

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
}
