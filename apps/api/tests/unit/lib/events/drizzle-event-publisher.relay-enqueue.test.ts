import type { GrantAuth, IJobAdapter } from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@grantjs/database', () => ({
  eventLog: { __table: 'event_log' },
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
});
