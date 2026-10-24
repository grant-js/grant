import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    jwt: { jwksHttpCacheTtlSeconds: 30, systemSigningKeyCacheTtlSeconds: 300 },
    system: { systemUserId: 'system-user' },
  },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

import { JWKS_HTTP_CACHE_PREFIX, VERIFICATION_KEY_CACHE_PREFIX } from '@/constants/cache.constants';
import { GrantService } from '@/services/grant.service';

const systemKeys = [{ kid: 'sys-1', publicKeyPem: 'pem-sys' }];
const orgKeys = [{ kid: 'org-1', publicKeyPem: 'pem-org' }];
const otherOrgKeys = [{ kid: 'org-2', publicKeyPem: 'pem-other' }];
const cutoff = new Date('2026-01-01T00:00:00.000Z');

describe('GrantService.getPublicKeysForJwks (HTTP cache)', () => {
  const get = vi.fn();
  const set = vi.fn();
  const cache = { signingKeys: { get, set } };
  const getPublicKeysForJwksByScope = vi.fn();
  const getPublicKeyPemByKid = vi.fn();
  const signingKeyService = { getPublicKeysForJwksByScope, getPublicKeyPemByKid };

  function createService(): GrantService {
    return new GrantService(cache as never, {} as never, signingKeyService as never);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.jwt.jwksHttpCacheTtlSeconds = 30;
    get.mockResolvedValue(undefined);
    set.mockResolvedValue(undefined);
    getPublicKeysForJwksByScope.mockResolvedValue(systemKeys);
  });

  it('misses the cache, loads from the repository, and stores the payload', async () => {
    const service = createService();

    await expect(service.getPublicKeysForJwks(null, cutoff)).resolves.toEqual(systemKeys);

    expect(getPublicKeysForJwksByScope).toHaveBeenCalledTimes(1);
    expect(getPublicKeyPemByKid).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(`${JWKS_HTTP_CACHE_PREFIX}system:system-user`, systemKeys, 30);
  });

  it('returns a cache hit without loading keys again', async () => {
    get.mockResolvedValue(systemKeys);
    const service = createService();

    await expect(service.getPublicKeysForJwks(null, cutoff)).resolves.toEqual(systemKeys);

    expect(getPublicKeysForJwksByScope).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('isolates payloads per issuer', async () => {
    const orgScope = {
      tenant: Tenant.OrganizationProject,
      id: 'org-a:proj-a',
    };
    const otherScope = {
      tenant: Tenant.OrganizationProject,
      id: 'org-b:proj-b',
    };
    getPublicKeysForJwksByScope.mockImplementation(async (_tenant: string, id: string) =>
      id === orgScope.id ? orgKeys : otherOrgKeys
    );
    const service = createService();

    await expect(service.getPublicKeysForJwks(orgScope, cutoff)).resolves.toEqual(orgKeys);
    await expect(service.getPublicKeysForJwks(otherScope, cutoff)).resolves.toEqual(otherOrgKeys);

    expect(set).toHaveBeenCalledWith(
      `${JWKS_HTTP_CACHE_PREFIX}${orgScope.tenant}:${orgScope.id}`,
      orgKeys,
      30
    );
    expect(set).toHaveBeenCalledWith(
      `${JWKS_HTTP_CACHE_PREFIX}${otherScope.tenant}:${otherScope.id}`,
      otherOrgKeys,
      30
    );
    expect(getPublicKeysForJwksByScope).toHaveBeenCalledTimes(2);
  });

  it('treats an empty payload as a hit so missing issuers do not re-hit the database', async () => {
    get.mockResolvedValue([]);
    const service = createService();

    await expect(service.getPublicKeysForJwks(null, cutoff)).resolves.toEqual([]);

    expect(getPublicKeysForJwksByScope).not.toHaveBeenCalled();
  });

  it('does not use the verification kid cache', async () => {
    const service = createService();
    await service.getPublicKeysForJwks(null, cutoff);

    expect(
      get.mock.calls.every(([key]) => !String(key).startsWith(VERIFICATION_KEY_CACHE_PREFIX))
    ).toBe(true);
  });
});
