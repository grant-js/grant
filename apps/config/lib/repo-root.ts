import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve monorepo root when the config app runs from apps/config.
 * When started via `pnpm config` (or `pnpm --filter grant-config dev`), cwd is apps/config.
 */
export function getRepoRoot(): string {
  const cwd = typeof process !== 'undefined' ? process.cwd() : '';
  let dir = cwd;
  for (let i = 0; i < 5; i++) {
    if (existsSync(resolve(dir, 'package.json')) && existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return cwd;
}

export function getRepoRootFromRequest(): string {
  if (typeof process === 'undefined') return '';
  return getRepoRoot();
}
