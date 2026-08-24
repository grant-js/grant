import type { ILogger } from '@grantjs/core';
import { noopLogger } from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scan: vi.fn(),
  del: vi.fn(),
}));

vi.mock('ioredis', () => ({
  default: class {
    scan = mocks.scan;
    del = mocks.del;
    on() {}
    async quit() {}
  },
}));

const { RedisCacheAdapter } = await import('./index');

/**
 * SCAN de-duplication, driven by a stubbed client because a real Redis cannot be
 * made to return duplicates on demand — it does so only when the keyspace is
 * resized mid-iteration, which is exactly why this would otherwise surface as an
 * occasional, unreproducible CI failure rather than a bug.
 *
 * Lives in the unit lane: no infrastructure, and none needed.
 */
describe('RedisCacheAdapter SCAN de-duplication', () => {
  const prefix = 'grant:cache:';

  beforeEach(() => {
    mocks.scan.mockReset();
    mocks.del.mockReset();
    // Two cursor pages that overlap on "b" — permitted by SCAN's contract, which
    // guarantees each key is returned at least once, not exactly once.
    mocks.scan
      .mockResolvedValueOnce(['1', [`${prefix}a`, `${prefix}b`]])
      .mockResolvedValueOnce(['0', [`${prefix}b`, `${prefix}c`]]);
  });

  const adapter = () =>
    new RedisCacheAdapter({ host: 'h', port: 1, prefix }, noopLogger as ILogger);

  it('returns each key once from keys()', async () => {
    expect((await adapter().keys()).sort()).toEqual(['a', 'b', 'c']);
  });

  it('returns each key once from a prefix-filtered keys()', async () => {
    expect((await adapter().keys('*')).sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not issue a redundant DEL for a duplicated key in clear()', async () => {
    await adapter().clear();

    expect(mocks.del).toHaveBeenCalledTimes(1);
    expect(mocks.del).toHaveBeenCalledWith(`${prefix}a`, `${prefix}b`, `${prefix}c`);
  });
});
