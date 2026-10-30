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

function createService(rows: unknown[]) {
  const findHashesForExport = vi.fn().mockResolvedValue(rows);
  const logExport = vi.fn().mockResolvedValue(undefined);
  const listCredentialSummaries = vi.fn().mockResolvedValue([]);
  const service = new ProjectUserCredentialExportService(
    { findHashesForExport } as never,
    { logExport },
    { listCredentialSummaries } as never
  );
  return { service, findHashesForExport, logExport, listCredentialSummaries };
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
        { userId: withCredential, password: { algorithm: 'bcrypt', hash: HASH_A } },
        { userId: without, password: null },
        { userId: other, password: { algorithm: 'bcrypt', hash: HASH_C } },
      ],
    });
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
