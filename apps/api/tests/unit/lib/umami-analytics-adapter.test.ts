import { UmamiAnalyticsAdapter } from '@grantjs/analytics';
import type { ILogger } from '@grantjs/core';
import { noopLogger } from '@grantjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

function mockLogger(): ILogger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
}

describe('UmamiAnalyticsAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts a custom event with opaque ids in data and no visitor id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new UmamiAnalyticsAdapter(
      { apiUrl: 'http://umami.test/', websiteId: 'site-1', hostname: 'demo' },
      noopLogger
    );

    await adapter.trackEvent({
      name: 'session.started',
      category: 'auth',
      userId: 'user-1',
      accountId: 'acct-1',
      organizationId: 'org-1',
      requestId: 'req-1',
      properties: { provider: 'email', stepUpRequired: false },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://umami.test/api/send');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'User-Agent': 'Grant-API/1.0 (Analytics)',
    });

    const body = JSON.parse(init.body as string) as {
      type: string;
      payload: Record<string, unknown>;
    };
    expect(body.type).toBe('event');
    expect(body.payload).toMatchObject({
      website: 'site-1',
      name: 'session.started',
      hostname: 'demo',
      url: '/',
      title: 'auth',
      tag: 'auth',
    });
    expect(body.payload.id).toBeUndefined();
    expect(body.payload.data).toEqual({
      provider: 'email',
      stepUpRequired: false,
      actorId: 'user-1',
      accountId: 'acct-1',
      organizationId: 'org-1',
      requestId: 'req-1',
    });
  });

  it('does not throw when Umami rejects the request', async () => {
    const logger = mockLogger();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    const adapter = new UmamiAnalyticsAdapter(
      { apiUrl: 'http://umami.test', websiteId: 'site-1' },
      logger
    );

    await expect(adapter.trackEvent({ name: 'session.failed' })).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('does not throw when the send fails', async () => {
    const logger = mockLogger();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const adapter = new UmamiAnalyticsAdapter(
      { apiUrl: 'http://umami.test', websiteId: 'site-1' },
      logger
    );

    await expect(adapter.trackEvent({ name: 'session.failed' })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
