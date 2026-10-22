import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { buildCloudEventEnvelope } from '@/lib/webhooks/webhook-envelope.lib';

const baseEvent: DomainEvent = {
  id: '11111111-1111-1111-1111-111111111111',
  sequence: 7,
  type: 'user.role_revoked',
  category: 'iam',
  deliveryClass: 'notification',
  scope: { tenant: Tenant.OrganizationProject, id: 'org-id:project-id' },
  actorUserId: 'actor-id',
  subjectUserId: 'subject-id',
  aggregate: { kind: 'userRole', id: 'pivot-id' },
  data: {
    before: {
      id: 'pivot-id',
      userId: 'subject-id',
      roleId: 'role-id',
      roleName: 'Editor',
      createdAt: '2025-12-31T00:00:00.000Z',
      updatedAt: '2025-12-31T00:00:00.000Z',
    },
  },
  occurredAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('buildCloudEventEnvelope grantsubjectuser', () => {
  it('exposes the subject user next to the actor', () => {
    const envelope = buildCloudEventEnvelope(baseEvent, 'https://grant.example.com');

    expect(envelope.grantsubjectuser).toEqual({ userId: 'subject-id' });
    expect(envelope.grantactor).toEqual({ userId: 'actor-id' });
  });

  it('identifies the user on a revoke event through the identity before and the subject', () => {
    const envelope = buildCloudEventEnvelope(baseEvent, 'https://grant.example.com');

    expect(envelope.subject).toBe('userRole/pivot-id');
    expect(envelope.data).toEqual({
      before: { id: 'pivot-id', userId: 'subject-id', roleId: 'role-id' },
    });
    expect(envelope.grantsubjectuser).toEqual({ userId: 'subject-id' });
  });

  it('is null when the event has no subject user', () => {
    const envelope = buildCloudEventEnvelope(
      { ...baseEvent, type: 'role.created', subjectUserId: null },
      'https://grant.example.com'
    );

    expect(envelope.grantsubjectuser).toBeNull();
    expect(JSON.parse(JSON.stringify(envelope))).toHaveProperty('grantsubjectuser', null);
  });

  it('is independent of the actor', () => {
    const envelope = buildCloudEventEnvelope(
      { ...baseEvent, actorUserId: null },
      'https://grant.example.com'
    );

    expect(envelope.grantactor).toBeNull();
    expect(envelope.grantsubjectuser).toEqual({ userId: 'subject-id' });
  });

  it('uses a valid CloudEvents extension attribute name (lowercase alphanumeric, at most 20 chars)', () => {
    const envelope = buildCloudEventEnvelope(baseEvent, 'https://grant.example.com');
    const extensions = Object.keys(envelope).filter((k) => k.startsWith('grant'));

    expect(extensions).toContain('grantsubjectuser');
    for (const name of extensions) {
      expect(name).toMatch(/^[a-z0-9]{1,20}$/);
    }
  });
});

describe('buildCloudEventEnvelope data.before', () => {
  const build = (event: Partial<DomainEvent>) =>
    buildCloudEventEnvelope({ ...baseEvent, ...event }, 'https://grant.example.com');

  it('names a deleted entity by id and name only', () => {
    const envelope = build({
      type: 'role.deleted',
      subjectUserId: null,
      aggregate: { kind: 'role', id: 'role-id' },
      data: {
        before: {
          id: 'role-id',
          name: 'Editor',
          description: 'Can edit',
          metadata: { owner: 'person@example.com' },
          createdAt: '2025-12-31T00:00:00.000Z',
          updatedAt: '2025-12-31T00:00:00.000Z',
        },
      },
    });

    expect(envelope.data).toEqual({ before: { id: 'role-id', name: 'Editor' } });
    expect(JSON.stringify(envelope)).not.toContain('person@example.com');
  });

  it('names a revoked pivot by its foreign ids, without the role name or timestamps', () => {
    const envelope = build({});

    expect(envelope.data.before).toEqual({
      id: 'pivot-id',
      userId: 'subject-id',
      roleId: 'role-id',
    });
    expect(envelope.data).not.toHaveProperty('after');
  });

  it('carries no before for a user deletion beyond the id', () => {
    const envelope = build({
      type: 'user.deleted',
      subjectUserId: null,
      aggregate: { kind: 'user', id: 'user-id' },
      data: {
        before: { id: 'user-id', createdAt: '2025-12-31T00:00:00.000Z' },
        after: { id: 'user-id', hardDelete: true },
      },
    });

    expect(envelope.data).toEqual({
      before: { id: 'user-id' },
      after: { id: 'user-id', hardDelete: true },
    });
  });

  it('leaves tag.unlinked as it was: the ids stay in data.after and there is no before', () => {
    const envelope = build({
      type: 'tag.unlinked',
      subjectUserId: null,
      aggregate: { kind: 'roleTag', id: 'pivot-id' },
      data: { after: { tagId: 'tag-id', targetKind: 'role', targetId: 'role-id' } },
    });

    expect(envelope.data).toEqual({
      after: { tagId: 'tag-id', targetKind: 'role', targetId: 'role-id' },
    });
  });
});
