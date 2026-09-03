import { Tenant } from '@grantjs/schema';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Regression test for the infinite render loop that took down the webhook detail page
 * with React error #185 ("maximum update depth exceeded").
 *
 * `WebhookDeliveriesViewer` uses `deliveries` and `refetch` as `useEffect`
 * dependencies whose bodies write into `useWebhookDeliveriesStore`. When either had a
 * fresh identity per render, the effect re-fired every render, the store update
 * re-rendered `WebhookDeliveriesCard`, and the card re-rendered the viewer — a loop
 * with no fixed point.
 *
 * So identity is the contract, not an optimization, and the assertion is deliberately
 * on `toBe` (reference equality) rather than `toEqual`: the old code returned values
 * that were `toEqual` across renders and still looped.
 *
 * The `?? []` case is the one that shipped: it allocates a new array on every render
 * where the query has no data, which is every render during the initial load.
 */

const useQueryMock = vi.fn();
vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: () => [vi.fn(), { loading: false }],
}));

vi.mock('./cache', () => ({ evictWebhooksCache: vi.fn() }));

const { useWebhookDeliveries } = await import('./use-webhook-deliveries');

const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };

function renderTwice(queryResult: Record<string, unknown>) {
  useQueryMock.mockReturnValue(queryResult);
  const { result, rerender } = renderHook(() =>
    useWebhookDeliveries({ scope, subscriptionId: 'sub-1', page: 1, limit: 20 })
  );
  const first = result.current;
  rerender();
  return { first, second: result.current };
}

describe('useWebhookDeliveries identity stability', () => {
  it('returns the same deliveries array across renders while the query has no data', () => {
    // The loop as it actually shipped: `data?.webhookDeliveries?.items ?? []` produced
    // a new array every render, so the viewer's effect never stopped firing.
    const { first, second } = renderTwice({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    });

    expect(second.deliveries).toBe(first.deliveries);
  });

  it('returns the same deliveries array across renders once data has arrived', () => {
    const items = [{ id: 'delivery-1' }];
    const { first, second } = renderTwice({
      data: { webhookDeliveries: { items, totalCount: 1, hasNextPage: false } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    expect(second.deliveries).toBe(first.deliveries);
    expect(second.deliveries).toEqual(items);
  });

  it('returns the same refetch function across renders', () => {
    // The second half of the loop, and the harder one to see: the hook returned a
    // fresh `async () => {}` every render, which the viewer wrapped in a `useCallback`
    // keyed on it and then wrote into the store from an effect.
    const { first, second } = renderTwice({
      data: { webhookDeliveries: { items: [], totalCount: 0, hasNextPage: false } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    expect(second.refetch).toBe(first.refetch);
  });

  it('still reports the server-provided counts', () => {
    const { first } = renderTwice({
      data: { webhookDeliveries: { items: [], totalCount: 7, hasNextPage: true } },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    expect(first.totalCount).toBe(7);
    expect(first.hasNextPage).toBe(true);
  });
});
