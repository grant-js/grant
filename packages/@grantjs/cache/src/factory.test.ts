import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(async (_key: string) => null),
}));

vi.mock('ioredis', () => ({
  default: class {
    get = mocks.get;
    on() {}
    async quit() {}
  },
}));

const { CacheFactory } = await import('./factory');

describe('CacheFactory redis key prefix', () => {
  const keyRead = async (prefix?: string) => {
    mocks.get.mockClear();
    const cache = CacheFactory.createEntityCache({
      strategy: 'redis',
      redis: { host: 'h', port: 1, prefix },
    });
    await cache.users.get('u1' as never);
    return mocks.get.mock.calls[0]?.[0];
  };

  it('namespaces keys under grant: by default', async () => {
    expect(await keyRead()).toBe('grant:users:u1');
  });

  it('namespaces keys under the configured prefix', async () => {
    expect(await keyRead('grant-logus:')).toBe('grant-logus:users:u1');
  });
});
