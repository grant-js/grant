import { createHash } from 'node:crypto';

import type {
  IApiKeyExportableSecretRepository,
  IApiKeyRepository,
  IAuditLogger,
  IEventPublisher,
  IProjectRepository,
  SealedApiKeySecret,
} from '@grantjs/core';
import type { ApiKey } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ConfigurationError } from '@/lib/errors';
import { API_KEY_EXPORTABLE_SECRET_PURPOSE, unsealSecret } from '@/lib/sealed-secret.lib';
import { hashSecret, verifySecret } from '@/lib/token.lib';
import { ApiKeyExportableSecretService } from '@/services/api-key-exportable-secrets.service';
import { ApiKeyService } from '@/services/api-keys.service';

const projectId = '10000000-0000-4000-8000-000000000001';
const userId = '10000000-0000-4000-8000-000000000002';
const otherUserId = '10000000-0000-4000-8000-000000000003';
const apiKeyId = '10000000-0000-4000-8000-000000000005';
const createdBy = '10000000-0000-4000-8000-000000000006';
const KEY_MATERIAL = 'test-api-key-exportable-secret-key-material';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

interface StoredKey {
  id: string;
  clientId: string;
  hash: string;
  fingerprint: string | null;
  revoked: boolean;
  deleted: boolean;
}

/**
 * Real `ApiKeyService` and real `ApiKeyExportableSecretService` over in-memory repositories, so
 * the invariant "a copy, when present, decrypts to the secret the current hash verifies" is
 * checked against what the services really wrote.
 */
function build(
  options: {
    optedIn?: boolean;
    keyMaterial?: string;
    owners?: string[];
    projectIds?: string[];
  } = {}
) {
  const optedIn = options.optedIn ?? true;
  const keys = new Map<string, StoredKey>();
  const copies = new Map<string, { projectId: string; sealed: SealedApiKeySecret }>();
  const toApiKey = (key: StoredKey): ApiKey =>
    ({
      id: key.id,
      clientId: key.clientId,
      name: 'Key',
      description: null,
      expiresAt: null,
      lastUsedAt: null,
      isRevoked: key.revoked,
      revokedAt: null,
      revokedBy: null,
      createdBy,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: key.deleted ? new Date() : null,
    }) as ApiKey;

  const apiKeyRepository = {
    createApiKey: vi.fn(
      async (params: {
        clientId: string;
        clientSecretHash: string;
        clientSecretFingerprint?: string | null;
      }) => {
        const key: StoredKey = {
          id: apiKeyId,
          clientId: params.clientId,
          hash: params.clientSecretHash,
          fingerprint: params.clientSecretFingerprint ?? null,
          revoked: false,
          deleted: false,
        };
        keys.set(key.id, key);
        return toApiKey(key);
      }
    ),
    getApiKey: vi.fn(async (id: string) => (keys.has(id) ? toApiKey(keys.get(id)!) : null)),
    getOwningUserIds: vi.fn(async () => options.owners ?? [userId]),
    updateClientSecretHash: vi.fn(async (id: string, hash: string, fingerprint: string | null) => {
      const key = keys.get(id)!;
      key.hash = hash;
      key.fingerprint = fingerprint;
      return toApiKey(key);
    }),
    revokeApiKey: vi.fn(async (id: string) => {
      const key = keys.get(id)!;
      key.revoked = true;
      return toApiKey(key);
    }),
    softDeleteApiKey: vi.fn(async (id: string) => {
      const key = keys.get(id)!;
      key.deleted = true;
      return toApiKey(key);
    }),
    hardDeleteApiKey: vi.fn(async (id: string) => {
      const key = keys.get(id)!;
      keys.delete(id);
      return toApiKey(key);
    }),
    createApiKeys: vi.fn(async (rows: Array<{ clientId: string }>) =>
      rows.map((row, index) =>
        toApiKey({
          id: `${apiKeyId.slice(0, -1)}${index + 1}`,
          clientId: row.clientId,
          hash: '',
          fingerprint: null,
          revoked: false,
          deleted: false,
        })
      )
    ),
    hardDeleteApiKeys: vi.fn(async (ids: readonly string[]) => {
      ids.forEach((id) => keys.delete(id));
    }),
    getApiKeys: vi.fn(async (params: { ids: string[] }) => ({
      apiKeys: params.ids.filter((id) => keys.has(id)).map((id) => toApiKey(keys.get(id)!)),
    })),
    setMissingClientSecretFingerprints: vi.fn(),
  } as unknown as IApiKeyRepository;

  const copyRepository = {
    upsertForKey: vi.fn(
      async (params: { apiKeyId: string; projectId: string; sealed: SealedApiKeySecret }) => {
        copies.set(params.apiKeyId, { projectId: params.projectId, sealed: params.sealed });
      }
    ),
    deleteForKeys: vi.fn(async (ids: readonly string[]) => {
      const before = copies.size;
      ids.forEach((id) => copies.delete(id));
      return before - copies.size;
    }),
    deleteForProject: vi.fn(async () => 0),
    listCredentialSummaries: vi.fn(async () => []),
  } satisfies IApiKeyExportableSecretRepository;

  const projects = {
    isExportableApiKeySecretsEnabled: vi.fn(async () => optedIn),
  } as unknown as IProjectRepository;
  const resolve = vi.fn(async () => options.keyMaterial ?? KEY_MATERIAL);
  const exportableSecrets = new ApiKeyExportableSecretService(copyRepository, projects, {
    resolve,
  } as never);

  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  } as unknown as IAuditLogger;
  const events = {
    publish: vi.fn(),
    resolveLinkedProjectIds: vi.fn().mockResolvedValue(options.projectIds ?? [projectId]),
  } as unknown as IEventPublisher;

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

  /** The invariant: a copy, when present, decrypts to a string the key's current hash verifies. */
  const assertCopyMatchesHash = (id: string) => {
    const copy = copies.get(id);
    if (!copy) return;
    const secret = unsealSecret(copy.sealed, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE);
    expect(verifySecret(secret, keys.get(id)!.hash)).toBe(true);
  };

  return {
    service,
    keys,
    copies,
    audit,
    events,
    projects,
    copyRepository,
    apiKeyRepository,
    resolve,
    assertCopyMatchesHash,
  };
}

