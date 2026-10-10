import { exchangeApiKey } from '../api/client.js';
import type { GrantConfig } from '../types/config.js';
import { ENV } from './credentials.js';

/**
 * Resolve a valid access token from env or stored config.
 * API key: exchanges clientId + clientSecret for a fresh token.
 * Session: returns the stored access token. GRANT_ACCESS_TOKEN wins when set.
 * Session auth does not auto-refresh; when the access token expires, run "grant start" again.
 */
export async function resolveAccessToken(config: GrantConfig): Promise<string> {
  const envToken = process.env[ENV.accessToken]?.trim();
  if (envToken) return envToken;

  if (config.authMethod === 'api-key' && config.apiKey) {
    const { accessToken } = await exchangeApiKey(config.apiUrl, {
      clientId: config.apiKey.clientId,
      clientSecret: config.apiKey.clientSecret,
      scope: config.apiKey.scope,
    });
    return accessToken;
  }
  if (config.authMethod === 'session' && config.session?.token) {
    return config.session.token;
  }
  throw new Error('No credentials in config. Run "grant start" to set up authentication.');
}
