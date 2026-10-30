import { createHash } from 'node:crypto';

import type {
  IApiKeyExportableSecretRepository,
  IApiKeyRepository,
  IAuditLogger,
  IEventPublisher,
  IProjectRepository,
} from '@grantjs/core';
import { type ApiKey, type DomainEvent, Tenant } from '@grantjs/schema';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sentinelBytes = vi.hoisted(() => Buffer.from('sentinel-client-secret-never-leaves-0'));
/** The 64 bytes an opted-in project's key is made of (88 characters of padded base64). */
const sentinelBytes64 = vi.hoisted(() =>
  Buffer.from('sentinel-client-secret-never-leaves-exportable-form'.padEnd(64, '-'))
);

vi.mock('@/lib/token.lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/token.lib')>()),
  generateRandomBytes: vi.fn((length: number) => (length === 64 ? sentinelBytes64 : sentinelBytes)),
}));

import { ConfigurationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { buildCloudEventEnvelope } from '@/lib/webhooks/webhook-envelope.lib';
import { ApiKeyExportableSecretService } from '@/services/api-key-exportable-secrets.service';
import { ApiKeyService } from '@/services/api-keys.service';

const SENTINEL = sentinelBytes.toString('base64url');
/** Every form the 64 sentinel bytes can take: clear text, the issued 88 characters, base64url. */
const SENTINEL_64_FORMS = [
  sentinelBytes64.toString('utf8'),
  sentinelBytes64.toString('base64'),
  sentinelBytes64.toString('base64url'),
];
const ENCRYPTION_KEY_MATERIAL = 'test-api-key-exportable-secret-encryption-key';

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
function build(options: { exportable?: { keyMaterial: string } } = {}) {
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

  const storedCopies: Array<Parameters<IApiKeyExportableSecretRepository['upsertForKey']>[0]> = [];
  const copies = {
    upsertForKey: vi.fn().mockImplementation(async (params) => void storedCopies.push(params)),
    deleteForKeys: vi.fn().mockResolvedValue(0),
    deleteForProject: vi.fn().mockResolvedValue(0),
    listCredentialSummaries: vi.fn().mockResolvedValue([]),
    findSealedForExport: vi.fn().mockResolvedValue([]),
  } satisfies IApiKeyExportableSecretRepository;
  const projects = {
    isExportableApiKeySecretsEnabled: vi.fn().mockResolvedValue(Boolean(options.exportable)),
  } as unknown as IProjectRepository;
  const exportableSecrets = new ApiKeyExportableSecretService(copies, projects, {
    resolve: vi.fn().mockResolvedValue(options.exportable?.keyMaterial ?? ''),
  } as never);

  const service = new ApiKeyService(
    {} as never,
    {} as never,
    apiKeyRepository,
    null,
    audit,
    {} as never,
    events,
    exportableSecrets
  );
  return { service, audit, events, hashes, apiKeyRepository, storedCopies };
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

  describe('in a project that opted in to exportable secrets', () => {
    it('keeps the 64 sentinel bytes out of every surface and out of the stored copy', async () => {
      const logs = captureLogs();
      const { service, audit, events, hashes, apiKeyRepository, storedCopies } = build({
        exportable: { keyMaterial: ENCRYPTION_KEY_MATERIAL },
      });

      const created = await service.createApiKey({
        name: 'Prod key',
        owner: { projectId, userId },
      });
      const rotated = await service.rotateApiKey({ id: apiKeyId });
      await service.revokeApiKey({ id: apiKeyId });
      await service.deleteApiKey({ id: apiKeyId });
      logs.restore();

      // The issued form is the 88-character padded base64 of the 64 sentinel bytes.
      expect(created.clientSecret).toBe(sentinelBytes64.toString('base64'));
      expect(created.clientSecret).toHaveLength(88);
      expect(rotated.clientSecret).toBe(created.clientSecret);

      // The stored row is the sealed triple: set, and containing none of the secret's forms.
      expect(storedCopies).toHaveLength(2);
      for (const copy of storedCopies) {
        expect(copy.projectId).toBe(projectId);
        expect(copy.sealed.secretIv.length).toBeGreaterThan(0);
        expect(copy.sealed.secretTag.length).toBeGreaterThan(0);
        for (const form of SENTINEL_64_FORMS) {
          expect(JSON.stringify(copy), 'the stored copy must be ciphertext').not.toContain(form);
        }
      }

      // The fingerprint (SHA-256 of the issued string) is the one derived value that is stored.
      const fingerprint = createHash('sha256').update(created.clientSecret, 'utf8').digest('hex');
      expect(vi.mocked(apiKeyRepository.createApiKey).mock.calls[0][0]).toMatchObject({
        clientSecretFingerprint: fingerprint,
      });
      expect(vi.mocked(apiKeyRepository.updateClientSecretHash).mock.calls[0][2]).toBe(fingerprint);

      const published = vi.mocked(events.publish).mock.calls.map(([event]) => event);
      const audited = [
        ...vi.mocked(audit.logCreate).mock.calls,
        ...vi.mocked(audit.logUpdate).mock.calls,
        ...vi.mocked(audit.logSoftDelete).mock.calls,
      ];
      const surfaces = {
        'published events': published,
        'audit values': audited,
        'log lines': logs.lines,
      };
      for (const [surface, value] of Object.entries(surfaces)) {
        const text = JSON.stringify(value);
        for (const secret of [...SENTINEL_64_FORMS, fingerprint, ...hashes]) {
          expect(text, `${surface} must not contain a secret`).not.toContain(secret);
        }
      }
    });

    it('fails closed without the encryption key: no key is issued, nothing is audited or published, and the message names no secret', async () => {
      const logs = captureLogs();
      const { service, audit, events, storedCopies } = build({ exportable: { keyMaterial: '' } });

      const failure = await service
        .createApiKey({ name: 'Prod key', owner: { projectId, userId } })
        .catch((error: unknown) => error);
      logs.restore();

      expect(failure).toBeInstanceOf(ConfigurationError);
      const message = (failure as Error).message;
      expect(message).toContain('API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY');
      for (const form of SENTINEL_64_FORMS) {
        expect(message).not.toContain(form);
        expect(JSON.stringify(logs.lines)).not.toContain(form);
      }
      expect(storedCopies).toHaveLength(0);
      expect(audit.logCreate).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    });
  });
});
