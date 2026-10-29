/**
 * Pins part 1 of the webhook envelope contract, type by type: every delete, revoke,
 * remove and unlink event in the catalog either keeps an identity-only `data.before`
 * through the external projection, or is a named exception with a reason. A new event
 * type of that shape fails here until someone classifies it, and a change to
 * `EVENT_IDENTITY_KEYS` or to the projection that narrows a `before` fails with it.
 *
 * Each snapshot is the shape the service publishes today (noise included: timestamps,
 * descriptions, an e-mail address), so the expectation is what survives the projection.
 */
import { EVENT_TYPES, type EventType } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { redactEventData } from '@/lib/webhooks/webhook-redaction.lib';

const ID = '20000000-0000-4000-8000-000000000001';
const USER = '20000000-0000-4000-8000-000000000002';
const ROLE = '20000000-0000-4000-8000-000000000003';
const GROUP = '20000000-0000-4000-8000-000000000004';
const PERMISSION = '20000000-0000-4000-8000-000000000005';
const PROJECT = '20000000-0000-4000-8000-000000000006';
const NOISE = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  description: 'free text',
};

interface Pinned {
  /** The internal `before` the service publishes. */
  before: Record<string, unknown>;
  /** The external `data.before` it must project to. */
  external: Record<string, unknown>;
}

const PINNED: Partial<Record<EventType, Pinned>> = {
  'role.deleted': {
    before: { id: ID, name: 'Editor', ...NOISE },
    external: { id: ID, name: 'Editor' },
  },
  'group.deleted': {
    before: { id: ID, name: 'Team', ...NOISE },
    external: { id: ID, name: 'Team' },
  },
  'permission.deleted': {
    before: { id: ID, name: 'doc:read', ...NOISE },
    external: { id: ID, name: 'doc:read' },
  },
  'tag.deleted': {
    before: { id: ID, name: 'Beta', ...NOISE },
    external: { id: ID, name: 'Beta' },
  },
  'resource.deleted': {
    before: { id: ID, name: 'Documents', slug: 'documents', actions: ['read'], ...NOISE },
    external: { id: ID, name: 'Documents', slug: 'documents' },
  },
  'api_key.deleted': {
    before: { id: ID, clientId: 'client-1', name: 'CI key', deletedAt: null },
    external: { id: ID, name: 'CI key' },
  },
  'api_key.revoked': {
    before: { id: ID, isRevoked: false, revokedAt: null, revokedBy: null },
    external: { id: ID },
  },
  'user.role_revoked': {
    before: { id: ID, userId: USER, roleId: ROLE, roleName: 'Editor', ...NOISE },
    external: { id: ID, userId: USER, roleId: ROLE, roleName: 'Editor' },
  },
  'user.group_revoked': {
    before: { id: ID, userId: USER, groupId: GROUP, ...NOISE },
    external: { id: ID, userId: USER, groupId: GROUP },
  },
  'user.permission_revoked': {
    before: { id: ID, userId: USER, permissionId: PERMISSION, ...NOISE },
    external: { id: ID, userId: USER, permissionId: PERMISSION },
  },
  'role.group_revoked': {
    before: { id: ID, roleId: ROLE, groupId: GROUP, ...NOISE },
    external: { id: ID, roleId: ROLE, groupId: GROUP },
  },
  'role.permission_revoked': {
    before: { id: ID, roleId: ROLE, permissionId: PERMISSION, ...NOISE },
    external: { id: ID, roleId: ROLE, permissionId: PERMISSION },
  },
  'group.permission_revoked': {
    before: { id: ID, groupId: GROUP, permissionId: PERMISSION, ...NOISE },
    external: { id: ID, groupId: GROUP, permissionId: PERMISSION },
  },
  'organization.member_removed': {
    before: { userId: USER, roleId: ROLE },
    external: { userId: USER, roleId: ROLE },
  },
  'organization.invitation_revoked': {
    before: { id: ID, organizationId: PROJECT, email: 'someone@example.test', roleId: ROLE },
    external: { id: ID, roleId: ROLE },
  },
  'user.session_revoked': {
    before: { id: ID, userId: USER },
    external: { id: ID, userId: USER },
  },
  'project.user_removed': {
    before: { id: ID, projectId: PROJECT, userId: USER, ...NOISE, externalKeys: [] },
    external: { id: ID, projectId: PROJECT, userId: USER, externalKeys: [] },
  },
  'user.deleted': {
    // No `name`: the outbox row outlives a hard delete.
    before: { id: USER, ...NOISE, externalKeys: [] },
    external: { id: USER, externalKeys: [] },
  },
};

/** Types of that shape that deliberately carry no `data.before`, each with its reason. */
const EXCEPTIONS: Partial<Record<EventType, string>> = {
  'tag.unlinked': 'its ids stay in data.after for compatibility ({ tagId, targetKind, targetId })',
  'user.sessions_revoked': 'a bulk event with no single removed entity (after: { userId, count })',
};

const REMOVAL_TYPE = /(?:^|[._])(?:deleted|revoked|removed|unlinked)$/;
const removalTypes = EVENT_TYPES.filter((type) => REMOVAL_TYPE.test(type));

describe('data.before of delete, revoke, remove and unlink events', () => {
  it('classifies every such catalog type: pinned or a named exception, never both', () => {
    const classified = new Set<string>([...Object.keys(PINNED), ...Object.keys(EXCEPTIONS)]);

    expect(removalTypes.filter((type) => !classified.has(type))).toEqual([]);
    expect([...classified].filter((type) => !removalTypes.includes(type as EventType))).toEqual([]);
    expect(Object.keys(PINNED).filter((type) => type in EXCEPTIONS)).toEqual([]);
    for (const reason of Object.values(EXCEPTIONS)) {
      expect(reason?.length).toBeGreaterThan(0);
    }
  });

  it.each(Object.entries(PINNED) as Array<[EventType, Pinned]>)(
    '%s keeps its identity keys in the external before',
    (type, { before, external }) => {
      const data = redactEventData({ before }, { type }, { projectId: PROJECT });

      expect(data.before).toEqual(external);
      expect(JSON.stringify(data)).not.toContain('example.test');
      expect(JSON.stringify(data)).not.toContain('free text');
    }
  );

  it.each(Object.keys(EXCEPTIONS) as EventType[])(
    '%s publishes no before: its ids are in after',
    (type) => {
      const data = redactEventData(
        { after: { tagId: ID, targetKind: 'role', targetId: ROLE, userId: USER, count: 2 } },
        { type }
      );

      expect(data.before).toBeUndefined();
      expect(data.after).toMatchObject({ userId: USER });
    }
  );
});
