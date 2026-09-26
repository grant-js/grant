import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/analytics/get-analytics-adapter', () => ({
  getAnalyticsAdapter: () => ({ trackEvent }),
}));

const { trackProductEvent, trackProductEventAfterCommit, trackProjectedDomainEvents } =
  await import('@/lib/analytics/track-product-event');

function domainEvent(type: DomainEvent['type']): DomainEvent {
  return {
    id: 'evt-1',
    sequence: 1,
    type,
    category: 'security',
    deliveryClass: 'notification',
    scope: { tenant: Tenant.Organization, id: 'org-1' },
    actorUserId: 'actor-1',
    subjectUserId: null,
    data: { after: { email: 'leak-email@example.com' } },
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('trackProjectedDomainEvents', () => {
  beforeEach(() => {
    trackEvent.mockReset();
    trackEvent.mockResolvedValue(undefined);
  });

  it('sends allowlisted events and skips the rest', async () => {
    await trackProjectedDomainEvents([domainEvent('api_key.created'), domainEvent('role.created')]);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'api_key.created',
        category: 'security',
        organizationId: 'org-1',
        userId: 'actor-1',
      })
    );
    expect(JSON.stringify(trackEvent.mock.calls)).not.toContain('leak-email');
  });

  it('sends a deferred event only when the commit hook runs', () => {
    let queued: (() => void) | undefined;
    trackProductEventAfterCommit(
      (fn) => {
        queued = fn as () => void;
      },
      {
        name: 'project.created',
        properties: { projectId: 'proj-1', scopeTenant: 'organization', scopeId: 'org-1' },
      }
    );

    expect(trackEvent).not.toHaveBeenCalled();
    queued?.();
    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'project.created', category: 'activation' })
    );
  });

  it('drops property keys outside the closed set', () => {
    trackProductEvent({
      name: 'organization.created',
      properties: {
        scopeTenant: Tenant.Organization,
        scopeId: 'org-1',
        actorId: 'actor-1',
        email: 'leak-email@example.com',
      } as never,
    });

    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: {
          scopeTenant: Tenant.Organization,
          scopeId: 'org-1',
          actorId: 'actor-1',
        },
      })
    );
  });

  it('resolves when the adapter rejects an event', async () => {
    trackEvent.mockRejectedValue(new Error('umami down'));

    await expect(
      trackProjectedDomainEvents([domainEvent('api_key.revoked')])
    ).resolves.toBeUndefined();
  });
});
