import type { DomainEvent } from '@grantjs/schema';
import { EVENT_IDENTITY_KEYS, Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { buildCloudEventEnvelope } from '@/lib/webhooks/webhook-envelope.lib';
import { projectIdentity, redactEventData } from '@/lib/webhooks/webhook-redaction.lib';

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

  it('keeps only the identity of the before snapshot in external data', () => {
    const result = redactEventData({
      before: { id: 'role-1', name: 'Editor', secret: 'x' },
      after: { id: '1' },
    });
    expect(result.before).toEqual({ id: 'role-1', name: 'Editor' });
    expect(result.after).toEqual({ id: '1' });
  });

  it('leaves after and delta exactly as before when a before snapshot is present', () => {
    const result = redactEventData({
      before: { id: 'r1', name: 'Old' },
      after: { id: 'r1', name: 'New', clientSecret: 'nope' },
      delta: { name: { from: 'Old', to: 'New' } },
    });
    expect(result.after).toEqual({ id: 'r1', name: 'New', clientSecret: '[redacted]' });
    expect(result.delta).toEqual({ name: { from: 'Old', to: 'New' } });
  });

  it.each([
    ['absent', {}],
    ['null', { before: null }],
    ['without an identity field', { before: { kid: 'k1', active: true, email: 'a@b.c' } }],
  ])('carries no before when the snapshot is %s', (_label, data) => {
    expect(redactEventData(data)).not.toHaveProperty('before');
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

  it('redacts an imported CDM password credential and a stored hashedPassword', () => {
    const hash = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';
    const result = redactEventData({
      after: {
        id: 'u1',
        password: { algorithm: 'bcrypt', hash },
        providerData: { hashedPassword: hash, passwordSource: 'cdm-import' },
      },
    });

    expect(JSON.stringify(result)).not.toContain(hash);
    expect(result.after).toEqual({
      id: 'u1',
      password: '[redacted]',
      providerData: { hashedPassword: '[redacted]', passwordSource: '[redacted]' },
    });
  });
});

describe('projectIdentity', () => {
  it('keeps every allowlisted key and nothing else', () => {
    const snapshot: Record<string, unknown> = Object.fromEntries(
      EVENT_IDENTITY_KEYS.map((key) => [key, `${key}-value`])
    );
    snapshot.email = 'person@example.com';
    snapshot.firstName = 'Ada';
    snapshot.metadata = { plan: 'gold' };
    snapshot.description = 'free text';
    snapshot.createdAt = '2026-01-01T00:00:00.000Z';
    snapshot.isActive = true;

    const identity = projectIdentity(snapshot);

    expect(Object.keys(identity ?? {}).sort()).toEqual([...EVENT_IDENTITY_KEYS].sort());
    expect(identity).not.toHaveProperty('email');
    expect(identity).not.toHaveProperty('metadata');
    expect(identity).not.toHaveProperty('description');
  });

  it('drops personal data, secrets and metadata next to the identity', () => {
    const identity = projectIdentity({
      id: 'u1',
      userId: 'u1',
      email: 'person@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      iban: 'DE00 0000 0000 0000 00',
      metadata: { note: 'x' },
      passwordHash: 'hash',
      clientSecret: 'secret',
      clientId: 'client-1',
      token: 't',
      mfaSecret: 'm',
    });

    expect(identity).toEqual({ id: 'u1', userId: 'u1' });
  });

  it('does not copy nested objects or arrays, even under an allowlisted key', () => {
    const identity = projectIdentity({
      id: 'r1',
      name: { en: 'Editor', password: 'p' },
      slug: ['a', 'b'],
      key: undefined,
      type: 3,
      kind: false,
      targetId: null,
    });

    expect(identity).toEqual({ id: 'r1', type: 3, kind: false, targetId: null });
  });

  it('keeps apiKeyId as an id although the key pattern /apikey/ matches its name', () => {
    expect(projectIdentity({ apiKeyId: 'key-1', apiKey: 'plain-secret' })).toEqual({
      apiKeyId: 'key-1',
    });
  });

  it('returns undefined when nothing identifies the snapshot', () => {
    expect(projectIdentity({ email: 'person@example.com', updatedAt: 'now' })).toBeUndefined();
  });

  it('does not mutate the input', () => {
    const snapshot = { id: 'r1', email: 'person@example.com' };
    projectIdentity(snapshot);
    expect(snapshot).toEqual({ id: 'r1', email: 'person@example.com' });
  });
});
