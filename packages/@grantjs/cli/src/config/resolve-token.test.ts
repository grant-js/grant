import { describe, it, expect, beforeEach, vi } from 'vitest';

import { resolveAccessToken } from './resolve-token.js';

import type { GrantConfig } from '../types/config.js';

vi.mock('../api/client.js', () => ({
  exchangeApiKey: vi.fn(),
  refreshSession: vi.fn(),
}));

const { exchangeApiKey, refreshSession } = await import('../api/client.js');

describe('resolveAccessToken', () => {
  beforeEach(() => {
    vi.mocked(exchangeApiKey).mockReset();
    vi.mocked(refreshSession).mockReset();
  });

  it('returns session token when authMethod is session and no refreshToken', async () => {
    const config: GrantConfig = {
      apiUrl: 'http://localhost',
      authMethod: 'session',
      session: { token: 'session-token-xyz' },
    };
    const token = await resolveAccessToken(config);
    expect(token).toBe('session-token-xyz');
    expect(exchangeApiKey).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('calls refreshSession and returns new access token when session has refreshToken', async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    const config: GrantConfig = {
      apiUrl: 'http://localhost',
      authMethod: 'session',
      session: { token: 'old-token', refreshToken: 'old-refresh' },
    };
    const token = await resolveAccessToken(config);
    expect(token).toBe('new-access-token');
    expect(refreshSession).toHaveBeenCalledWith('http://localhost', 'old-token', 'old-refresh');
    expect(exchangeApiKey).not.toHaveBeenCalled();
  });

  it('calls onTokensRefreshed when session is refreshed', async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    const config: GrantConfig = {
      apiUrl: 'http://localhost',
      authMethod: 'session',
      session: { token: 'old', refreshToken: 'old-r' },
    };
    const onTokensRefreshed = vi.fn();
    const token = await resolveAccessToken(config, { onTokensRefreshed });
    expect(token).toBe('new-access');
    expect(onTokensRefreshed).toHaveBeenCalledTimes(1);
    expect(onTokensRefreshed).toHaveBeenCalledWith({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });

  it('calls exchangeApiKey and returns access token when authMethod is api-key', async () => {
    vi.mocked(exchangeApiKey).mockResolvedValue({
      accessToken: 'exchanged-token',
      expiresIn: 900,
    });
    const config: GrantConfig = {
      apiUrl: 'http://localhost:4000',
      authMethod: 'api-key',
      apiKey: {
        clientId: 'cid',
        clientSecret: 'secret32charsminimumrequired!!',
        scope: { tenant: 'accountProject', id: 'a:b' },
      },
    };
    const token = await resolveAccessToken(config);
    expect(token).toBe('exchanged-token');
    expect(exchangeApiKey).toHaveBeenCalledWith('http://localhost:4000', {
      clientId: 'cid',
      clientSecret: 'secret32charsminimumrequired!!',
      scope: { tenant: 'accountProject', id: 'a:b' },
    });
  });

  it('throws when no credentials (api-key but no apiKey)', async () => {
    const config: GrantConfig = {
      apiUrl: 'http://localhost',
      authMethod: 'api-key',
    };
    await expect(resolveAccessToken(config)).rejects.toThrow(
      'No credentials in config. Run "grant start" to set up authentication.'
    );
  });

  it('throws when session auth but no session token', async () => {
    const config: GrantConfig = {
      apiUrl: 'http://localhost',
      authMethod: 'session',
    };
    await expect(resolveAccessToken(config)).rejects.toThrow(
      'No credentials in config. Run "grant start" to set up authentication.'
    );
  });
});
