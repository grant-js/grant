import type { IApiKeyRepository, IAuditLogger, IEventPublisher } from '@grantjs/core';
import { type ApiKey, type DomainEvent, Tenant } from '@grantjs/schema';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sentinelBytes = vi.hoisted(() => Buffer.from('sentinel-client-secret-never-leaves-0'));

vi.mock('@/lib/token.lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/token.lib')>()),
  generateRandomBytes: vi.fn(() => sentinelBytes),
}));

import { logger } from '@/lib/logger';
import { buildCloudEventEnvelope } from '@/lib/webhooks/webhook-envelope.lib';
import { ApiKeyService } from '@/services/api-keys.service';

const SENTINEL = sentinelBytes.toString('base64url');

const projectId = '10000000-0000-4000-8000-000000000001';
const userId = '10000000-0000-4000-8000-000000000002';
const clientId = '10000000-0000-4000-8000-000000000004';
const apiKeyId = '10000000-0000-4000-8000-000000000005';
const createdBy = '10000000-0000-4000-8000-000000000006';

type StoredKey = ApiKey & { clientSecretHash?: string };

function storedKey(overrides: Partial<StoredKey> = {}): StoredKey {
  return {
    id: apiKeyId,
    clientId,
    name: 'Prod key',
    description: null,
    expiresAt: null,
    lastUsedAt: null,
    isRevoked: false,
    revokedAt: null,
    revokedBy: null,
    createdBy,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

/**
 * A repository that hands the stored row back as written, the hash included, so a service that
 * copied a whole row into an event or an audit entry would leak it here.
 */
function build() {
  const hashes: string[] = [];
  const apiKeyRepository = {
    getOwningUserIds: vi.fn().mockResolvedValue([userId]),
    getApiKey: vi.fn().mockImplementation(async () => storedKey({ clientSecretHash: hashes[0] })),
    createApiKey: vi.fn().mockImplementation(async (params: { clientSecretHash: string }) => {
      hashes.push(params.clientSecretHash);
      return storedKey({ ...params });
    }),
    updateClientSecretHash: vi.fn().mockImplementation(async (_id: string, hash: string) => {
      hashes.push(hash);
      return storedKey({ clientSecretHash: hash });
    }),
    revokeApiKey: vi
      .fn()
      .mockImplementation(async () =>
        storedKey({ isRevoked: true, revokedAt: new Date(), revokedBy: createdBy })
      ),
    softDeleteApiKey: vi
      .fn()
      .mockImplementation(async () => storedKey({ deletedAt: new Date('2026-01-03T00:00:00Z') })),
  } as unknown as IApiKeyRepository;
  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  } as unknown as IAuditLogger;
  const events = {
    publish: vi.fn(),
    resolveLinkedProjectIds: vi.fn().mockResolvedValue([projectId]),
  } as unknown as IEventPublisher;

  const service = new ApiKeyService(
    {} as never,
    {} as never,
    apiKeyRepository,
    null,
    audit,
    {} as never,
    events
  );
  return { service, audit, events, hashes };
}

function captureLogs() {
  const lines: unknown[] = [];
  const record = (...args: unknown[]) => void lines.push(args);
  const spies = (['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const).map((level) =>
    vi.spyOn(logger, level).mockImplementation(record as never)
  );
  const consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(record as never)
  );
  return { lines, restore: () => [...spies, ...consoleSpies].forEach((spy) => spy.mockRestore()) };
}

describe('API-key events never carry a secret', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the secret and its hash out of events, envelopes, audit values and logs', async () => {
    const logs = captureLogs();
    const { service, audit, events, hashes } = build();

    const created = await service.createApiKey({ name: 'Prod key', owner: { projectId, userId } });
    const rotated = await service.rotateApiKey({ id: apiKeyId });
    await service.revokeApiKey({ id: apiKeyId });
    await service.deleteApiKey({ id: apiKeyId });
    logs.restore();

    // The sentinel is the secret the service really generated and returned to the caller.
    expect(created.clientSecret).toBe(SENTINEL);
    expect(rotated.clientSecret).toBe(SENTINEL);
    expect(hashes).toHaveLength(2);

    const published = vi.mocked(events.publish).mock.calls.map(([event]) => event);
    expect(published.map((event) => event.type)).toEqual([
      'api_key.created',
      'api_key.rotated',
      'api_key.revoked',
      'api_key.deleted',
    ]);

    const envelopes = published.map((event, index) =>
      buildCloudEventEnvelope(
        {
          id: `20000000-0000-4000-8000-00000000000${index}`,
          sequence: index + 1,
          type: event.type,
          category: 'security',
          deliveryClass: 'notification',
          scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
          actorUserId: createdBy,
          subjectUserId: event.subjectUserId ?? null,
          aggregate: event.aggregate,
          data: event.data,
          occurredAt: new Date('2026-01-04T00:00:00.000Z'),
          projectIds: event.projectIds,
        } as DomainEvent,
        'https://grant.example.invalid'
      )
    );

    const audited = [
      ...vi.mocked(audit.logCreate).mock.calls,
      ...vi.mocked(audit.logUpdate).mock.calls,
      ...vi.mocked(audit.logSoftDelete).mock.calls,
    ];
    expect(audited).toHaveLength(4);

    const surfaces = {
      'published data': published.map((event) => event.data),
      'published events': published,
      'external envelopes': envelopes,
      'audit values': audited,
      'log lines': logs.lines,
    };
    for (const [surface, value] of Object.entries(surfaces)) {
      const text = JSON.stringify(value);
      for (const secret of [SENTINEL, ...hashes]) {
        expect(text, `${surface} must not contain a secret`).not.toContain(secret);
      }
    }

    // The delete envelope's `before` is the identity projection, which has no `clientId` key
    // (`EVENT_IDENTITY_KEYS`); the owner is the one user-shaped addition on all four.
    expect(JSON.stringify(envelopes[3].data)).not.toContain(clientId);
    expect(envelopes.map((envelope) => envelope.grantsubjectuser)).toEqual(
      envelopes.map(() => ({ userId }))
    );
  });
});
