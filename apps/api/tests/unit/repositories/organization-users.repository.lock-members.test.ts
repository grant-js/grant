/**
 * Ownership transfers serialize on one locking read: the live memberships of the two users,
 * `FOR UPDATE`, in user-id order so two transfers never lock in opposite orders. The query is
 * captured and rendered; what is asserted is its shape, not a database.
 */
import type { DbSchema } from '@grantjs/database';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { OrganizationUserRepository } from '@/repositories/organization-users.repository';

const organizationId = '10000000-0000-4000-8000-0000000000d1';
const first = '10000000-0000-4000-8000-0000000000d2';
const second = '10000000-0000-4000-8000-0000000000d3';

function fakeDb(rows: unknown[]) {
  const captured: { where?: unknown; orderBy?: unknown[]; lock?: unknown[] } = {};
  const builder = {
    from: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    where: vi.fn((condition: unknown) => {
      captured.where = condition;
      return builder;
    }),
    orderBy: vi.fn((...order: unknown[]) => {
      captured.orderBy = order;
      return builder;
    }),
    for: vi.fn(async (...lock: unknown[]) => {
      captured.lock = lock;
      return rows;
    }),
  };
  const db = { select: vi.fn(() => builder) } as unknown as DbSchema;
  return { db, builder, captured };
}

describe('OrganizationUserRepository.lockMembersForUpdate', () => {
  it('locks the live memberships of the given users in this organization, FOR UPDATE of organization_users', async () => {
    const rows = [{ userId: first, roleId: 'r1', userDeletedAt: null }];
    const { db, captured } = fakeDb(rows);

    const result = await new OrganizationUserRepository(db).lockMembersForUpdate({
      organizationId,
      userIds: [second, first],
    });

    expect(result).toBe(rows);
    const query = new PgDialect().sqlToQuery(captured.where as never);
    expect(query.sql).toContain('"organization_users"."organization_id" = $1');
    expect(query.sql).toContain('"organization_users"."user_id" in ($2, $3)');
    expect(query.sql).toContain('"organization_users"."deleted_at" is null');
    expect(query.params).toEqual([organizationId, second, first]);
    expect(captured.lock?.[0]).toBe('update');
    expect(captured.lock?.[1]).toMatchObject({ of: expect.anything() });
  });

  it('orders the lock by user id', async () => {
    const { db, captured } = fakeDb([]);

    await new OrganizationUserRepository(db).lockMembersForUpdate({
      organizationId,
      userIds: [second, first],
    });

    const order = captured.orderBy?.map((entry) => new PgDialect().sqlToQuery(entry as never).sql);
    expect(order).toEqual(['"organization_users"."user_id" asc']);
  });

  it('reads nothing for an empty list', async () => {
    const { db } = fakeDb([]);

    await expect(
      new OrganizationUserRepository(db).lockMembersForUpdate({ organizationId, userIds: [] })
    ).resolves.toEqual([]);
    expect((db as unknown as { select: ReturnType<typeof vi.fn> }).select).not.toHaveBeenCalled();
  });

  it('runs inside the transaction it is given, not the pool', async () => {
    const pool = fakeDb([]);
    const transaction = fakeDb([]);

    await new OrganizationUserRepository(pool.db).lockMembersForUpdate(
      { organizationId, userIds: [first] },
      transaction.db as never
    );

    expect(
      (pool.db as unknown as { select: ReturnType<typeof vi.fn> }).select
    ).not.toHaveBeenCalled();
    expect(
      (transaction.db as unknown as { select: ReturnType<typeof vi.fn> }).select
    ).toHaveBeenCalledTimes(1);
  });
});
