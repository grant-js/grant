import { describe, expect, it, vi } from 'vitest';

import { ConfigurationError } from '@/lib/errors';
import {
  API_KEY_EXPORTABLE_SECRET_PURPOSE,
  PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE,
  unsealSecret,
} from '@/lib/sealed-secret.lib';
import { ApiKeyExportableSecretService } from '@/services/api-key-exportable-secrets.service';

const projectId = '10000000-0000-4000-8000-000000000001';
const apiKeyId = '10000000-0000-4000-8000-000000000005';
const KEY_MATERIAL = 'sentinel-api-key-exportable-key-material';
const SECRET = 'sentinel-client-secret-never-leaves-service-test';
const tx = { __tx: true } as never;

function build(keyMaterial: string | null = KEY_MATERIAL, enabled = true) {
  const copies = {
    upsertForKey: vi.fn().mockResolvedValue(undefined),
    deleteForKeys: vi.fn().mockResolvedValue(2),
    deleteForProject: vi.fn().mockResolvedValue(5),
    listCredentialSummaries: vi.fn(),
  };
  const projects = { isExportableApiKeySecretsEnabled: vi.fn().mockResolvedValue(enabled) };
  const resolve = vi.fn().mockResolvedValue(keyMaterial);
  const service = new ApiKeyExportableSecretService(
    copies as never,
    projects as never,
    { resolve } as never
  );
  return { service, copies, projects, resolve };
}

describe('ApiKeyExportableSecretService', () => {
  it('storeForKey seals under the dedicated key and purpose, and writes only the sealed triple', async () => {
    const { service, copies, resolve } = build();

    await service.storeForKey({ apiKeyId, projectId, clientSecret: SECRET }, tx);

    expect(resolve).toHaveBeenCalledWith('API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY');
    expect(copies.upsertForKey).toHaveBeenCalledTimes(1);
    const [params, transaction] = copies.upsertForKey.mock.calls[0];
    expect(transaction).toBe(tx);
    expect(params).toEqual({ apiKeyId, projectId, sealed: expect.any(Object) });
    expect(JSON.stringify(params)).not.toContain(SECRET);
    expect(unsealSecret(params.sealed, KEY_MATERIAL, API_KEY_EXPORTABLE_SECRET_PURPOSE)).toBe(
      SECRET
    );
    expect(() =>
      unsealSecret(params.sealed, KEY_MATERIAL, PROJECT_OAUTH_CONNECTION_SECRET_PURPOSE)
    ).toThrow();
  });

  it('resolves the key at the point of use, every time (no cached key material)', async () => {
    const { service, resolve } = build();

    await service.storeForKey({ apiKeyId, projectId, clientSecret: SECRET }, tx);
    await service.storeForKey({ apiKeyId, projectId, clientSecret: SECRET }, tx);

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['empty', ''],
    ['null', null],
  ])(
    'storeForKey with a %s key throws ConfigurationError naming the variable and writes nothing',
    async (_label, keyMaterial) => {
      const { service, copies } = build(keyMaterial);

      const failure = await service
        .storeForKey({ apiKeyId, projectId, clientSecret: SECRET }, tx)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ConfigurationError);
      expect((failure as Error).message).toBe(
        'API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY must be configured'
      );
      expect((failure as Error).message).not.toContain(SECRET);
      expect(copies.upsertForKey).not.toHaveBeenCalled();
    }
  );

  it('isEnabled reads the project flag in the caller transaction', async () => {
    const { service, projects } = build(KEY_MATERIAL, false);

    await expect(service.isEnabled(projectId, tx)).resolves.toBe(false);
    expect(projects.isExportableApiKeySecretsEnabled).toHaveBeenCalledWith(projectId, tx);
  });

  it('removeForKeys and removeForProject delegate and report the number deleted', async () => {
    const { service, copies } = build();

    await expect(service.removeForKeys([apiKeyId], tx)).resolves.toBe(2);
    await expect(service.removeForProject(projectId, tx)).resolves.toBe(5);
    expect(copies.deleteForKeys).toHaveBeenCalledWith([apiKeyId], tx);
    expect(copies.deleteForProject).toHaveBeenCalledWith(projectId, tx);
  });
});
