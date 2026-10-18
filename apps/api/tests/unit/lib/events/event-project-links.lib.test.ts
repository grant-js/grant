import type { DomainEventInput } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { linkedEntityRefsOf } from '@/lib/events/event-project-links.lib';

const input = (overrides: Partial<DomainEventInput>): DomainEventInput => ({
  type: 'role.updated',
  data: {},
  ...overrides,
});

describe('linkedEntityRefsOf', () => {
  it.each(['role', 'group', 'permission', 'resource', 'apiKey'])(
    'returns a %s aggregate as it is',
    (kind) => {
      expect(linkedEntityRefsOf(input({ aggregate: { kind, id: 'e-1' } }))).toEqual([
        { kind, id: 'e-1' },
      ]);
    }
  );

  it('reads both sides of a role-group pivot from the after snapshot', () => {
    expect(
      linkedEntityRefsOf(
        input({
          type: 'role.group_assigned',
          aggregate: { kind: 'roleGroup', id: 'p-1' },
          data: { after: { id: 'p-1', roleId: 'r-1', groupId: 'g-1' } },
        })
      )
    ).toEqual([
      { kind: 'role', id: 'r-1' },
      { kind: 'group', id: 'g-1' },
    ]);
  });

  it('falls back to the before snapshot for a revoke', () => {
    expect(
      linkedEntityRefsOf(
        input({
          type: 'role.permission_revoked',
          aggregate: { kind: 'rolePermission', id: 'p-1' },
          data: { before: { id: 'p-1', roleId: 'r-1', permissionId: 'perm-1' } },
        })
      )
    ).toEqual([
      { kind: 'role', id: 'r-1' },
      { kind: 'permission', id: 'perm-1' },
    ]);
  });

  it('resolves a user pivot through the role, group or permission, never the user', () => {
    expect(
      linkedEntityRefsOf(
        input({
          type: 'user.role_assigned',
          aggregate: { kind: 'userRole', id: 'p-1' },
          data: { after: { userId: 'u-1', roleId: 'r-1' } },
        })
      )
    ).toEqual([{ kind: 'role', id: 'r-1' }]);
    expect(
      linkedEntityRefsOf(
        input({
          type: 'user.group_assigned',
          aggregate: { kind: 'userGroup', id: 'p-1' },
          data: { after: { userId: 'u-1', groupId: 'g-1' } },
        })
      )
    ).toEqual([{ kind: 'group', id: 'g-1' }]);
    expect(
      linkedEntityRefsOf(
        input({
          type: 'user.permission_assigned',
          aggregate: { kind: 'userPermission', id: 'p-1' },
          data: { after: { userId: 'u-1', permissionId: 'perm-1' } },
        })
      )
    ).toEqual([{ kind: 'permission', id: 'perm-1' }]);
  });

  it('skips a pivot side the snapshot does not name', () => {
    expect(
      linkedEntityRefsOf(
        input({
          aggregate: { kind: 'groupPermission', id: 'p-1' },
          data: { after: { groupId: 'g-1' } },
        })
      )
    ).toEqual([{ kind: 'group', id: 'g-1' }]);
  });

  it('returns nothing for events about something not linked through a pivot', () => {
    expect(linkedEntityRefsOf(input({ aggregate: { kind: 'user', id: 'u-1' } }))).toEqual([]);
    expect(linkedEntityRefsOf(input({ aggregate: { kind: 'userSession', id: 's-1' } }))).toEqual(
      []
    );
    expect(linkedEntityRefsOf(input({ aggregate: { kind: 'project', id: 'p-1' } }))).toEqual([]);
    expect(linkedEntityRefsOf(input({}))).toEqual([]);
  });
});
