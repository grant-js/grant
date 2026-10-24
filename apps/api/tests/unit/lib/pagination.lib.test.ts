import { describe, expect, it } from 'vitest';

import { clampPageLimit, hasNextPageByCount, takePage, unboundedList } from '@/lib/pagination.lib';

/**
 * These lock in the behaviour of the four call sites this helper replaced, so a
 * later "simplification" of the formula has to break a test rather than a page.
 * The three count-based sites each spelled the same comparison differently
 * (`page * limit < totalCount`, `totalCount > page * limit`) and each guarded
 * the unlimited case with a different sentinel — `undefined`, and `0`.
 */
describe('hasNextPageByCount', () => {
  it('reports a next page while the window ends before the total', () => {
    expect(hasNextPageByCount({ page: 1, limit: 10, totalCount: 25 })).toBe(true);
    expect(hasNextPageByCount({ page: 2, limit: 10, totalCount: 25 })).toBe(true);
  });

  it('reports no next page on the last and past-the-end pages', () => {
    expect(hasNextPageByCount({ page: 3, limit: 10, totalCount: 25 })).toBe(false);
    expect(hasNextPageByCount({ page: 9, limit: 10, totalCount: 25 })).toBe(false);
  });

  it('treats an exactly-full final page as the last one', () => {
    expect(hasNextPageByCount({ page: 2, limit: 10, totalCount: 20 })).toBe(false);
  });

  // EntityRepository passed `undefined` for unlimited; project-sync-job passed 0.
  // Both meant "every row is on this page", and both must stay false.
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['zero', 0],
  ])('reports no next page when the limit is %s', (_label, limit) => {
    expect(hasNextPageByCount({ page: 1, limit, totalCount: 500 })).toBe(false);
  });

  it('reports no next page for an empty result set', () => {
    expect(hasNextPageByCount({ page: 1, limit: 10, totalCount: 0 })).toBe(false);
  });
});

describe('takePage', () => {
  it('trims the probe row and reports a next page', () => {
    const rows = [1, 2, 3, 4];

    expect(takePage(rows, 3)).toEqual({ rows: [1, 2, 3], hasNextPage: true });
  });

  it('keeps a short page whole and reports no next page', () => {
    expect(takePage([1, 2], 3)).toEqual({ rows: [1, 2], hasNextPage: false });
  });

  it('treats an exactly-full page without a probe row as the last one', () => {
    expect(takePage([1, 2, 3], 3)).toEqual({ rows: [1, 2, 3], hasNextPage: false });
  });

  it('handles an empty page', () => {
    expect(takePage([], 3)).toEqual({ rows: [], hasNextPage: false });
  });

  it('does not alias the caller array', () => {
    const rows = [1, 2];
    const page = takePage(rows, 5);

    page.rows.push(3);

    expect(rows).toEqual([1, 2]);
  });
});

describe('clampPageLimit', () => {
  const bounds = { defaultPageSize: 50, maxPageSize: 100 };

  it('uses the default when limit is missing', () => {
    expect(clampPageLimit(undefined, bounds)).toBe(50);
    expect(clampPageLimit(null, bounds)).toBe(50);
  });

  it('caps -1 and values above max to maxPageSize', () => {
    expect(clampPageLimit(-1, bounds)).toBe(100);
    expect(clampPageLimit(1000, bounds)).toBe(100);
  });

  it('keeps an in-range positive limit', () => {
    expect(clampPageLimit(25, bounds)).toBe(25);
    expect(clampPageLimit(100, bounds)).toBe(100);
  });

  it('replaces non-positive values other than -1 with the default', () => {
    expect(clampPageLimit(0, bounds)).toBe(50);
    expect(clampPageLimit(-5, bounds)).toBe(50);
  });

  it('leaves -1 unlimited when unbounded is set', () => {
    expect(clampPageLimit(-1, { ...bounds, unbounded: true })).toBeUndefined();
    expect(clampPageLimit(undefined, { ...bounds, unbounded: true })).toBeUndefined();
    expect(clampPageLimit(12, { ...bounds, unbounded: true })).toBe(12);
  });
});

describe('unboundedList', () => {
  it('sets unbounded on the same object without changing the public type', () => {
    const args = { ids: ['a'], limit: -1 };
    const marked = unboundedList(args);

    expect(marked).toBe(args);
    expect((marked as { unbounded?: boolean }).unbounded).toBe(true);
  });
});
