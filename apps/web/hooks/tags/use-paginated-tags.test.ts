import { Tenant } from '@grantjs/schema';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePaginatedTags } from './use-paginated-tags';

/**
 * Regression test for code-quality/web.md finding 0.3: `use-tags.ts` used to drop the
 * server-computed `hasNextPage` entirely, and `usePaginatedTags` recomputed it independently
 * via `page * pageSize < totalCount`. That formula and the server's real signal can disagree
 * (e.g. hidden/synthetic entities counted in `totalCount` but not returned as `tags`) -- this
 * test picks exactly that disagreement to prove the value now comes from the server, not a
 * client-side recompute: `page * pageSize < totalCount` is `false` here, but the mocked
 * `hasNextPage` is `true`, so a passing assertion of `true` can only be explained by
 * propagation, not recomputation.
 */

const useTagsMock = vi.fn();
vi.mock('./use-tags', () => ({
  useTags: (...args: unknown[]) => useTagsMock(...args),
}));

describe('usePaginatedTags', () => {
  it('uses the server-computed hasNextPage rather than recomputing it from page/pageSize/totalCount', () => {
    useTagsMock.mockReturnValue({
      tags: [],
      loading: false,
      error: undefined,
      totalCount: 40, // page(1) * pageSize(50) = 50, so the old `50 < 40` formula would be false
      hasNextPage: true, // ...but the server says there is more.
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePaginatedTags({
        scope: { tenant: Tenant.Account, id: 'account-1' },
        search: '',
        pageSize: 50,
      })
    );

    expect(result.current.hasNextPage).toBe(true);
  });

  it('still resolves to false when the server says there is nothing more', () => {
    useTagsMock.mockReturnValue({
      tags: [],
      loading: false,
      error: undefined,
      totalCount: 200,
      hasNextPage: false,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePaginatedTags({
        scope: { tenant: Tenant.Account, id: 'account-1' },
        search: '',
        pageSize: 50,
      })
    );

    expect(result.current.hasNextPage).toBe(false);
  });
});
