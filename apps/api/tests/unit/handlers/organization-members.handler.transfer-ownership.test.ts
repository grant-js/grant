/**
 * Unit tests for OrganizationMembersHandler.transferOwnership: the transfer runs in one
 * transaction, and the cached authorization results of both users are dropped only after it
 * committed (their roles changed, and a user who left loses the organization).
 */
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationMembersHandler } from '@/handlers/organization-members.handler';

const organizationId = '10000000-0000-4000-8000-0000000000b1';
const callerId = '10000000-0000-4000-8000-0000000000b2';
const targetId = '10000000-0000-4000-8000-0000000000b3';
const tx = { tx: true };
const input = {
  scope: { tenant: Tenant.Organization, id: organizationId },
  newOwnerId: targetId,
  previousOwnerRoleId: 'role-admin',
};

function createHandler(transferOwnership: ReturnType<typeof vi.fn>) {
  const cache = {
    permissions: {
      keys: vi.fn(async (pattern: string) => [`${pattern.replace('*', '')}key`]),
      delete: vi.fn(async () => undefined),
    },
  };
  const withTransaction = vi.fn(async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx));
  const handler = new OrganizationMembersHandler(
    { transferOwnership } as never,
    cache as never,
    {} as never,
    { withTransaction } as never
  );
  return { handler, cache, withTransaction };
}

describe('OrganizationMembersHandler.transferOwnership', () => {
  let transferOwnership: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    transferOwnership = vi.fn().mockResolvedValue({ newOwner: { id: targetId } });
  });

  it('runs the service in one transaction and returns its result', async () => {
    const { handler, withTransaction } = createHandler(transferOwnership);

    const result = await handler.transferOwnership(input as never, callerId);

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(transferOwnership).toHaveBeenCalledWith(input, tx);
    expect(result).toEqual({ newOwner: { id: targetId } });
  });

  it('drops the cached authorization results of both the previous and the new owner', async () => {
    const { handler, cache } = createHandler(transferOwnership);

    await handler.transferOwnership(input as never, callerId);

    const patterns = cache.permissions.keys.mock.calls.map(([pattern]) => pattern as string);
    expect(patterns).toHaveLength(2);
    expect(patterns.some((pattern) => pattern.includes(callerId))).toBe(true);
    expect(patterns.some((pattern) => pattern.includes(targetId))).toBe(true);
    expect(cache.permissions.delete).toHaveBeenCalledTimes(2);
  });

  it('drops nothing when the transfer fails', async () => {
    const failure = new Error('refused');
    transferOwnership.mockRejectedValueOnce(failure);
    const { handler, cache } = createHandler(transferOwnership);

    await expect(handler.transferOwnership(input as never, callerId)).rejects.toBe(failure);

    expect(cache.permissions.keys).not.toHaveBeenCalled();
  });
});
