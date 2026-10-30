import { createHash } from 'node:crypto';

import { CredentialKind } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { credentialFingerprint } from '@/lib/credential-fingerprint.lib';
import { ProjectUserCredentialExportService } from '@/services/project-user-credential-exports.service';

const projectId = '20000000-0000-4000-8000-000000000042';
const withCredential = '30000000-0000-4000-8000-0000000000aa';
const without = '30000000-0000-4000-8000-0000000000bb';
const other = '30000000-0000-4000-8000-0000000000cc';

/** Sentinel hashes: they may appear in the export result and nowhere else. */
const HASH_A = '$2b$10$SentinelHashAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const HASH_C = '$2b$10$SentinelHashCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';

/** Sentinel secrets: they may appear in the export result and nowhere else. */
const SECRET_1 = 'sentinel-client-secret-never-leaves-export-service-one==';
const SECRET_2 = 'sentinel-client-secret-never-leaves-export-service-two==';
const FINGERPRINT_1 = 'a'.repeat(64);
const FINGERPRINT_2 = 'b'.repeat(64);
const KEY_1 = '50000000-0000-4000-8000-000000000001';
const KEY_2 = '50000000-0000-4000-8000-000000000002';
const KEY_3 = '50000000-0000-4000-8000-000000000003';
const CLIENT_1 = '60000000-0000-4000-8000-000000000001';
const CLIENT_2 = '60000000-0000-4000-8000-000000000002';
const CLIENT_3 = '60000000-0000-4000-8000-000000000003';

const keyEntry = (
  userId: string,
  apiKeyId: string,
  clientId: string,
  secret: string | null,
  fingerprint: string | null
) => ({ userId, apiKeyId, clientId, fingerprint, secret });

function createService(rows: unknown[], keyEntries: unknown[] = []) {
  const findHashesForExport = vi.fn().mockResolvedValue(rows);
  const logExport = vi.fn().mockResolvedValue(undefined);
  const logApiKeyExport = vi.fn().mockResolvedValue(undefined);
  const listCredentialSummaries = vi.fn().mockResolvedValue([]);
  const readForExport = vi.fn().mockResolvedValue(keyEntries);
  const service = new ProjectUserCredentialExportService(
    { findHashesForExport } as never,
    { logExport },
    { listCredentialSummaries } as never,
    { readForExport } as never,
    { logExport: logApiKeyExport }
  );
  return {
    service,
    findHashesForExport,
    logExport,
    logApiKeyExport,
    listCredentialSummaries,
    readForExport,
  };
}

const row = (userId: string, hash: string, source = 'admin-set') => ({
  userId,
  hash,
  source,
  updatedAt: new Date('2026-10-28T10:00:00Z'),
});

