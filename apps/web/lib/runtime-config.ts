'use client';

/**
 * Runtime config: demo mode, privacy retention, app version, CDM upload limit, docs site URL and
 * which API surfaces (Swagger UI, Apollo Sandbox) are enabled.
 * Client loads from GET /api/config; server fallback from env (SSR/build).
 */

export interface RuntimeConfig {
  demoModeEnabled: boolean;
  demoModeDbRefreshSchedule: string;
  accountDeletionRetentionDays: string;
  appVersion: string;
  /** Largest CDM import file, in bytes, the API will mint an upload URL for. */
  cdmUploadMaxBytes: number;
  /** Docs site base URL (`DOCS_URL`); null means same-origin `/docs`. See `getDocsUrl`. */
  docsUrl: string | null;
  /** Whether the API serves the Swagger UI at /api-docs (`SWAGGER_ENABLED`). */
  apiReferenceEnabled: boolean;
  /** Whether the API serves the Apollo Sandbox at /graphql (`APOLLO_PLAYGROUND`). */
  graphqlPlaygroundEnabled: boolean;
}

export const RUNTIME_CONFIG_DEFAULTS: RuntimeConfig = {
  demoModeEnabled: false,
  demoModeDbRefreshSchedule: '0 0 */2 * *',
  accountDeletionRetentionDays: '30',
  appVersion: 'dev',
  // Mirrors the API's `CDM_UPLOAD_MAX_BYTES` default (64 MiB), used until `/api/config`
  // answers and when it cannot be reached.
  cdmUploadMaxBytes: 64 * 1024 * 1024,
  docsUrl: null,
  // Off until `/api/config` says otherwise, so the header never shows a link to a surface the
  // API does not serve, not even for the moment before the config arrives.
  apiReferenceEnabled: false,
  graphqlPlaygroundEnabled: false,
};

let runtimeConfig: RuntimeConfig = RUNTIME_CONFIG_DEFAULTS;

export function setRuntimeConfig(config: RuntimeConfig): void {
  runtimeConfig = config;
}

function getServerConfig(): RuntimeConfig {
  if (typeof process === 'undefined' || !process.env) return RUNTIME_CONFIG_DEFAULTS;
  return {
    ...RUNTIME_CONFIG_DEFAULTS,
    demoModeEnabled: process.env.DEMO_MODE_ENABLED === 'true',
    demoModeDbRefreshSchedule:
      process.env.DEMO_MODE_DB_REFRESH_SCHEDULE ??
      RUNTIME_CONFIG_DEFAULTS.demoModeDbRefreshSchedule,
    accountDeletionRetentionDays:
      process.env.PRIVACY_ACCOUNT_DELETION_RETENTION_DAYS ??
      RUNTIME_CONFIG_DEFAULTS.accountDeletionRetentionDays,
    appVersion: RUNTIME_CONFIG_DEFAULTS.appVersion,
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return getServerConfig();
  }
  return runtimeConfig;
}
