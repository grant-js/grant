import type { DbSchema } from '@grantjs/database';
import { describe, expect, it, vi } from 'vitest';

import { WebhookDeliveryRepository } from '@/repositories/webhook-deliveries.repository';

/**
 * Regression: listForProject over-fetched `limit + 1` rows to derive hasNextPage,
 * then dropped the value — forcing the service to recompute it from a separate
 * count(*) with a different formula. The over-fetch is the authoritative signal
 * because it reflects the same snapshot as the page.
 */

function buildDb(deliveryRows: Array<{ id: string }>, totalCount: number) {
  const pageChain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    offset: vi.fn(),
    limit: vi.fn(),
  };
  pageChain.from.mockReturnValue(pageChain);
  pageChain.innerJoin.mockReturnValue(pageChain);
  pageChain.where.mockReturnValue(pageChain);
  pageChain.orderBy.mockReturnValue(pageChain);
  pageChain.offset.mockReturnValue(pageChain);
  pageChain.limit.mockResolvedValue(deliveryRows.map((delivery) => ({ delivery })));

  const countChain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  };
  countChain.from.mockReturnValue(countChain);
  countChain.innerJoin.mockReturnValue(countChain);
  countChain.where.mockResolvedValue([{ count: totalCount }]);

  const select = vi.fn().mockReturnValueOnce(pageChain).mockReturnValueOnce(countChain);
  return { db: { select } as unknown as DbSchema, pageChain };
}

const projectId = '10000000-0000-4000-8000-000000000011';
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `delivery-${i}` }));

describe('WebhookDeliveryRepository.listForProject pagination', () => {
  it('over-fetches one row and reports hasNextPage true when it comes back', async () => {
    // 3 requested, 4 returned → a further page exists
    const { db, pageChain } = buildDb(rows(4), 10);
    const repo = new WebhookDeliveryRepository(db);

    const result = await repo.listForProject(projectId, { offset: 0, limit: 3 });

    expect(pageChain.limit).toHaveBeenCalledWith(4);
    expect(result.hasNextPage).toBe(true);
    expect(result.rows).toHaveLength(3);
    expect(result.totalCount).toBe(10);
  });

  it('reports hasNextPage false when the over-fetched row is absent', async () => {
    const { db } = buildDb(rows(3), 3);
    const repo = new WebhookDeliveryRepository(db);

    const result = await repo.listForProject(projectId, { offset: 0, limit: 3 });

    expect(result.hasNextPage).toBe(false);
    expect(result.rows).toHaveLength(3);
  });

  it('trusts the over-fetch over a stale count(*) that disagrees', async () => {
    // count(*) says more rows exist, but the page query — same snapshot — says otherwise.
    const { db } = buildDb(rows(2), 99);
    const repo = new WebhookDeliveryRepository(db);

    const result = await repo.listForProject(projectId, { offset: 0, limit: 3 });

    expect(result.hasNextPage).toBe(false);
    expect(result.totalCount).toBe(99);
  });
});