describe('credentialFingerprint of an API-key secret', () => {
  it('is the lowercase hex sha256 of the secret string as issued, for both issued forms', () => {
    const base64Url43 = Buffer.alloc(32, 9).toString('base64url');
    const base64Padded88 = Buffer.alloc(64, 9).toString('base64');

    expect(base64Url43).toHaveLength(43);
    expect(base64Padded88).toHaveLength(88);
    for (const secret of [base64Url43, base64Padded88]) {
      expect(credentialFingerprint(secret)).toBe(
        createHash('sha256').update(secret, 'utf8').digest('hex')
      );
      expect(credentialFingerprint(secret)).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(credentialFingerprint(base64Url43)).not.toBe(credentialFingerprint(base64Padded88));
  });
});

describe('credentialFingerprint', () => {
  it('is the lowercase hex sha256 of the hash string, deterministic', () => {
    const expected = createHash('sha256').update(HASH_A, 'utf8').digest('hex');
    expect(credentialFingerprint(HASH_A)).toBe(expected);
    expect(credentialFingerprint(HASH_A)).toBe(credentialFingerprint(HASH_A));
    expect(credentialFingerprint(HASH_A)).toMatch(/^[0-9a-f]{64}$/);
    expect(credentialFingerprint(HASH_A)).not.toBe(credentialFingerprint(HASH_C));
  });
});

describe('ProjectUserCredentialExportService.exportCredentials', () => {
  it('reads once, returns request order with null for a member without a credential', async () => {
    const { service, findHashesForExport } = createService([
      row(other, HASH_C),
      row(withCredential, HASH_A),
    ]);
    const tx = { tx: true };

    const result = await service.exportCredentials(
      {
        projectId,
        userIds: [withCredential, without, other],
        kinds: [CredentialKind.Password],
      },
      tx as never
    );

    expect(findHashesForExport).toHaveBeenCalledTimes(1);
    expect(findHashesForExport).toHaveBeenCalledWith(
      { scope: 'project', projectId },
      [withCredential, without, other],
      tx
    );
    expect(result).toEqual({
      users: [
        {
          userId: withCredential,
          password: { algorithm: 'bcrypt', hash: HASH_A },
          apiKeySecrets: null,
        },
        { userId: without, password: null, apiKeySecrets: null },
        { userId: other, password: { algorithm: 'bcrypt', hash: HASH_C }, apiKeySecrets: null },
      ],
    });
  });

  it('kinds [PASSWORD] never reads or decrypts an API key and writes no API-key audit row', async () => {
    const { service, readForExport, logApiKeyExport } = createService(
      [row(withCredential, HASH_A)],
      [keyEntry(withCredential, KEY_1, CLIENT_1, SECRET_1, FINGERPRINT_1)]
    );

    const result = await service.exportCredentials(
      { projectId, userIds: [withCredential], kinds: [CredentialKind.Password] },
      undefined
    );

    expect(readForExport).not.toHaveBeenCalled();
    expect(logApiKeyExport).not.toHaveBeenCalled();
    expect(result.users[0]!.apiKeySecrets).toBeNull();
    expect(JSON.stringify(result)).not.toContain(SECRET_1);
  });

  it('writes exactly one audit row in the same transaction, with counts and kinds and no hash', async () => {
    const { service, logExport } = createService([row(withCredential, HASH_A)]);
    const tx = { tx: true };

    await service.exportCredentials(
      { projectId, userIds: [withCredential, without], kinds: [CredentialKind.Password] },
      tx as never
    );

    expect(logExport).toHaveBeenCalledTimes(1);
    expect(logExport).toHaveBeenCalledWith(
      { projectId, userCount: 2, credentialCount: 1, kinds: ['PASSWORD'] },
      tx
    );
    const logged = JSON.stringify(logExport.mock.calls);
    expect(logged).not.toContain(HASH_A);
    expect(logged).not.toContain(withCredential);
  });

  it('fails the export when the audit write fails', async () => {
    const { service, logExport } = createService([row(withCredential, HASH_A)]);
    logExport.mockRejectedValueOnce(new Error('audit down'));

    await expect(
      service.exportCredentials(
        { projectId, userIds: [withCredential], kinds: [CredentialKind.Password] },
        undefined
      )
    ).rejects.toThrow('audit down');
  });
});

describe('ProjectUserCredentialExportService.exportCredentials, kind API_KEY_SECRET', () => {
  const entries = () => [
    keyEntry(other, KEY_3, CLIENT_3, null, null),
    keyEntry(withCredential, KEY_1, CLIENT_1, SECRET_1, FINGERPRINT_1),
    keyEntry(withCredential, KEY_2, CLIENT_2, SECRET_2, FINGERPRINT_2),
  ];

  it('reads the keys once, in the project, in the caller transaction, and never reads a password hash', async () => {
    const { service, readForExport, findHashesForExport } = createService([], entries());
    const tx = { tx: true };

    await service.exportCredentials(
      {
        projectId,
        userIds: [withCredential, without, other],
        kinds: [CredentialKind.ApiKeySecret],
      },
      tx as never
    );

    expect(readForExport).toHaveBeenCalledTimes(1);
    expect(readForExport).toHaveBeenCalledWith(
      { projectId, userIds: [withCredential, without, other] },
      tx
    );
    expect(findHashesForExport).not.toHaveBeenCalled();
  });

  it('returns each member keys in request order: the secret for a key with a copy, null for one without, [] for none', async () => {
    const { service } = createService([], entries());

    const result = await service.exportCredentials(
      {
        projectId,
        userIds: [other, withCredential, without],
        kinds: [CredentialKind.ApiKeySecret],
      },
      undefined
    );

    expect(result).toEqual({
      users: [
        {
          userId: other,
          password: null,
          apiKeySecrets: [{ apiKeyId: KEY_3, clientId: CLIENT_3, fingerprint: null, secret: null }],
        },
        {
          userId: withCredential,
          password: null,
          apiKeySecrets: [
            { apiKeyId: KEY_1, clientId: CLIENT_1, fingerprint: FINGERPRINT_1, secret: SECRET_1 },
            { apiKeyId: KEY_2, clientId: CLIENT_2, fingerprint: FINGERPRINT_2, secret: SECRET_2 },
          ],
        },
        { userId: without, password: null, apiKeySecrets: [] },
      ],
    });
  });

  it('writes one summary row counting the secrets, and one API-key row per exported secret naming the key', async () => {
    const { service, logExport, logApiKeyExport } = createService([], entries());
    const tx = { tx: true };

    await service.exportCredentials(
      {
        projectId,
        userIds: [withCredential, without, other],
        kinds: [CredentialKind.ApiKeySecret],
      },
      tx as never
    );

    expect(logExport).toHaveBeenCalledTimes(1);
    expect(logExport).toHaveBeenCalledWith(
      { projectId, userCount: 3, credentialCount: 2, kinds: ['API_KEY_SECRET'] },
      tx
    );
    // Two secrets were exported; the key without a copy exported nothing and has no row.
    expect(logApiKeyExport).toHaveBeenCalledTimes(2);
    expect(logApiKeyExport).toHaveBeenNthCalledWith(
      1,
      { projectId, userId: withCredential, kind: 'API_KEY_SECRET' },
      tx,
      KEY_1
    );
    expect(logApiKeyExport).toHaveBeenNthCalledWith(
      2,
      { projectId, userId: withCredential, kind: 'API_KEY_SECRET' },
      tx,
      KEY_2
    );
  });

  it('puts no secret, fingerprint or hash in any audit call', async () => {
    const { service, logExport, logApiKeyExport } = createService(
      [row(withCredential, HASH_A)],
      entries()
    );

    await service.exportCredentials(
      {
        projectId,
        userIds: [withCredential],
        kinds: [CredentialKind.Password, CredentialKind.ApiKeySecret],
      },
      undefined
    );

    const logged = JSON.stringify([logExport.mock.calls, logApiKeyExport.mock.calls]);
    for (const forbidden of [SECRET_1, SECRET_2, FINGERPRINT_1, FINGERPRINT_2, HASH_A]) {
      expect(logged).not.toContain(forbidden);
    }
  });

  it('with both kinds returns the password and the keys, and counts hashes and secrets together', async () => {
    const { service, logExport, findHashesForExport, readForExport } = createService(
      [row(withCredential, HASH_A)],
      entries()
    );

    const result = await service.exportCredentials(
      {
        projectId,
        userIds: [withCredential, without],
        kinds: [CredentialKind.Password, CredentialKind.ApiKeySecret],
      },
      undefined
    );

    expect(findHashesForExport).toHaveBeenCalledTimes(1);
    expect(readForExport).toHaveBeenCalledTimes(1);
    expect(result.users[0]).toEqual({
      userId: withCredential,
      password: { algorithm: 'bcrypt', hash: HASH_A },
      apiKeySecrets: [
        { apiKeyId: KEY_1, clientId: CLIENT_1, fingerprint: FINGERPRINT_1, secret: SECRET_1 },
        { apiKeyId: KEY_2, clientId: CLIENT_2, fingerprint: FINGERPRINT_2, secret: SECRET_2 },
      ],
    });
    expect(result.users[1]).toEqual({ userId: without, password: null, apiKeySecrets: [] });
    expect(logExport).toHaveBeenCalledWith(
      { projectId, userCount: 2, credentialCount: 3, kinds: ['PASSWORD', 'API_KEY_SECRET'] },
      undefined
    );
  });

  it('a member without a copy of any key exports no secret and writes no API-key row', async () => {
    const { service, logExport, logApiKeyExport } = createService(
      [],
      [keyEntry(other, KEY_3, CLIENT_3, null, null)]
    );

    await service.exportCredentials(
      { projectId, userIds: [other], kinds: [CredentialKind.ApiKeySecret] },
      undefined
    );

    expect(logApiKeyExport).not.toHaveBeenCalled();
    expect(logExport).toHaveBeenCalledWith(
      { projectId, userCount: 1, credentialCount: 0, kinds: ['API_KEY_SECRET'] },
      undefined
    );
  });

  it('fails the export, returning no secret, when the summary audit write fails', async () => {
    const { service, logExport } = createService([], entries());
    logExport.mockRejectedValueOnce(new Error('audit down'));

    await expect(
      service.exportCredentials(
        { projectId, userIds: [withCredential], kinds: [CredentialKind.ApiKeySecret] },
        undefined
      )
    ).rejects.toThrow('audit down');
  });

  it('fails the export, returning no secret, when an API-key audit write fails', async () => {
    const { service, logApiKeyExport } = createService([], entries());
    logApiKeyExport.mockRejectedValueOnce(new Error('key audit down'));

    await expect(
      service.exportCredentials(
        { projectId, userIds: [withCredential], kinds: [CredentialKind.ApiKeySecret] },
        undefined
      )
    ).rejects.toThrow('key audit down');
  });

  it('writes no audit row when a copy cannot be decrypted', async () => {
    const { service, readForExport, logExport, logApiKeyExport } = createService([]);
    readForExport.mockRejectedValueOnce(
      new Error('Failed to decrypt an exportable API-key secret')
    );

    await expect(
      service.exportCredentials(
        { projectId, userIds: [withCredential], kinds: [CredentialKind.ApiKeySecret] },
        undefined
      )
    ).rejects.toThrow('Failed to decrypt');
    expect(logExport).not.toHaveBeenCalled();
    expect(logApiKeyExport).not.toHaveBeenCalled();
  });
});

describe('ProjectUserCredentialExportService.getPasswordCredentialSummaries', () => {
  it('returns source, updatedAt and the fingerprint, never the hash, and writes no audit row', async () => {
    const { service, logExport } = createService([row(withCredential, HASH_A)]);

    const summaries = await service.getPasswordCredentialSummaries({
      projectId,
      userIds: [withCredential, without],
    });

    expect(summaries).toEqual([
      {
        userId: withCredential,
        source: 'admin-set',
        updatedAt: new Date('2026-10-28T10:00:00Z'),
        fingerprint: credentialFingerprint(HASH_A),
      },
    ]);
    expect(JSON.stringify(summaries)).not.toContain(HASH_A);
    expect(logExport).not.toHaveBeenCalled();
  });
});

describe('ProjectUserCredentialExportService.getApiKeyCredentialSummaries', () => {
  const stored = {
    apiKeyId: '50000000-0000-4000-8000-000000000001',
    clientId: '50000000-0000-4000-8000-000000000002',
    clientSecretFingerprint: 'c'.repeat(64),
    hasCopy: true,
    updatedAt: new Date('2026-10-30T10:00:00Z'),
  };

  it('maps the stored fingerprint and copy flag, one entry per key, and nothing else', async () => {
    const { service, listCredentialSummaries } = createService([]);
    listCredentialSummaries.mockResolvedValue([
      stored,
      { ...stored, apiKeyId: '50000000-0000-4000-8000-000000000003', hasCopy: false },
    ]);

    const result = await service.getApiKeyCredentialSummaries({
      projectId,
      userId: withCredential,
    });

    expect(listCredentialSummaries).toHaveBeenCalledWith(
      { projectId, userId: withCredential },
      undefined
    );
    expect(result).toEqual([
      {
        apiKeyId: stored.apiKeyId,
        clientId: stored.clientId,
        fingerprint: stored.clientSecretFingerprint,
        exportable: true,
        updatedAt: stored.updatedAt,
      },
      expect.objectContaining({ exportable: false }),
    ]);
    expect(result.every((entry) => Object.keys(entry).length === 5)).toBe(true);
  });

  it('a legacy key (created before the fingerprint existed, not rotated since) has a null fingerprint', async () => {
    const { service, listCredentialSummaries } = createService([]);
    listCredentialSummaries.mockResolvedValue([{ ...stored, clientSecretFingerprint: null }]);

    const [entry] = await service.getApiKeyCredentialSummaries({
      projectId,
      userId: withCredential,
    });

    expect(entry.fingerprint).toBeNull();
  });

  it('is empty for a member with no key, writes no audit row and reads no password hash', async () => {
    const { service, logExport, findHashesForExport } = createService([]);

    await expect(
      service.getApiKeyCredentialSummaries({ projectId, userId: withCredential })
    ).resolves.toEqual([]);
    expect(logExport).not.toHaveBeenCalled();
    expect(findHashesForExport).not.toHaveBeenCalled();
  });
});
