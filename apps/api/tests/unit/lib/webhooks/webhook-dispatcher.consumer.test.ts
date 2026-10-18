import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import {
  WebhookDispatcherConsumer,
  webhookProjectIdsOf,
} from '@/lib/webhooks/webhook-dispatcher.consumer';

const projectId = '10000000-0000-4000-8000-000000000060';
const otherProjectId = '10000000-0000-4000-8000-000000000064';
const organizationId = '10000000-0000-4000-8000-000000000061';
const userId = '10000000-0000-4000-8000-000000000065';
const eventId = '10000000-0000-4000-8000-000000000062';
const subscriptionId = '10000000-0000-4000-8000-000000000063';
const otherSubscriptionId = '10000000-0000-4000-8000-000000000066';

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

function roleEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return projectScopedEvent({
    type: 'role.updated',
    category: 'iam',
    aggregate: { kind: 'role', id: 'role-1' },
    data: { after: { id: 'role-1' } },
    ...overrides,
  });
}

function buildConsumer(findActiveMatching = vi.fn().mockResolvedValue([{ id: subscriptionId }])) {
  const upsertPending = vi.fn().mockResolvedValue(undefined);
  const consumer = new WebhookDispatcherConsumer(
    { findActiveMatching } as never,
    { upsertPending } as never
  );
  return { consumer, findActiveMatching, upsertPending };
}

describe('WebhookDispatcherConsumer delivery proof', () => {
  it('upserts a pending delivery for matching project-scoped subscriptions', async () => {
    const { consumer, findActiveMatching, upsertPending } = buildConsumer();

    await consumer.process(projectScopedEvent());

    expect(findActiveMatching).toHaveBeenCalledTimes(1);
    expect(findActiveMatching).toHaveBeenCalledWith(projectId, 'project.user_added', undefined);
    expect(upsertPending).toHaveBeenCalledWith(eventId, subscriptionId, undefined);
  });

  it('skips an event that is relevant to no project', async () => {
    const { consumer, findActiveMatching, upsertPending } = buildConsumer();

    await consumer.process(
      projectScopedEvent({ scope: { tenant: Tenant.Organization, id: organizationId } })
    );
    await consumer.process(projectScopedEvent({ scope: { tenant: Tenant.System, id: 'system' } }));

    expect(findActiveMatching).not.toHaveBeenCalled();
    expect(upsertPending).not.toHaveBeenCalled();
  });

  it('passes the relay transaction through', async () => {
    const { consumer, findActiveMatching, upsertPending } = buildConsumer();
    const tx = { tx: true };

    await consumer.process(projectScopedEvent(), tx);

    expect(findActiveMatching).toHaveBeenCalledWith(projectId, 'project.user_added', tx);
    expect(upsertPending).toHaveBeenCalledWith(eventId, subscriptionId, tx);
  });
});

describe('WebhookDispatcherConsumer delivery whatever the request scope (ADR 0012)', () => {
  it('delivers an organization-scoped event to the projects the publisher recorded', async () => {
    const { consumer, findActiveMatching, upsertPending } = buildConsumer();

    await consumer.process(
      roleEvent({
        scope: { tenant: Tenant.Organization, id: organizationId },
        projectIds: [projectId],
      })
    );

    expect(findActiveMatching).toHaveBeenCalledWith(projectId, 'role.updated', undefined);
    expect(upsertPending).toHaveBeenCalledWith(eventId, subscriptionId, undefined);
  });

  it('delivers a system-scoped event to the projects the publisher recorded', async () => {
    const { consumer, findActiveMatching } = buildConsumer();

    await consumer.process(
      roleEvent({
        type: 'user.role_assigned',
        scope: { tenant: Tenant.System, id: 'system' },
        projectIds: [projectId],
      })
    );

    expect(findActiveMatching).toHaveBeenCalledWith(projectId, 'user.role_assigned', undefined);
  });

  it('delivers an event from a project-app (projectUser) request to that project', async () => {
    const { consumer, findActiveMatching, upsertPending } = buildConsumer();

    await consumer.process(
      projectScopedEvent({
        type: 'user.password_changed',
        scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
      })
    );

    expect(findActiveMatching).toHaveBeenCalledWith(projectId, 'user.password_changed', undefined);
    expect(upsertPending).toHaveBeenCalledWith(eventId, subscriptionId, undefined);
  });

  it('fans one event out to every linked project, one delivery set per project', async () => {
    const findActiveMatching = vi.fn(async (id: string) =>
      id === projectId ? [{ id: subscriptionId }] : [{ id: otherSubscriptionId }]
    );
    const { consumer, upsertPending } = buildConsumer(findActiveMatching as never);

    await consumer.process(roleEvent({ projectIds: [otherProjectId] }));

    expect(findActiveMatching).toHaveBeenCalledTimes(2);
    expect(upsertPending).toHaveBeenCalledWith(eventId, subscriptionId, undefined);
    expect(upsertPending).toHaveBeenCalledWith(eventId, otherSubscriptionId, undefined);
  });

  it('does not query the same project twice when scope and links name it both', async () => {
    const { consumer, findActiveMatching } = buildConsumer();

    await consumer.process(roleEvent({ projectIds: [projectId, projectId] }));

    expect(findActiveMatching).toHaveBeenCalledTimes(1);
  });

  it('keeps going when a project has no matching subscription', async () => {
    const findActiveMatching = vi.fn(async (id: string) =>
      id === projectId ? [] : [{ id: otherSubscriptionId }]
    );
    const { consumer, upsertPending } = buildConsumer(findActiveMatching as never);

    await consumer.process(roleEvent({ projectIds: [otherProjectId] }));

    expect(upsertPending).toHaveBeenCalledTimes(1);
    expect(upsertPending).toHaveBeenCalledWith(eventId, otherSubscriptionId, undefined);
  });
});

describe('webhookProjectIdsOf', () => {
  it('lists the scope project first, then the recorded ones, without duplicates', () => {
    expect(webhookProjectIdsOf(roleEvent({ projectIds: [otherProjectId, projectId] }))).toEqual([
      projectId,
      otherProjectId,
    ]);
  });

  // A value that is not a uuid would fail the subscription query and abort the
  // whole relay batch on every retry, so it is dropped instead.
  it('ignores ids that are not uuids', () => {
    expect(
      webhookProjectIdsOf(
        roleEvent({
          scope: { tenant: Tenant.ProjectUser, id: 'not-a-uuid:user' },
          projectIds: ['also-not-a-uuid', otherProjectId],
        })
      )
    ).toEqual([otherProjectId]);
  });
});
