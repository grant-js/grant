import type { GrantAuth, IJobAdapter } from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@grantjs/database', () => ({
  eventLog: { __table: 'event_log' },
}));

const { loggerError } = vi.hoisted(() => ({ loggerError: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: loggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

const enqueue = vi.fn().mockResolvedValue(undefined);
const getJobAdapter = vi.fn((): IJobAdapter | null => ({ enqueue }) as unknown as IJobAdapter);

vi.mock('@/lib/jobs/initialize', () => ({
  getJobAdapter: () => getJobAdapter(),
}));

import { EVENT_RELAY_JOB_ID } from '@/constants/event-relay.constants';
import { DrizzleEventPublisher } from '@/lib/events/drizzle-event-publisher';

describe('DrizzleEventPublisher post-commit relay enqueue', () => {
  const values = vi.fn().mockResolvedValue(undefined);
  const db = {
    insert: vi.fn(() => ({ values })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getJobAdapter.mockReturnValue({ enqueue } as unknown as IJobAdapter);
  });

  const user = {
    userId: 'user-1',
    scope: { tenant: Tenant.AccountProject, id: 'acct:proj-1' },
  } as GrantAuth;

  it('does not enqueue until scheduleAfterCommit runs (coalesced once per instance)', async () => {
    const deferred: Array<() => void | Promise<void>> = [];
    const scheduleAfterCommit = (fn: () => void | Promise<void>) => {
      deferred.push(fn);
    };

    const publisher = new DrizzleEventPublisher(user, db as never, { scheduleAfterCommit });

    await publisher.publish({
      type: 'role.created',
      data: { after: { name: 'Admin' } },
    });
    await publisher.publish({
      type: 'role.updated',
      data: { after: { name: 'Admin' } },
    });

    expect(enqueue).not.toHaveBeenCalled();
    expect(deferred).toHaveLength(1);

    await Promise.resolve(deferred[0]?.());

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith(EVENT_RELAY_JOB_ID);
  });

  it('skips scheduling when scheduleAfterCommit is not provided', async () => {
    const publisher = new DrizzleEventPublisher(user, db as never);

    await publisher.publish({
      type: 'role.created',
      data: { after: { name: 'Admin' } },
    });

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('hands the after-commit runner a promise that settles only once the enqueue has', async () => {
    let finishEnqueue!: () => void;
    enqueue.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishEnqueue = resolve;
      })
    );
    const deferred: Array<() => void | Promise<void>> = [];
    const publisher = new DrizzleEventPublisher(user, db as never, {
      scheduleAfterCommit: (fn) => {
        deferred.push(fn);
      },
    });
    await publisher.publish({ type: 'role.created', data: { after: { name: 'Admin' } } });

    let settled = false;
    const running = Promise.resolve(deferred[0]?.()).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    finishEnqueue();
    await running;
    expect(settled).toBe(true);
  });

  it('logs and swallows a failed relay enqueue', async () => {
    const sendFailure = new Error('SQS down');
    enqueue.mockRejectedValueOnce(sendFailure);
    const deferred: Array<() => void | Promise<void>> = [];
    const publisher = new DrizzleEventPublisher(user, db as never, {
      scheduleAfterCommit: (fn) => {
        deferred.push(fn);
      },
    });
    await publisher.publish({ type: 'role.created', data: { after: { name: 'Admin' } } });

    await expect(Promise.resolve(deferred[0]?.())).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Failed to enqueue event-relay after publish',
        err: sendFailure,
      })
    );
  });
});
