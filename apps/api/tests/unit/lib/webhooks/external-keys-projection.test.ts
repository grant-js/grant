import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { buildCloudEventEnvelope } from '@/lib/webhooks/webhook-envelope.lib';
import { projectIdentity, redactEventData } from '@/lib/webhooks/webhook-redaction.lib';

const USER = '40000000-0000-4000-8000-000000000001';
const A = '40000000-0000-4000-8000-00000000000a';
const B = '40000000-0000-4000-8000-00000000000b';
const entries = [
  { projectId: A, externalKey: 'key-a' },
  { projectId: B, externalKey: 'key-b' },
];
const deleted = { type: 'user.deleted', aggregate: { kind: 'user', id: USER } } as const;
const removed = {
  type: 'project.user_removed',
  aggregate: { kind: 'projectUser', id: 'pu' },
} as const;

describe('data.before.externalKeys projection (per subscription)', () => {
  it('keeps only the entries of the delivery project: one stored event, one body per project', () => {
    const data = { before: { id: USER, externalKeys: entries } };

    expect(redactEventData(data, deleted, { projectId: A }).before).toEqual({
      id: USER,
      externalKeys: [{ projectId: A, externalKey: 'key-a' }],
    });
    expect(redactEventData(data, deleted, { projectId: B }).before).toEqual({
      id: USER,
      externalKeys: [{ projectId: B, externalKey: 'key-b' }],
    });
    // Neither body mentions the other project's key.
    expect(JSON.stringify(redactEventData(data, deleted, { projectId: A }))).not.toContain('key-b');
  });

  it('fails closed to [] without a delivery project, with an empty one, or for an unknown project', () => {
    const data = { before: { id: USER, externalKeys: entries } };

    for (const target of [{}, { projectId: null }, { projectId: '' }, { projectId: 'other' }]) {
      expect(redactEventData(data, deleted, target).before?.externalKeys).toEqual([]);
    }
    expect(redactEventData(data, deleted).before?.externalKeys).toEqual([]);
  });

  it('is [] for a snapshot whose list is empty, and absent when the snapshot has no list', () => {
    expect(
      redactEventData({ before: { id: USER, externalKeys: [] } }, deleted, { projectId: A }).before
    ).toEqual({ id: USER, externalKeys: [] });
    expect(redactEventData({ before: { id: USER } }, deleted, { projectId: A }).before).toEqual({
      id: USER,
    });
    expect(
      redactEventData({ before: { id: USER, externalKeys: 'nope' } }, deleted, { projectId: A })
        .before
    ).toEqual({ id: USER });
  });

  it('carries the list on project.user_removed too', () => {
    const data = { before: { id: 'pu', projectId: A, userId: USER, externalKeys: [entries[0]] } };

    expect(redactEventData(data, removed, { projectId: A }).before).toEqual({
      id: 'pu',
      projectId: A,
      userId: USER,
      externalKeys: [{ projectId: A, externalKey: 'key-a' }],
    });
  });

  it('never copies externalKeys for any other event type, even if a snapshot held one', () => {
    for (const type of ['user.updated', 'role.deleted', 'organization.member_removed'] as const) {
      const data = redactEventData(
        { before: { id: 'x', userId: USER, externalKeys: entries } },
        { type, aggregate: { kind: 'user', id: USER } },
        { projectId: A }
      );
      expect(data.before, type).not.toHaveProperty('externalKeys');
    }
  });

  it('rebuilds each entry from projectId and externalKey: nothing else a snapshot holds leaves', () => {
    const data = redactEventData(
      {
        before: {
          id: USER,
          externalKeys: [
            { projectId: A, externalKey: 'key-a', email: 'someone@example.test', name: 'Jane' },
            { projectId: A, externalKey: 42 },
            { projectId: A },
            null,
            'text',
          ],
        },
      },
      deleted,
      { projectId: A }
    );

    expect(data.before?.externalKeys).toEqual([{ projectId: A, externalKey: 'key-a' }]);
    expect(JSON.stringify(data)).not.toMatch(/example\.test|Jane/);
  });

  it('keeps projectIdentity unchanged: it drops a list and EVENT_IDENTITY_KEYS gained nothing', () => {
    expect(projectIdentity({ id: USER, externalKeys: entries })).toEqual({ id: USER });
  });

  it('threads the delivery project through the envelope, and keeps the name out', () => {
    const event: DomainEvent = {
      id: '41000000-0000-4000-8000-000000000001',
      sequence: 1,
      type: 'user.deleted',
      category: 'iam',
      deliveryClass: 'transactional',
      scope: { tenant: Tenant.System, id: 'system' },
      actorUserId: null,
      subjectUserId: USER,
      aggregate: { kind: 'user', id: USER },
      data: { before: { id: USER, name: 'Jane', externalKeys: entries }, after: { id: USER } },
      occurredAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const envelope = buildCloudEventEnvelope(event, 'https://grant.example.com', { projectId: B });

    expect(envelope.data.before).toEqual({
      id: USER,
      externalKeys: [{ projectId: B, externalKey: 'key-b' }],
    });
    expect(JSON.stringify(envelope)).not.toMatch(/Jane|key-a/);
    expect(buildCloudEventEnvelope(event, 'https://grant.example.com').data.before).toEqual({
      id: USER,
      externalKeys: [],
    });
  });
});
