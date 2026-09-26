import type { ILogger } from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackProjectedDomainEvents = vi.fn();

vi.mock('@/config', () => ({
  config: {
    jobs: {
      eventRelay: {
        batchSize: 10,
        maxBatches: 3,
      },
    },
  },
}));

vi.mock('@/lib/analytics', () => ({
  trackProjectedDomainEvents: (...args: unknown[]) => trackProjectedDomainEvents(...args),
}));

vi.mock('@/lib/transaction-manager.lib', () => ({
  DrizzleTransactionalConnection: class {
    async withTransaction<T>(operation: (transaction: unknown) => Promise<T>): Promise<T> {
      return operation({});
    }
  },
}));

const { drainEventRelay } = await import('@/jobs/event-relay.shared');

function logger(): ILogger {
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

describe('drainEventRelay analytics projection', () => {
  beforeEach(() => {
    trackProjectedDomainEvents.mockReset();
    trackProjectedDomainEvents.mockResolvedValue(undefined);
  });

  it('projects events only after the relay transaction resolves', async () => {
    const events = [{ id: 'evt-1', type: 'api_key.created' }];
    const relayBatch = vi.fn().mockResolvedValue({ count: 1, events });
    const log = logger();

    const relayed = await drainEventRelay(
      { db: {}, services: { eventRelay: { relayBatch } } } as never,
      log
    );

    expect(relayed).toBe(1);
    expect(trackProjectedDomainEvents).toHaveBeenCalledTimes(1);
    expect(trackProjectedDomainEvents).toHaveBeenCalledWith(events);
  });

  it('skips projection when the batch is empty', async () => {
    const relayBatch = vi.fn().mockResolvedValue({ count: 0, events: [] });

    const relayed = await drainEventRelay(
      { db: {}, services: { eventRelay: { relayBatch } } } as never,
      logger()
    );

    expect(relayed).toBe(0);
    expect(trackProjectedDomainEvents).not.toHaveBeenCalled();
  });

  it('does not reject the drain when projection throws', async () => {
    trackProjectedDomainEvents.mockRejectedValue(new Error('umami down'));
    const relayBatch = vi.fn().mockResolvedValue({
      count: 1,
      events: [{ id: 'evt-1' }],
    });
    const log = logger();

    await expect(
      drainEventRelay({ db: {}, services: { eventRelay: { relayBatch } } } as never, log)
    ).resolves.toBe(1);
    expect(log.error).toHaveBeenCalled();
  });
});
