import type { GrantAuth } from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@grantjs/database', () => ({
  eventLog: { __table: 'event_log' },
}));

import { DrizzleEventPublisher } from '@/lib/events/drizzle-event-publisher';
import { runWithEventSuppression } from '@/lib/events/event-suppression.lib';

describe('DrizzleEventPublisher event suppression', () => {
  const insert = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue(undefined);
  const db = {
    insert: vi.fn(() => ({ values })),
  };

  beforeEach(() => {
    insert.mockClear();
    values.mockClear();
    db.insert.mockClear();
    db.insert.mockImplementation(() => {
      insert();
      return { values };
    });
  });

  const user = {
    userId: 'user-1',
    scope: { tenant: Tenant.AccountProject, id: 'acct:proj-1' },
  } as GrantAuth;

  it('writes to event_log when not suppressed', async () => {
    const publisher = new DrizzleEventPublisher(user, db as never);

    await publisher.publish({
      type: 'role.created',
      data: { after: { name: 'Admin' } },
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(1);
  });

  it('skips event_log insert when runWithEventSuppression is active', async () => {
    const publisher = new DrizzleEventPublisher(user, db as never);

    await runWithEventSuppression(async () => {
      await publisher.publish({
        type: 'role.created',
        data: { after: { name: 'Admin' } },
      });
    });

    expect(db.insert).not.toHaveBeenCalled();
  });

  it('resumes publishing after suppression ends', async () => {
    const publisher = new DrizzleEventPublisher(user, db as never);

    await runWithEventSuppression(async () => {
      await publisher.publish({
        type: 'role.created',
        data: { after: { name: 'Suppressed' } },
      });
    });

    await publisher.publish({
      type: 'role.created',
      data: { after: { name: 'Visible' } },
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
