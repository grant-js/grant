import type { ICacheAdapter } from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OAuthStateService } from '@/services/oauth-state.service';

describe('OAuthStateService', () => {
  let cache: ICacheAdapter;
  let setMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setMock = vi.fn().mockResolvedValue(undefined);
    cache = {
      get: vi.fn().mockResolvedValue(null),
      set: setMock,
      has: vi.fn().mockResolvedValue(false),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockResolvedValue([]),
      disconnect: vi.fn().mockResolvedValue(undefined),
    } as unknown as ICacheAdapter;
  });

  it('passes ttlSeconds through to cache.set so Redis/memory can expire keys', async () => {
    const service = new OAuthStateService(cache);
    const state = {
      state: 'csrf-token-abc',
      createdAt: Date.now(),
    };

    await service.storeState(state, 120);

    expect(setMock).toHaveBeenCalledTimes(1);
    const [, , ttl] = setMock.mock.calls[0]!;
    expect(ttl).toBe(120);
  });

  it('does not register a cleanup interval (createServices is per-request)', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    new OAuthStateService(cache);
    new OAuthStateService(cache);
    new OAuthStateService(cache);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });
});
