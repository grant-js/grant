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
  data: { before: { id: 'pivot-id', userId: 'subject-id', roleId: 'role-id' } },
  occurredAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('buildCloudEventEnvelope grantsubjectuser', () => {
  it('exposes the subject user next to the actor', () => {
    const envelope = buildCloudEventEnvelope(baseEvent, 'https://grant.example.com');

    expect(envelope.grantsubjectuser).toEqual({ userId: 'subject-id' });
    expect(envelope.grantactor).toEqual({ userId: 'actor-id' });
  });

  it('identifies the user on a revoke event whose data is empty after redaction', () => {
    const envelope = buildCloudEventEnvelope(baseEvent, 'https://grant.example.com');

    expect(envelope.subject).toBe('userRole/pivot-id');
    expect(envelope.data).toEqual({});
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
