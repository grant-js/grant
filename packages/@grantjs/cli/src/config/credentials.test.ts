import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./storage.js', () => ({
  loadProfile: vi.fn(),
}));

const { loadProfile } = await import('./storage.js');
const { resolveRuntimeContext } = await import('./credentials.js');

describe('resolveRuntimeContext', () => {
  const envKeys = [
    'GRANT_PROFILE',
    'GRANT_API_URL',
    'GRANT_CLIENT_ID',
    'GRANT_CLIENT_SECRET',
    'GRANT_SCOPE_TENANT',
    'GRANT_SCOPE_ID',
    'GRANT_ORIGIN_VERIFY',
    'GRANT_ACCESS_TOKEN',
  ] as const;
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envKeys) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
    vi.mocked(loadProfile).mockReset();
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it('uses GRANT_ACCESS_TOKEN and GRANT_API_URL without a profile file', async () => {
    process.env.GRANT_API_URL = 'https://grant.example.com';
    process.env.GRANT_ACCESS_TOKEN = 'env-token';
    vi.mocked(loadProfile).mockResolvedValue(null);
    const ctx = await resolveRuntimeContext();
    expect(ctx.apiUrl).toBe('https://grant.example.com');
    expect(ctx.authMethod).toBe('token');
    expect(ctx.config.session?.token).toBe('env-token');
  });

  it('builds an api-key config from env', async () => {
    process.env.GRANT_API_URL = 'https://grant.example.com';
    process.env.GRANT_CLIENT_ID = '11111111-1111-4111-8111-111111111111';
    process.env.GRANT_CLIENT_SECRET = 'x'.repeat(32);
    process.env.GRANT_SCOPE_TENANT = 'organizationProject';
    process.env.GRANT_SCOPE_ID = 'org:proj';
    process.env.GRANT_ORIGIN_VERIFY = 'ov';
    vi.mocked(loadProfile).mockResolvedValue(null);
    const ctx = await resolveRuntimeContext();
    expect(ctx.config.authMethod).toBe('api-key');
    expect(ctx.config.apiKey?.clientId).toBe('11111111-1111-4111-8111-111111111111');
    expect(ctx.originVerifySecret).toBe('ov');
    expect(ctx.scope).toEqual({ tenant: 'organizationProject', id: 'org:proj' });
  });

  it('overrides profile scope with flags', async () => {
    vi.mocked(loadProfile).mockResolvedValue({
      profileName: 'default',
      file: { defaultProfile: 'default', profiles: {} },
      config: {
        apiUrl: 'http://localhost:4000',
        authMethod: 'session',
        session: { token: 't' },
        selectedScope: { tenant: 'accountProject', id: 'a:b' },
      },
    });
    const ctx = await resolveRuntimeContext({
      tenant: 'organizationProject',
      scopeId: 'o:p',
    });
    expect(ctx.scope).toEqual({ tenant: 'organizationProject', id: 'o:p' });
  });
});
