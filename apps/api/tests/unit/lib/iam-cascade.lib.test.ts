import { describe, expect, it } from 'vitest';

import { chunkArray, runInChunks } from '@/lib/iam-cascade.lib';

describe('chunkArray', () => {
  it('splits items into bounded chunks', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('treats a non-positive size as 1', () => {
    expect(chunkArray(['a', 'b'], 0)).toEqual([['a'], ['b']]);
  });
});

describe('runInChunks', () => {
  it('visits every item and never overlaps chunks', async () => {
    const seen: number[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    await runInChunks([1, 2, 3, 4, 5], 2, async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      seen.push(item);
      await Promise.resolve();
      inFlight -= 1;
    });

    expect(seen).toEqual([1, 2, 3, 4, 5]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
