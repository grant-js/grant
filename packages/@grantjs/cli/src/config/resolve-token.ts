import { exchangeApiKey, refreshSession } from '../api/client.js';

import type { GrantConfig } from '../types/config.js';

export interface ResolveAccessTokenOptions {
  /** When session tokens are refreshed, call with new tokens so the caller can persist them. */
  onTokensRefreshed?: (tokens: { accessToken: string; refreshToken: string }) => void;
}

/**
 * Resolve a valid access token from stored config.
 * Only tokens are stored (no credentials). Session auth uses refresh token implicitly when available.
 *
 * - API key: exchanges clientId + clientSecret for a fresh token (no credentials stored after exchange).
 * - Session: if refreshToken is present, calls refresh endpoint and returns new access token;
 *   optionally persist via onTokensRefreshed. If no refreshToken, returns stored access token.
 */
export async function resolveAccessToken(
  config: GrantConfig,
  options?: ResolveAccessTokenOptions
): Promise<string> {
  if (config.authMethod === 'api-key' && config.apiKey) {
    const { accessToken } = await exchangeApiKey(config.apiUrl, {
      clientId: config.apiKey.clientId,
      clientSecret: config.apiKey.clientSecret,
      scope: config.apiKey.scope,
    });
    return accessToken;
  }
  if (config.authMethod === 'session' && config.session?.token) {
    const session = config.session;
    if (session.refreshToken) {
      const tokens = await refreshSession(config.apiUrl, session.token, session.refreshToken);
      options?.onTokensRefreshed?.({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      return tokens.accessToken;
    }
    return session.token;
  }
  throw new Error('No credentials in config. Run "grant start" to set up authentication.');
}
