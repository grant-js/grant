/**
 * Load .env hierarchy from workspace root. Used by index.ts on first import.
 * Order: .env → .env.local → .env.{NODE_ENV} → .env.{NODE_ENV}.local → optional file at GRANT_ENV_FILE (later overrides earlier).
 */

import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

/**
 * Find monorepo root by walking up until pnpm-workspace.yaml exists.
 * Robust under Turbo, tsx, vitest, Docker, and pnpm scripts.
 */
export function findWorkspaceRoot(start: string): string {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error('Workspace root not found');
}

/**
 * Load env files in precedence order from root. Later files override earlier.
 * Uses dotenv-expand so values like DB_URL=${POSTGRES_USER} are expanded.
 */
export function loadEnv(rootArg?: string): void {
  const root = rootArg ?? findWorkspaceRoot(process.cwd());
  const env = process.env.NODE_ENV ?? 'development';
  const files = ['.env', '.env.local', `.env.${env}`, `.env.${env}.local`];

  for (const file of files) {
    const result = dotenv.config({
      path: path.join(root, file),
      override: true,
    });
    if (result.parsed) {
      dotenvExpand.expand(result);
    }
  }

  // Optional extra .env path (e.g. file injected by a secrets sidecar). Set GRANT_ENV_FILE in the runtime environment; no default path.
  const extraEnvPath = process.env.GRANT_ENV_FILE;
  if (extraEnvPath && fs.existsSync(extraEnvPath)) {
    const extraResult = dotenv.config({ path: extraEnvPath, override: true });
    if (extraResult.parsed) {
      dotenvExpand.expand(extraResult);
    }
  }

  // Expand ${VAR} in process.env so runtime-injected vars (Docker env_file/environment, CI, shell) are expanded too.
  // Without this, vars injected by the container runtime are never expanded; only values from dotenv.config() above were.
  dotenvExpand.expand({
    parsed: process.env as Record<string, string>,
  });
}
