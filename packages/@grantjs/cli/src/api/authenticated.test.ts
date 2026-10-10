import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/credentials.js', () => ({
  resolveRuntimeContext: vi.fn(),
}));
vi.mock('../config/resolve-token.js', () => ({
  resolveAccessToken: vi.fn(),
  refreshAndPersistSession: vi.fn(),
}));
vi.mock('./transport.js', () => ({
  apiRequest: vi.fn(),
}));

const { resolveRuntimeContext } = await import('../config/credentials.js');
const { refreshAndPersistSession, resolveAccessToken } = await import('../config/resolve-token.js');
const { apiRequest } = await import('./transport.js');
const { CliError } = await import('./errors.js');
const { authenticatedRequest } = await import('./authenticated.js');

describe('authenticatedRequest', () => {
  beforeEach(() => {
    vi.mocked(resolveRuntimeContext).mockReset();
    vi.mocked(resolveAccessToken).mockReset();
    vi.mocked(refreshAndPersistSession).mockReset();
    vi.mocked(apiRequest).mockReset();
    vi.mocked(resolveRuntimeContext).mockResolvedValue({
      apiUrl: 'http://localhost:4000',
      authMethod: 'session',
      profileName: 'default',
      originVerifySecret: undefined,
      scope: { tenant: 'organizationProject', id: 'o:p' },
      config: {
        apiUrl: 'http://localhost:4000',
        authMethod: 'session',
        session: { token: 'old', refreshToken: 'rt' },
        selectedScope: { tenant: 'organizationProject', id: 'o:p' },
      },
    });
    vi.mocked(resolveAccessToken).mockResolvedValue('old');
  });

  it('injects scope query params', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ status: 200, data: [] });
    await authenticatedRequest({ method: 'GET', path: '/api/users' });
    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { scopeId: 'o:p', tenant: 'organizationProject' },
        token: 'old',
      })
    );
  });

  it('refreshes a session once after 401', async () => {
    vi.mocked(apiRequest)
      .mockRejectedValueOnce(new CliError('Unauthorized', 2))
      .mockResolvedValueOnce({ status: 200, data: { ok: true } });
    vi.mocked(refreshAndPersistSession).mockResolvedValue('new');
    const result = await authenticatedRequest({
      method: 'GET',
      path: '/api/me',
      injectScope: false,
    });
    expect(refreshAndPersistSession).toHaveBeenCalled();
    expect(result.data).toEqual({ ok: true });
    expect(vi.mocked(apiRequest).mock.calls[1]?.[0]).toMatchObject({ token: 'new' });
  });

  it('tells the user to re-authenticate when refresh is not possible', async () => {
    vi.mocked(resolveRuntimeContext).mockResolvedValue({
      apiUrl: 'http://localhost:4000',
      authMethod: 'api-key',
      profileName: 'ci',
      originVerifySecret: undefined,
      scope: undefined,
      config: {
        apiUrl: 'http://localhost:4000',
        authMethod: 'api-key',
      },
    });
    vi.mocked(apiRequest).mockRejectedValueOnce(new CliError('Unauthorized', 2));
    await expect(
      authenticatedRequest({ method: 'GET', path: '/api/me', injectScope: false })
    ).rejects.toMatchObject({
      exitCode: 2,
      message: expect.stringMatching(/grant start|api-key|GRANT_ACCESS_TOKEN/),
    });
    expect(refreshAndPersistSession).not.toHaveBeenCalled();
  });
});
