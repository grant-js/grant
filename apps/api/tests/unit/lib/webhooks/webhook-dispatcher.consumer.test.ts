import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { WebhookDispatcherConsumer } from '@/lib/webhooks/webhook-dispatcher.consumer';

const projectId = '10000000-0000-4000-8000-000000000060';
const organizationId = '10000000-0000-4000-8000-000000000061';
const eventId = '10000000-0000-4000-8000-000000000062';
const subscriptionId = '10000000-0000-4000-8000-000000000063';

function projectScopedEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: eventId,
    sequence: 1,
    type: 'project.user_added',
    category: 'membership',
    deliveryClass: 'notification',
    scope: {
      tenant: Tenant.OrganizationProject,
      id: `${organizationId}:${projectId}`,
    },
    actorUserId: 'actor-1',
    subjectUserId: 'subject-1',
    aggregate: { kind: 'projectUser', id: 'pu-1' },
    data: { after: { projectId, userId: 'subject-1' } },
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as DomainEvent;
}

describe('WebhookDispatcherConsumer delivery proof', () => {
  it('upserts a pending delivery for matching project-scoped subscriptions', async () => {
    const findActiveMatching = vi.fn().mockResolvedValue([{ id: subscriptionId }]);
    const upsertPending = vi.fn().mockResolvedValue(undefined);

    const consumer = new WebhookDispatcherConsumer(
      { findActiveMatching } as never,
      { upsertPending } as never
    );

    const event = projectScopedEvent();
    await consumer.process(event);

    expect(findActiveMatching).toHaveBeenCalledWith(projectId, 'project.user_added', undefined);
    expect(upsertPending).toHaveBeenCalledWith(eventId, subscriptionId, undefined);
  });

  it('skips non-project scopes', async () => {
    const findActiveMatching = vi.fn();
    const upsertPending = vi.fn();

    const consumer = new WebhookDispatcherConsumer(
      { findActiveMatching } as never,
      { upsertPending } as never
    );

    await consumer.process(
      projectScopedEvent({
        scope: { tenant: Tenant.Organization, id: organizationId },
      })
    );

    expect(findActiveMatching).not.toHaveBeenCalled();
    expect(upsertPending).not.toHaveBeenCalled();
  });
});
