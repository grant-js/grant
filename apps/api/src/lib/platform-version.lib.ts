import { createRequire } from 'node:module';

import { ConfigurationError } from '@/lib/errors';

const require = createRequire(import.meta.url);

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;

/**
 * Replaced with a string literal by bundled builds, which inline this module into
 * a single output file and so cannot reach `apps/api/package.json` by a path
 * relative to it. Left undeclared by every other build, where `typeof` on an
 * undeclared identifier is the safe way to ask.
 */
declare const __GRANT_PLATFORM_VERSION__: string | undefined;

let cachedVersion: string | undefined;

function readVersionSource(): { version?: string; origin: string } {
  if (typeof __GRANT_PLATFORM_VERSION__ === 'string') {
    return { version: __GRANT_PLATFORM_VERSION__, origin: 'build-time define' };
  }
  const pkg = require('../../package.json') as { version?: string };
  return { version: pkg.version, origin: 'apps/api/package.json' };
}

/**
 * Platform semver from apps/api/package.json (Changesets + Docker image tags).
 */
export function readPlatformVersion(): string {
  if (cachedVersion !== undefined) {
    return cachedVersion;
  }

  const { version: raw, origin } = readVersionSource();
  const version = raw?.trim();

  if (!version || !SEMVER_PATTERN.test(version)) {
    throw new ConfigurationError(`Invalid platform version in ${origin}: ${JSON.stringify(raw)}`);
  }

  cachedVersion = version;
  return cachedVersion;
}
