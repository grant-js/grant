import type { GrantAuth } from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@grantjs/database', () => ({
  eventLog: { __table: 'event_log' },
}));

import { config } from '@/config';
import { DrizzleEventPublisher } from '@/lib/events/drizzle-event-publisher';
import { runWithOutboxBatch } from '@/lib/events/event-outbox-batch.lib';

describe('DrizzleEventPublisher.publishMany', () => {
  const values = vi.fn().mockResolvedValue(undefined);
  const db = {
    insert: vi.fn(() => ({ values })),
  };

  beforeEach(() => {
    values.mockClear();
    db.insert.mockClear();
  });

  const user = {
    userId: 'user-1',
    scope: { tenant: Tenant.AccountProject, id: 'acct:proj-1' },
  } as GrantAuth;

  it('inserts every event in one statement and does not drop any', async () => {
    const publisher = new DrizzleEventPublisher(user, db as never);

    await publisher.publishMany([
      { type: 'role.created', data: { after: { name: 'A' } } },
      { type: 'role.created', data: { after: { name: 'B' } } },
      { type: 'role.created', data: { after: { name: 'C' } } },
    ]);

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(values.mock.calls[0][0]).toHaveLength(3);
  });

  it('is a no-op for an empty list', async () => {
    const publisher = new DrizzleEventPublisher(user, db as never);

    await publisher.publishMany([]);

    expect(db.insert).not.toHaveBeenCalled();
  });

  it('buffers publish() calls inside runWithOutboxBatch into one insert', async () => {
    const publisher = new DrizzleEventPublisher(user, db as never);

    await runWithOutboxBatch(undefined, async () => {
      await publisher.publish({ type: 'role.created', data: { after: { name: 'A' } } });
      await publisher.publish({ type: 'role.created', data: { after: { name: 'B' } } });
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(values.mock.calls[0][0]).toHaveLength(2);
  });

  it('does not insert a batch when the work throws', async () => {
    const publisher = new DrizzleEventPublisher(user, db as never);

    await expect(
      runWithOutboxBatch(undefined, async () => {
        await publisher.publish({ type: 'role.created', data: { after: { name: 'A' } } });
        throw new Error('cascade failed');
      })
    ).rejects.toThrow('cascade failed');

    expect(db.insert).not.toHaveBeenCalled();
  });

  it('chunks the insert so a large publishMany still writes every row', async () => {
    const publisher = new DrizzleEventPublisher(user, db as never);
    const chunkSize = config.system.iamCascadeChunkSize;
    const events = Array.from({ length: chunkSize + 1 }, (_, index) => ({
      type: 'role.created' as const,
      data: { after: { name: `R${index}` } },
    }));

    await publisher.publishMany(events);

    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(values.mock.calls[0][0]).toHaveLength(chunkSize);
    expect(values.mock.calls[1][0]).toHaveLength(1);
  });
});
