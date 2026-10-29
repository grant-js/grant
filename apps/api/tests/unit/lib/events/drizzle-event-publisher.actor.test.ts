import type { GrantAuth } from '@grantjs/core';
import { Tenant, TokenType } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@grantjs/database', () => ({
  eventLog: { __table: 'event_log' },
}));

import { config } from '@/config';
import { DrizzleEventPublisher } from '@/lib/events/drizzle-event-publisher';
import { mapEventLogToDomainEvent } from '@/lib/events/event-log-mapper.lib';
import { buildCloudEventEnvelope } from '@/lib/webhooks/webhook-envelope.lib';

const projectUserId = '30000000-0000-4000-8000-000000000099';
const explicitActorId = '30000000-0000-4000-8000-000000000042';
const apiKeyId = 'd1bfe5e5-a05d-4e74-8e5e-5c1a64de802b';
const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };

function auth(overrides: Partial<GrantAuth>): GrantAuth {
  return {
    userId: projectUserId,
    tokenId: 'token-1',
    expiresAt: Date.now() + 60_000,
    type: TokenType.Session,
    scope,
    ...overrides,
  };
}

describe('DrizzleEventPublisher actor attribution', () => {
  const values = vi.fn().mockResolvedValue(undefined);
  const db = { insert: vi.fn(() => ({ values })) };

  beforeEach(() => {
    values.mockClear();
    db.insert.mockClear();
  });

  async function publishedRow(user: GrantAuth | null, actor?: { userId: string }) {
    const publisher = new DrizzleEventPublisher(user, db as never);
    await publisher.publish({
      type: 'role.created',
      data: { after: { name: 'A' } },
      ...(actor ? { actor } : {}),
    });
    return values.mock.calls[0][0][0] as {
      actorUserId: string | null;
      payload: Record<string, unknown>;
    };
  }

  it('attributes a project-level API key to the system user and records which key acted', async () => {
    const row = await publishedRow(
      auth({ userId: apiKeyId, tokenId: apiKeyId, type: TokenType.ApiKey })
    );

    expect(row.actorUserId).toBe(config.system.systemUserId);
    expect(row.payload.actor).toEqual({ tokenId: apiKeyId, tokenType: TokenType.ApiKey });
  });

  it('keeps the user id and records no token for a session user', async () => {
    const row = await publishedRow(auth({ type: TokenType.Session }));

    expect(row.actorUserId).toBe(projectUserId);
    expect(row.payload).not.toHaveProperty('actor');
  });

  it('keeps the project user id of a user-scoped API key and records no token', async () => {
    const row = await publishedRow(auth({ type: TokenType.ApiKey, tokenId: apiKeyId }));

    expect(row.actorUserId).toBe(projectUserId);
    expect(row.payload).not.toHaveProperty('actor');
  });

  it('falls back to the system user when there is no auth context', async () => {
    const row = await publishedRow(null);

    expect(row.actorUserId).toBe(config.system.systemUserId);
    expect(row.payload).not.toHaveProperty('actor');
  });

  it('lets an explicit event actor win over the request actor', async () => {
    const row = await publishedRow(
      auth({ userId: apiKeyId, tokenId: apiKeyId, type: TokenType.ApiKey }),
      { userId: explicitActorId }
    );

    expect(row.actorUserId).toBe(explicitActorId);
  });

  it('keeps the key id out of the webhook envelope built from the stored row', async () => {
    const row = await publishedRow(
      auth({ userId: apiKeyId, tokenId: apiKeyId, type: TokenType.ApiKey })
    );

    const event = mapEventLogToDomainEvent({
      ...row,
      id: 'event-1',
      sequence: 1,
      type: 'role.created',
      category: 'iam',
      deliveryClass: 'notification',
      scopeTenant: scope.tenant,
      scopeId: scope.id,
      subjectUserId: null,
      occurredAt: new Date('2026-01-01T00:00:00Z'),
      relayStatus: 'pending',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    } as never);
    const envelope = buildCloudEventEnvelope(event, 'https://grant.example.invalid');

    expect(JSON.stringify(event)).not.toContain(apiKeyId);
    expect(JSON.stringify(envelope)).not.toContain(apiKeyId);
  });
});
