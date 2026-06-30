import type { IEventConsumer } from '@grantjs/core';
import type { EventLogModel } from '@grantjs/database';
import { describe, expect, it, vi } from 'vitest';

import { EventRelayService } from '@/services/event-relay.service';

function eventRow(overrides: Partial<EventLogModel> = {}): EventLogModel {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    sequence: 1,
    type: 'role.created',
    category: 'iam',
    deliveryClass: 'notification',
    scopeTenant: 'organization',
    scopeId: 'org-1',
    actorUserId: 'user-1',
    subjectUserId: null,
    payload: { aggregate: { kind: 'role', id: 'role-1' }, data: { after: { id: 'role-1' } } },
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    relayStatus: 'pending',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('EventRelayService', () => {
  it('claims a batch, runs every consumer, then marks the batch dispatched', async () => {
    const rows = [eventRow(), eventRow({ id: 'id-2', sequence: 2 })];
    const repo = {
      claimPendingBatch: vi.fn().mockResolvedValue(rows),
      markDispatched: vi.fn().mockResolvedValue(undefined),
      countPending: vi.fn(),
    };
    const consumerA: IEventConsumer = { name: 'a', process: vi.fn().mockResolvedValue(undefined) };
    const consumerB: IEventConsumer = { name: 'b', process: vi.fn().mockResolvedValue(undefined) };

    const service = new EventRelayService(repo as never, [consumerA, consumerB]);
    const tx = {} as never;

    const processed = await service.relayBatch(tx, 100);

    expect(processed).toBe(2);
    expect(repo.claimPendingBatch).toHaveBeenCalledWith(100, tx);
    expect(consumerA.process).toHaveBeenCalledTimes(2);
    expect(consumerB.process).toHaveBeenCalledTimes(2);
    expect(repo.markDispatched).toHaveBeenCalledWith([rows[0].id, 'id-2'], tx);
  });

  it('returns 0 and does not mark anything when the outbox is empty', async () => {
    const repo = {
      claimPendingBatch: vi.fn().mockResolvedValue([]),
      markDispatched: vi.fn(),
      countPending: vi.fn(),
    };
    const service = new EventRelayService(repo as never, []);

    const processed = await service.relayBatch({} as never, 100);

    expect(processed).toBe(0);
    expect(repo.markDispatched).not.toHaveBeenCalled();
  });

  it('maps stored rows into domain events for consumers', async () => {
    const row = eventRow();
    const repo = {
      claimPendingBatch: vi.fn().mockResolvedValue([row]),
      markDispatched: vi.fn().mockResolvedValue(undefined),
      countPending: vi.fn(),
    };
    const process = vi.fn().mockResolvedValue(undefined);
    const service = new EventRelayService(repo as never, [{ name: 'c', process }]);

    await service.relayBatch({} as never, 10);

    expect(process).toHaveBeenCalledTimes(1);
    const event = process.mock.calls[0][0];
    expect(event).toMatchObject({
      id: row.id,
      type: 'role.created',
      category: 'iam',
      scope: { tenant: 'organization', id: 'org-1' },
      aggregate: { kind: 'role', id: 'role-1' },
    });
  });
});