const OWNER = { projectId, userId };

describe('ApiKeyService.createApiKey, exportable secrets', () => {
  it('opted in, with an owner: issues 88 characters of standard base64 and writes the copy', async () => {
    const { service, copies, assertCopyMatchesHash, keys } = build({ optedIn: true });

    const created = await service.createApiKey({ name: 'Key', owner: OWNER });

    expect(created.clientSecret).toMatch(/^[A-Za-z0-9+/]{86}==$/);
    expect(created.clientSecret).toHaveLength(88);
    expect(Buffer.from(created.clientSecret, 'base64')).toHaveLength(64);
    expect(copies.get(apiKeyId)?.projectId).toBe(projectId);
    assertCopyMatchesHash(apiKeyId);
    expect(verifySecret(created.clientSecret, keys.get(apiKeyId)!.hash)).toBe(true);
  });

  it("not opted in, with an owner: Grant's own 43-character form, no copy, fingerprint still stored", async () => {
    const { service, copies, keys, copyRepository } = build({ optedIn: false });

    const created = await service.createApiKey({ name: 'Key', owner: OWNER });

    expect(created.clientSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(copies.size).toBe(0);
    expect(copyRepository.upsertForKey).not.toHaveBeenCalled();
    expect(keys.get(apiKeyId)!.fingerprint).toBe(sha256(created.clientSecret));
  });

  it('without an owner (account and organization-project keys): never asks the flag, 43 characters, no copy, no fingerprint', async () => {
    const { service, copies, keys, projects } = build({ optedIn: true });

    const created = await service.createApiKey({ name: 'Key' });

    expect(created.clientSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(projects.isExportableApiKeySecretsEnabled).not.toHaveBeenCalled();
    expect(copies.size).toBe(0);
    expect(keys.get(apiKeyId)!.fingerprint).toBeNull();
  });

  it('the fingerprint is the SHA-256 of the issued string, never of the bcrypt hash', async () => {
    const { service, keys } = build({ optedIn: true });

    const created = await service.createApiKey({ name: 'Key', owner: OWNER });
    const fingerprint = keys.get(apiKeyId)!.fingerprint;

    expect(fingerprint).toBe(sha256(created.clientSecret));
    expect(fingerprint).not.toBe(sha256(keys.get(apiKeyId)!.hash));
  });

  it('fails closed without the encryption key: ConfigurationError naming the variable, no audit, no event', async () => {
    const { service, audit, events, copies } = build({ optedIn: true, keyMaterial: '' });

    const failure = await service
      .createApiKey({ name: 'Key', owner: OWNER })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ConfigurationError);
    expect((failure as Error).message).toContain('API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY');
    expect(copies.size).toBe(0);
    expect(audit.logCreate).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('not opted in, the missing key is irrelevant: the key is issued', async () => {
    const { service } = build({ optedIn: false, keyMaterial: '' });
    await expect(service.createApiKey({ name: 'Key', owner: OWNER })).resolves.toMatchObject({
      id: apiKeyId,
    });
  });
});

describe('ApiKeyService.rotateApiKey, exportable secrets', () => {
  it('opted in, one owner: issues 88 characters and replaces the copy in place', async () => {
    const { service, copies, keys, assertCopyMatchesHash } = build({ optedIn: true });
    const created = await service.createApiKey({ name: 'Key', owner: OWNER });
    const firstCopy = copies.get(apiKeyId)!.sealed.encryptedSecret;

    const rotated = await service.rotateApiKey({ id: apiKeyId });

    expect(rotated.clientSecret).toHaveLength(88);
    expect(rotated.clientSecret).not.toBe(created.clientSecret);
    expect(copies.size).toBe(1);
    expect(copies.get(apiKeyId)!.sealed.encryptedSecret).not.toBe(firstCopy);
    assertCopyMatchesHash(apiKeyId);
    expect(keys.get(apiKeyId)!.fingerprint).toBe(sha256(rotated.clientSecret));
    expect(
      unsealSecret(copies.get(apiKeyId)!.sealed, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE)
    ).toBe(rotated.clientSecret);
  });

  it('not opted in, one owner: 43 characters, no copy, fingerprint replaced', async () => {
    const { service, copies, keys } = build({ optedIn: false });
    await service.createApiKey({ name: 'Key', owner: OWNER });

    const rotated = await service.rotateApiKey({ id: apiKeyId });

    expect(rotated.clientSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(copies.size).toBe(0);
    expect(keys.get(apiKeyId)!.fingerprint).toBe(sha256(rotated.clientSecret));
  });

  it('no owner in project_user_api_keys: never asks the flag, 43 characters, no copy, no fingerprint', async () => {
    const { service, copies, keys, projects } = build({ optedIn: true, owners: [] });
    await service.createApiKey({ name: 'Key' });

    const rotated = await service.rotateApiKey({ id: apiKeyId });

    expect(rotated.clientSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(projects.isExportableApiKeySecretsEnabled).not.toHaveBeenCalled();
    expect(copies.size).toBe(0);
    expect(keys.get(apiKeyId)!.fingerprint).toBeNull();
  });

  it('two owners are not a project-user key: no copy and no fingerprint', async () => {
    const { service, copies, keys } = build({ optedIn: true, owners: [userId, otherUserId] });
    await service.createApiKey({ name: 'Key' });

    await service.rotateApiKey({ id: apiKeyId });

    expect(copies.size).toBe(0);
    expect(keys.get(apiKeyId)!.fingerprint).toBeNull();
  });

  it('fails closed without the encryption key: ConfigurationError before the audit row and the event', async () => {
    const built = build({ optedIn: true });
    await built.service.createApiKey({ name: 'Key', owner: OWNER });
    vi.mocked(built.events.publish).mockClear();
    vi.mocked(built.audit.logUpdate).mockClear();
    built.resolve.mockResolvedValue('' as never);

    // The in-memory repository does not roll back (the request's transaction does): what the
    // service owes is to stop before it records or announces a rotation that did not happen.
    await expect(built.service.rotateApiKey({ id: apiKeyId })).rejects.toBeInstanceOf(
      ConfigurationError
    );

    expect(built.audit.logUpdate).not.toHaveBeenCalled();
    expect(built.events.publish).not.toHaveBeenCalled();
  });

  it('a rotate that writes no new copy deletes a copy left over from the previous secret', async () => {
    // The key had a copy; it is no longer a single-owner project-user key (no owner row left).
    const built = build({ optedIn: true, owners: [] });
    await built.service.createApiKey({ name: 'Key', owner: OWNER });
    expect(built.copies.size).toBe(1);

    await built.service.rotateApiKey({ id: apiKeyId });

    expect(built.copies.size).toBe(0);
    expect(built.copyRepository.deleteForKeys).toHaveBeenCalledWith([apiKeyId], undefined);
  });
});

describe('the copy never outlives its hash', () => {
  it('revoke deletes the copy', async () => {
    const { service, copies, copyRepository } = build({ optedIn: true });
    await service.createApiKey({ name: 'Key', owner: OWNER });
    expect(copies.size).toBe(1);

    await service.revokeApiKey({ id: apiKeyId });

    expect(copyRepository.deleteForKeys).toHaveBeenCalledWith([apiKeyId], undefined);
    expect(copies.size).toBe(0);
  });

  it('soft delete deletes the copy', async () => {
    const { service, copies } = build({ optedIn: true });
    await service.createApiKey({ name: 'Key', owner: OWNER });

    await service.deleteApiKey({ id: apiKeyId });

    expect(copies.size).toBe(0);
  });

  it('hard delete deletes the copy', async () => {
    const { service, copies } = build({ optedIn: true });
    await service.createApiKey({ name: 'Key', owner: OWNER });

    await service.deleteApiKey({ id: apiKeyId, hardDelete: true });

    expect(copies.size).toBe(0);
  });

  it('a CDM replace delete deletes the copy', async () => {
    const { service, copies } = build({ optedIn: true });
    await service.createApiKey({ name: 'Key', owner: OWNER });

    await service.deleteApiKeysForCdmImport({ ids: [apiKeyId] });

    expect(copies.size).toBe(0);
  });

  it('a CDM rotate deletes the copy and writes no copy of the imported secret', async () => {
    const { service, copies, keys, copyRepository } = build({ optedIn: true });
    await service.createApiKey({ name: 'Key', owner: OWNER });
    const importedSecret = 'imported-by-the-receiver-'.padEnd(64, 'x');
    copyRepository.upsertForKey.mockClear();

    await service.rotateApiKeysForCdmImport({
      keys: [
        {
          id: apiKeyId,
          clientSecretHash: hashSecret(importedSecret),
          clientSecretFingerprint: sha256(importedSecret),
        },
      ],
    });

    expect(copies.size).toBe(0);
    expect(copyRepository.upsertForKey).not.toHaveBeenCalled();
    expect(keys.get(apiKeyId)!.fingerprint).toBe(sha256(importedSecret));
  });

  it('a CDM rotate that supplied only a hash clears the stale fingerprint', async () => {
    const { service, keys } = build({ optedIn: true });
    await service.createApiKey({ name: 'Key', owner: OWNER });
    expect(keys.get(apiKeyId)!.fingerprint).not.toBeNull();

    await service.rotateApiKeysForCdmImport({
      keys: [{ id: apiKeyId, clientSecretHash: hashSecret('only-a-hash-was-supplied') }],
    });

    expect(keys.get(apiKeyId)!.fingerprint).toBeNull();
  });

  it('holds across create, rotate and rotate again: the copy, when present, verifies against the current hash', async () => {
    const { service, assertCopyMatchesHash } = build({ optedIn: true });

    await service.createApiKey({ name: 'Key', owner: OWNER });
    assertCopyMatchesHash(apiKeyId);
    await service.rotateApiKey({ id: apiKeyId });
    assertCopyMatchesHash(apiKeyId);
    await service.rotateApiKey({ id: apiKeyId });
    assertCopyMatchesHash(apiKeyId);
  });
});

describe('bcrypt verifies the first 72 bytes only', () => {
  it('an 88-character secret verifies against a string that differs only after byte 72', () => {
    const secret = Buffer.alloc(64, 7).toString('base64');
    const hash = hashSecret(secret);
    const differsAfter72 = secret.slice(0, 72) + 'A'.repeat(16);

    expect(secret).toHaveLength(88);
    expect(differsAfter72).not.toBe(secret);
    expect(verifySecret(secret, hash)).toBe(true);
    expect(verifySecret(differsAfter72, hash)).toBe(true);
    expect(verifySecret('C' + secret.slice(1), hash)).toBe(false);
  });
});

describe('the fingerprint on the CDM import paths', () => {
  it('a BYOK secret created through createApiKeyForCdmImport is fingerprinted, and gets no copy', async () => {
    const { service, keys, copies } = build({ optedIn: true });
    const secret = 'byok-secret-supplied-by-the-importer-'.padEnd(64, 'y');

    await service.createApiKeyForCdmImport({ clientSecret: secret });

    expect(keys.get(apiKeyId)!.fingerprint).toBe(sha256(secret));
    expect(copies.size).toBe(0);
  });

  it('a batch create stores the fingerprint it is given and null when it is not given one', async () => {
    const { service, apiKeyRepository } = build({ optedIn: true });
    const fingerprint = sha256('some-secret');

    await service.createApiKeysForCdmImport({
      keys: [
        { clientSecretHash: hashSecret('some-secret'), clientSecretFingerprint: fingerprint },
        { clientSecretHash: hashSecret('hash-only') },
      ],
    });

    const rows = vi.mocked(apiKeyRepository.createApiKeys).mock.calls[0][0];
    expect(rows.map((row) => row.clientSecretFingerprint)).toEqual([fingerprint, null]);
  });

  it('fills a missing fingerprint on keys a replace leaves unchanged, and rejects a value that is not a SHA-256 hex', async () => {
    const { service, apiKeyRepository } = build({ optedIn: true });
    const fingerprint = sha256('kept-secret');

    await service.setMissingClientSecretFingerprintsForCdmImport({
      keys: [{ id: apiKeyId, clientSecretFingerprint: fingerprint }],
    });
    expect(apiKeyRepository.setMissingClientSecretFingerprints).toHaveBeenCalledWith(
      [{ id: apiKeyId, clientSecretFingerprint: fingerprint }],
      undefined
    );

    await expect(
      service.setMissingClientSecretFingerprintsForCdmImport({
        keys: [{ id: apiKeyId, clientSecretFingerprint: '$2b$10$not-a-sha256' }],
      })
    ).rejects.toThrow();
  });
});
