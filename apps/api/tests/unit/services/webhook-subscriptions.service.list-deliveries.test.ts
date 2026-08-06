import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { WebhookSubscriptionService } from '@/services/webhook-subscriptions.service';

/**
 * Regression: listDeliveries recomputed hasNextPage as `offset + rows.length < totalCount`
 * against a separately-queried count(*), ignoring the authoritative value the repository
 * already derived from its over-fetch.
 */

const projectId = '10000000-0000-4000-8000-000000000011';
const scope = { tenant: Tenant.OrganizationProject, id: `org-id:${projectId}` };

function buildService(listResult: {
  rows: Array<Record<string, unknown>>;
  totalCount: number;
  hasNextPage: boolean;
}) {
  const listForProject = vi.fn().mockResolvedValue(listResult);
  const service = new WebhookSubscriptionService(
    {} as never,
    { listForProject } as never,
    {} as never,
    null
  );
  return { service, listForProject };
}

const deliveryRow = (id: string) => ({
  id,
  subscriptionId: 'sub-1',
  eventId: 'evt-1',
  status: 'delivered',
  attempt: 1,
  responseStatus: 200,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deliveredAt: new Date(),
  nextAttemptAt: null,
});

describe('WebhookSubscriptionService.listDeliveries pagination', () => {
  it('returns the repository hasNextPage verbatim', async () => {
    const { service } = buildService({
      rows: [deliveryRow('d-1'), deliveryRow('d-2')],
      totalCount: 2,
      hasNextPage: true,
    });

    const page = await service.listDeliveries({ scope, projectId, page: 1, limit: 2 } as never);

    // The old formula (0 + 2 < 2) would have produced false here.
    expect(page.hasNextPage).toBe(true);
    expect(page.totalCount).toBe(2);
    expect(page.items).toHaveLength(2);
  });

  it('reports no next page even when totalCount exceeds the rows seen so far', async () => {
    const { service } = buildService({
      rows: [deliveryRow('d-1')],
      totalCount: 99,
      hasNextPage: false,
    });

    const page = await service.listDeliveries({ scope, projectId, page: 1, limit: 25 } as never);

    // The old formula (0 + 1 < 99) would have produced true here.
    expect(page.hasNextPage).toBe(false);
  });

  it('passes the derived offset and clamped limit to the repository', async () => {
    const { service, listForProject } = buildService({
      rows: [],
      totalCount: 0,
      hasNextPage: false,
    });

    await service.listDeliveries({ scope, projectId, page: 3, limit: 500 } as never);

    expect(listForProject).toHaveBeenCalledWith(
      projectId,
      expect.objectContaining({ offset: 200, limit: 100 }),
      undefined
    );
  });
});
