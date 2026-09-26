import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookSubscriptionsHandler } from '@/handlers/webhook-subscriptions.handler';

const trackProductEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/analytics', () => ({
  trackProductEventAfterCommit: (_schedule: unknown, event: unknown) => trackProductEvent(event),
}));

const mockWebhookSubscriptions = { create: vi.fn() };
const mockDb = {
  withTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
};

describe('WebhookSubscriptionsHandler create analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits scope and project id and omits the url and secret', async () => {
    mockWebhookSubscriptions.create.mockResolvedValue({
      id: 'sub-1',
      url: 'https://hooks.example/grant',
      secret: 'super-secret-value',
    });

    const handler = new WebhookSubscriptionsHandler(
      mockWebhookSubscriptions as never,
      {} as never,
      {} as never,
      mockDb as never
    );

    const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' };
    await handler.create(scope, { url: 'https://hooks.example/grant', eventTypes: [] });

    expect(trackProductEvent).toHaveBeenCalledWith({
      name: 'webhook_subscription.created',
      properties: {
        projectId: 'proj-1',
        scopeTenant: Tenant.OrganizationProject,
        scopeId: 'org-1:proj-1',
      },
    });
    const serialized = JSON.stringify(trackProductEvent.mock.calls);
    expect(serialized).not.toContain('super-secret-value');
    expect(serialized).not.toContain('https://hooks.example/grant');
  });
});
