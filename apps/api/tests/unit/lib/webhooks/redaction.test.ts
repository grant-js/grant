import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { buildCloudEventEnvelope } from '@/lib/webhooks/webhook-envelope.lib';
import { redactEventData } from '@/lib/webhooks/webhook-redaction.lib';

describe('redactEventData', () => {
  it('redacts sensitive keys at any depth in after', () => {
    const result = redactEventData({
      after: {
        id: 'abc',
        name: 'CI key',
        clientSecret: 'super-secret',
        nested: { passwordHash: 'hash', value: 1 },
      },
    });

    expect(result.after).toEqual({
      id: 'abc',
      name: 'CI key',
      clientSecret: '[redacted]',
      nested: { passwordHash: '[redacted]', value: 1 },
    });
  });

  it('drops the before snapshot from external data', () => {
    const result = redactEventData({
      before: { secret: 'x' },
      after: { id: '1' },
    });
    expect(result).not.toHaveProperty('before');
    expect(result.after).toEqual({ id: '1' });
  });

  it('redacts sensitive delta fields entirely', () => {
    const result = redactEventData({
      delta: {
        clientSecret: { from: 'old', to: 'new' },
        active: { from: false, to: true },
      },
    });

    expect(result.delta).toEqual({
      clientSecret: { from: '[redacted]', to: '[redacted]' },
      active: { from: false, to: true },
    });
  });
});

describe('buildCloudEventEnvelope', () => {
  const event: DomainEvent = {
    id: '11111111-1111-1111-1111-111111111111',
    sequence: 42,
    type: 'api_key.created',
    category: 'security',
    deliveryClass: 'notification',
    scope: { tenant: Tenant.OrganizationProject, id: 'org-id:project-id' },
    actorUserId: 'actor-id',
    subjectUserId: null,
    aggregate: { kind: 'apiKey', id: 'key-id' },
    data: { after: { id: 'key-id', clientSecret: 'nope' } },
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('produces a CloudEvents 1.0 envelope with grant extensions and redacted data', () => {
    const envelope = buildCloudEventEnvelope(event, 'https://grant.example.com');

    expect(envelope).toMatchObject({
      specversion: '1.0',
      id: event.id,
      source: 'https://grant.example.com',
      type: 'api_key.created',
      time: '2026-01-01T00:00:00.000Z',
      subject: 'apiKey/key-id',
      grantsequence: '42',
      grantscope: { tenant: Tenant.OrganizationProject, id: 'org-id:project-id' },
      grantactor: { userId: 'actor-id' },
      grantcategory: 'security',
    });
    expect(envelope.data.after).toEqual({ id: 'key-id', clientSecret: '[redacted]' });
  });
});
