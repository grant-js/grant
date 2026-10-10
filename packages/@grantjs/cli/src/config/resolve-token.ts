import { exchangeApiKey, refreshSession } from '../api/client.js';
import type { GrantConfig } from '../types/config.js';
import { ENV } from './credentials.js';
import { loadProfile, saveConfigFile } from './storage.js';

/**
 * Resolve a valid access token from env or stored config.
 * API key: exchanges clientId + clientSecret for a fresh token.
 * Session: returns the stored access token. GRANT_ACCESS_TOKEN wins when set.
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

export async function refreshAndPersistSession(
  config: GrantConfig,
  profileName?: string | null
): Promise<string> {
  const refreshToken = config.session?.refreshToken;
  if (!refreshToken) {
    throw new Error('Session expired. Run "grant start" again or use an api-key profile.');
  }
  const rotated = await refreshSession(config.apiUrl, refreshToken, config.originVerifySecret);
  config.session = {
    token: rotated.accessToken,
    refreshToken: rotated.refreshToken ?? refreshToken,
  };
  if (profileName) {
    const loaded = await loadProfile(profileName);
    if (loaded) {
      loaded.config.session = config.session;
      loaded.file.profiles[loaded.profileName] = loaded.config;
      await saveConfigFile(loaded.file);
    }
  }
  return rotated.accessToken;
}
