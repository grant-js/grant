import type { GrantAuth } from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@grantjs/database', () => ({
  eventLog: { __table: 'event_log' },
}));

import { DrizzleEventPublisher } from '@/lib/events/drizzle-event-publisher';
import type { ProjectLinksRepository } from '@/repositories/project-links.repository';

const projectA = '10000000-0000-4000-8000-0000000000a1';
const projectB = '10000000-0000-4000-8000-0000000000b2';
const projectC = '10000000-0000-4000-8000-0000000000c3';

describe('DrizzleEventPublisher project links (ADR 0012)', () => {
  const values = vi.fn().mockResolvedValue(undefined);
  const db = { insert: vi.fn(() => ({ values })) };
  const getLinkedProjectIds = vi.fn();
  const getUserProjectIds = vi.fn();
  const projectLinks = {
    getLinkedProjectIds,
    getUserProjectIds,
  } as unknown as ProjectLinksRepository;

  const orgUser = {
    userId: 'user-1',
    scope: { tenant: Tenant.Organization, id: 'org-1' },
  } as GrantAuth;

  const publisher = () => new DrizzleEventPublisher(orgUser, db as never, { projectLinks });
  const storedRow = () => {
    const arg = values.mock.calls[0]?.[0];
    const row = Array.isArray(arg) ? arg[0] : arg;
    return row as { payload: Record<string, unknown> };
  };
  const storedPayload = () => storedRow().payload;

  beforeEach(() => {
    vi.clearAllMocks();
    getLinkedProjectIds.mockResolvedValue([]);
    getUserProjectIds.mockResolvedValue([]);
  });

  it('records the projects an entity-bound aggregate is linked to, keeping the request scope', async () => {
    getLinkedProjectIds.mockResolvedValue([projectA, projectB]);
    const tx = db; // the publisher inserts through the transaction it is given

    await publisher().publish(
      {
        type: 'role.updated',
        aggregate: { kind: 'role', id: 'role-1' },
        data: { after: { id: 'role-1' } },
      },
      tx
    );

    expect(getLinkedProjectIds).toHaveBeenCalledWith('role', 'role-1', tx);
    expect(storedPayload().projectIds).toEqual([projectA, projectB]);
    // The request scope is untouched: notifications and the envelope keep reading it.
    expect(storedRow()).toMatchObject({
      scopeTenant: Tenant.Organization,
      scopeId: 'org-1',
    });
  });

  it('resolves both sides of a pivot and merges them without duplicates', async () => {
    getLinkedProjectIds.mockImplementation(async (kind: string) =>
      kind === 'role' ? [projectA, projectB] : [projectB, projectC]
    );

    await publisher().publish({
      type: 'role.group_assigned',
      aggregate: { kind: 'roleGroup', id: 'p-1' },
      data: { after: { roleId: 'role-1', groupId: 'group-1' } },
    });

    expect(getLinkedProjectIds).toHaveBeenCalledTimes(2);
    expect(storedPayload().projectIds).toEqual([projectA, projectB, projectC]);
  });

  it('unions projects captured by the caller (a delete) with the ones still linked', async () => {
    getLinkedProjectIds.mockResolvedValue([projectB]);

    await publisher().publish({
      type: 'role.deleted',
      aggregate: { kind: 'role', id: 'role-1' },
      data: { before: { id: 'role-1' } },
      projectIds: [projectA, projectB],
    });

    expect(storedPayload().projectIds).toEqual([projectA, projectB]);
  });

  it('keeps a captured project even when no link is left to read', async () => {
    await publisher().publish({
      type: 'role.deleted',
      aggregate: { kind: 'role', id: 'role-1' },
      data: { before: { id: 'role-1' } },
      projectIds: [projectA],
    });

    expect(storedPayload().projectIds).toEqual([projectA]);
  });

  it('writes no projectIds key for an entity linked to no project', async () => {
    await publisher().publish({
      type: 'role.updated',
      aggregate: { kind: 'role', id: 'role-1' },
      data: { after: {} },
    });

    expect(storedPayload()).not.toHaveProperty('projectIds');
  });

  it('does not read the pivots for an event about something else', async () => {
    await publisher().publish({
      type: 'user.password_changed',
      aggregate: { kind: 'userAuthenticationMethod', id: 'm-1' },
      data: {},
    });
    await publisher().publish({ type: 'role.created', data: { after: {} } });

    expect(getLinkedProjectIds).not.toHaveBeenCalled();
  });

  it('exposes the resolution for callers that must read links before a delete', async () => {
    getLinkedProjectIds.mockResolvedValue([projectA]);
    getUserProjectIds.mockResolvedValue([projectB]);

    await expect(
      publisher().resolveLinkedProjectIds([
        { kind: 'group', id: 'group-1' },
        { kind: 'user', id: 'user-9' },
        { kind: 'organization', id: 'org-1' },
      ])
    ).resolves.toEqual([projectA, projectB]);
    expect(getLinkedProjectIds).toHaveBeenCalledTimes(1);
    expect(getLinkedProjectIds).toHaveBeenCalledWith('group', 'group-1', undefined);
    expect(getUserProjectIds).toHaveBeenCalledWith('user-9', undefined);
  });

  it('resolves a user to the projects it is a member of only when asked, never from an aggregate', async () => {
    getUserProjectIds.mockResolvedValue([projectA]);

    // Events about a user's own security name the user as aggregate: no fan-out (ADR 0012, item 8).
    await publisher().publish({
      type: 'user.mfa_enabled',
      aggregate: { kind: 'user', id: 'user-9' },
      data: {},
    });
    expect(getUserProjectIds).not.toHaveBeenCalled();
    expect(storedPayload()).not.toHaveProperty('projectIds');

    // The lifecycle events pass the memberships they read before the write.
    values.mockClear();
    await publisher().publish({
      type: 'user.deleted',
      aggregate: { kind: 'user', id: 'user-9' },
      data: {},
      projectIds: [projectA],
    });
    expect(storedPayload().projectIds).toEqual([projectA]);
  });

  it.each([
    ['userTag', 'tag.linked', { tagId: 'tag-1', targetKind: 'user', targetId: 'user-1' }],
    ['groupTag', 'tag.unlinked', { tagId: 'tag-1', targetKind: 'group', targetId: 'group-1' }],
  ] as const)(
    'resolves the tag and the target of a %s pivot, not the user',
    async (aggregateKind, type, after) => {
      getLinkedProjectIds.mockImplementation(async (kind: string) =>
        kind === 'tag' ? [projectA] : kind === 'group' ? [projectB] : []
      );

      await publisher().publish({
        type,
        aggregate: { kind: aggregateKind, id: 'pivot-1' },
        data: { after },
      });

      const kinds = getLinkedProjectIds.mock.calls.map((call) => call[0]);
      expect(kinds).toEqual(aggregateKind === 'userTag' ? ['tag'] : ['tag', 'group']);
      expect(storedPayload().projectIds).toEqual(
        aggregateKind === 'userTag' ? [projectA] : [projectA, projectB]
      );
    }
  );
});
