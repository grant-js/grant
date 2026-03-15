/**
 * @grantjs/env – Typed environment contract for Grant platform.
 *
 * Loads the standard env file hierarchy from monorepo root (.env, .env.local,
 * .env.{NODE_ENV}, .env.{NODE_ENV}.local) on first import. Uses lazy parsing so
 * test/E2E can mutate process.env before first getEnv() call. Call resetEnv() in
 * tests after mutating env to force re-parse.
 */

import { loadEnv as loadEnvImpl } from './load-env';
import { envSchema, type Env } from './schema';

if (!process.env.__GRANT_ENV_LOADED) {
  loadEnvImpl();
  process.env.__GRANT_ENV_LOADED = 'true';
}

let cachedEnv: Env | null = null;

/**
 * Returns parsed and validated env. Parses on first call and caches (frozen).
 */
export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = Object.freeze(envSchema.parse(process.env)) as Env;
  }
  return cachedEnv;
}

/**
 * Clear cached env so the next getEnv() re-parses process.env.
 * Use in tests after mutating process.env to pick up overrides.
 */
export function resetEnv(): void {
  cachedEnv = null;
}

/**
 * Extract default values from the env schema for keys that have .default().
 * Does not run full validation; only includes keys where a default is defined.
 * Used by the config app for placeholders and "Default" indicator.
 */
export function getSchemaDefaults(): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const key of Object.keys(envSchema.shape) as (keyof Env)[]) {
    const partial = envSchema.pick({ [key]: true } as Record<keyof Env, true>);
    const result = partial.safeParse({});
    if (result.success && result.data[key as keyof Env] !== undefined) {
      defaults[key] = result.data[key as keyof Env];
    }
  }

  return defaults;
}

/**
 * Canonical list of env keys from the schema. Single source of truth for "which keys exist".
 */
export const ENV_KEYS = Object.keys(envSchema.shape) as (keyof Env)[];

/**
 * Validate a single env key's value using the schema. Keeps config app and runtime validation identical.
 */
export function validateEnvValue(key: keyof Env, value: string) {
  // Zod 4 pick() has a strict param type that rejects dynamic keys. Runtime behavior is correct.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partial = envSchema.pick({ [key]: true } as any);
  return partial.safeParse({ [key]: value });
}

/**
 * Build database URL from env. Uses DB_URL if set, otherwise builds from POSTGRES_*.
 */
export function resolveDatabaseUrl(env: Env): string {
  if (env.DB_URL) return env.DB_URL;
  return `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;
}

export type { Env };
export { envSchema };
export { findWorkspaceRoot, loadEnv } from './load-env';
