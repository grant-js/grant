import type { GrantConfig, GrantScope } from '../types/config.js';
import { loadProfile } from './storage.js';

export const ENV = {
  profile: 'GRANT_PROFILE',
  apiUrl: 'GRANT_API_URL',
  clientId: 'GRANT_CLIENT_ID',
  clientSecret: 'GRANT_CLIENT_SECRET',
  scopeTenant: 'GRANT_SCOPE_TENANT',
  scopeId: 'GRANT_SCOPE_ID',
  originVerify: 'GRANT_ORIGIN_VERIFY',
  accessToken: 'GRANT_ACCESS_TOKEN',
} as const;

export interface RuntimeFlags {
  profile?: string;
  scopeId?: string;
  tenant?: string;
}

export interface RuntimeContext {
  apiUrl: string;
  authMethod: GrantConfig['authMethod'] | 'token';
  config: GrantConfig;
  profileName: string | null;
  scope?: GrantScope;
  originVerifySecret?: string;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function mergeScope(config: GrantConfig, flags: RuntimeFlags): GrantScope | undefined {
  const id = flags.scopeId?.trim() || env(ENV.scopeId) || config.selectedScope?.id;
  const tenant = flags.tenant?.trim() || env(ENV.scopeTenant) || config.selectedScope?.tenant;
  if (id && tenant) return { id, tenant };
  return config.selectedScope;
}

function envApiKeyConfig(apiUrl: string): GrantConfig | null {
  const clientId = env(ENV.clientId);
  const clientSecret = env(ENV.clientSecret);
  const tenant = env(ENV.scopeTenant);
  const id = env(ENV.scopeId);
  if (!clientId || !clientSecret || !tenant || !id) return null;
  const scope: GrantScope = { tenant, id };
  return {
    apiUrl,
    authMethod: 'api-key',
    apiKey: { clientId, clientSecret, scope },
    selectedScope: scope,
    originVerifySecret: env(ENV.originVerify),
  };
}

function envTokenConfig(apiUrl: string): GrantConfig | null {
  const token = env(ENV.accessToken);
  if (!token) return null;
  const tenant = env(ENV.scopeTenant);
  const id = env(ENV.scopeId);
  return {
    apiUrl,
    authMethod: 'session',
    session: { token },
    selectedScope: tenant && id ? { tenant, id } : undefined,
    originVerifySecret: env(ENV.originVerify),
  };
}

/**
 * Resolve API URL, credentials, and scope.
 * Order: flags → GRANT_* env → named profile file.
 */
export async function resolveRuntimeContext(flags: RuntimeFlags = {}): Promise<RuntimeContext> {
  const profileFlag = flags.profile?.trim() || env(ENV.profile);
  const loaded = await loadProfile(profileFlag);
  const envUrl = env(ENV.apiUrl);
  const apiUrl = envUrl || loaded?.config.apiUrl;

  if (!apiUrl) {
    throw new Error(
      'No Grant API URL. Set GRANT_API_URL, pass a profile with apiUrl, or run "grant start".'
    );
  }

  const envToken = envTokenConfig(apiUrl);
  const envKey = envApiKeyConfig(apiUrl);
  const base = envToken ?? envKey ?? loaded?.config;
  if (!base) {
    throw new Error(
      'No credentials. Set GRANT_ACCESS_TOKEN or GRANT_CLIENT_ID/GRANT_CLIENT_SECRET, or run "grant start".'
    );
  }

  const config: GrantConfig = {
    ...base,
    apiUrl,
    originVerifySecret: env(ENV.originVerify) || base.originVerifySecret,
    selectedScope: mergeScope(base, flags),
  };

  const accessToken = env(ENV.accessToken);
  if (accessToken && !config.session?.token) {
    config.authMethod = 'session';
    config.session = { token: accessToken };
  }

  return {
    apiUrl,
    authMethod: env(ENV.accessToken) ? 'token' : config.authMethod,
    config,
    profileName: loaded?.profileName ?? null,
    scope: config.selectedScope,
    originVerifySecret: config.originVerifySecret,
  };
}
