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
  const service = new ProjectUserCredentialExportService({ findHashesForExport } as never, {
    logExport,
  });
  return { service, findHashesForExport, logExport };
}

const row = (userId: string, hash: string, source = 'admin-set') => ({
  userId,
  hash,
  source,
  updatedAt: new Date('2026-10-28T10:00:00Z'),
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
