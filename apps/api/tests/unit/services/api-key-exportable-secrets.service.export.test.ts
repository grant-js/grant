/**
 * `readForExport` is the one decrypt path of an exportable copy: the key is resolved at the
 * point of use and only when a copy is to be opened, a failure names the variable and nothing
 * secret, and the plaintext goes only into the returned entries.
 */
import { describe, expect, it, vi } from 'vitest';

import { ConfigurationError } from '@/lib/errors';
import {
  API_KEY_EXPORTABLE_SECRET_PURPOSE,
  PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE,
  sealSecret,
} from '@/lib/sealed-secret.lib';
import { ApiKeyExportableSecretService } from '@/services/api-key-exportable-secrets.service';

const projectId = '10000000-0000-4000-8000-000000000001';
const userA = '10000000-0000-4000-8000-0000000000aa';
const userB = '10000000-0000-4000-8000-0000000000bb';
const KEY_MATERIAL = 'sentinel-api-key-exportable-key-material';
const SECRET_A = 'sentinel-client-secret-never-leaves-read-for-export-a';
const tx = { __tx: true } as never;

const sealedA = sealSecret(SECRET_A, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE);
const rowFor = (userId: string, apiKeyId: string, sealed: typeof sealedA | null) => ({
  userId,
  apiKeyId,
  clientId: `client-${apiKeyId}`,
  clientSecretFingerprint: sealed ? 'f'.repeat(64) : null,
  sealed,
});

function build(rows: unknown[], keyMaterial: string | null = KEY_MATERIAL) {
  const copies = { findSealedForExport: vi.fn().mockResolvedValue(rows) };
  const resolve = vi.fn().mockResolvedValue(keyMaterial);
  const service = new ApiKeyExportableSecretService(
    copies as never,
    {} as never,
    { resolve } as never
  );
  return { service, copies, resolve };
}

describe('ApiKeyExportableSecretService.readForExport', () => {
  it('reads in the project and the caller transaction, and returns the plaintext of a key with a copy and null for one without', async () => {
    const { service, copies, resolve } = build([
      rowFor(userA, 'key-1', sealedA),
      rowFor(userB, 'key-2', null),
    ]);

    const entries = await service.readForExport({ projectId, userIds: [userA, userB] }, tx);

    expect(copies.findSealedForExport).toHaveBeenCalledWith(
      { projectId, userIds: [userA, userB] },
      tx
    );
    expect(resolve).toHaveBeenCalledWith('API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY');
    expect(entries).toEqual([
      {
        userId: userA,
        apiKeyId: 'key-1',
        clientId: 'client-key-1',
        fingerprint: 'f'.repeat(64),
        secret: SECRET_A,
      },
      {
        userId: userB,
        apiKeyId: 'key-2',
        clientId: 'client-key-2',
        fingerprint: null,
        secret: null,
      },
    ]);
  });

  it('resolves the key at every call (no cached key material)', async () => {
    const { service, resolve } = build([rowFor(userA, 'key-1', sealedA)]);

    await service.readForExport({ projectId, userIds: [userA] });
    await service.readForExport({ projectId, userIds: [userA] });

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('does not need the key when no key has a copy, and for no keys at all', async () => {
    const { service, resolve } = build([rowFor(userA, 'key-1', null)], null);

    await expect(service.readForExport({ projectId, userIds: [userA] })).resolves.toEqual([
      expect.objectContaining({ apiKeyId: 'key-1', secret: null }),
    ]);
    expect(resolve).not.toHaveBeenCalled();

    const none = build([], null);
    await expect(none.service.readForExport({ projectId, userIds: [userA] })).resolves.toEqual([]);
  });

  it.each([
    ['empty', ''],
    ['null', null],
  ])(
    'a %s key with a copy to open is a ConfigurationError naming the variable',
    async (_label, keyMaterial) => {
      const { service } = build([rowFor(userA, 'key-1', sealedA)], keyMaterial);

      const failure = await service
        .readForExport({ projectId, userIds: [userA] })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ConfigurationError);
      expect((failure as Error).message).toBe(
        'API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY must be configured'
      );
    }
  );

  it.each([
    [
      'another key material',
      sealSecret(SECRET_A, 'another-key-material', API_KEY_EXPORTABLE_SECRET_PURPOSE),
    ],
    [
      'another purpose',
      sealSecret(SECRET_A, KEY_MATERIAL, PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE),
    ],
    ['a tampered tag', { ...sealedA, secretTag: Buffer.alloc(16, 1).toString('base64') }],
  ])(
    'a copy sealed under %s does not decrypt: ConfigurationError naming the variable, never a secret',
    async (_label, sealed) => {
      const { service } = build([rowFor(userA, 'key-1', sealed)]);

      const failure = await service
        .readForExport({ projectId, userIds: [userA] })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ConfigurationError);
      expect((failure as Error).message).toBe(
        'Failed to decrypt an exportable API-key secret; check API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY'
      );
      expect((failure as Error).message).not.toContain(SECRET_A);
      expect((failure as Error).message).not.toContain(KEY_MATERIAL);
      expect((failure as Error).cause).toBeUndefined();
    }
  );
});
