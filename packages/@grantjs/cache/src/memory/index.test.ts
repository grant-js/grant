import { describe, expect, it } from 'vitest';

import { runCacheAdapterConformance } from '../conformance-suite';
import { InMemoryCacheAdapter } from './index';

runCacheAdapterConformance(
  'InMemoryCacheAdapter',
  { create: () => new InMemoryCacheAdapter() },
  // Holds the caller's object graph directly — no JSON round trip.
  { serializes: false }
);

/**
 * Divergences from the serializing adapters, pinned here rather than in the shared
 * suite. These are not defects; they are the consequences of storing references,
 * and they are recorded so a future adapter author chooses deliberately.
 * See the divergence index at the foot of ../conformance-suite.ts.
 */
describe('InMemoryCacheAdapter — documented divergences', () => {
  it('returns a live reference, so later mutation is visible through the cache', async () => {
    const cache = new InMemoryCacheAdapter();
    const mutable = { items: ['one'] };

    await cache.set('snapshot', mutable);
    mutable.items.push('two');

    expect(await cache.get<{ items: string[] }>('snapshot')).toEqual({ items: ['one', 'two'] });
  });

  it('returns an array of strings as an array, not a Set', async () => {
    const cache = new InMemoryCacheAdapter();

    await cache.set('list', ['a', 'b']);

    expect(await cache.get<unknown>('list')).toEqual(['a', 'b']);
  });

  it('preserves Date instances', async () => {
    const cache = new InMemoryCacheAdapter();
    const when = new Date('2026-08-21T00:00:00.000Z');

    await cache.set('at', { when });

    expect((await cache.get<{ when: unknown }>('at'))?.when).toBeInstanceOf(Date);
  });

  it('drops all data on disconnect()', async () => {
    const cache = new InMemoryCacheAdapter();
    await cache.set('k', 'v');

    await cache.disconnect();

    expect(await cache.get('k')).toBeNull();
  });
});
