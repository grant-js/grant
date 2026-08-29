/**
 * Extracts the route table from `apps/web/next.config.ts` rewrites.
 *
 * These are dev-only by the file's own comment (`next.config.ts:22`) — the dashboard
 * proxying the API so a single origin works with `pnpm dev`. They still encode the
 * same path-to-app mapping, which makes them a second witness: a route added to the
 * gateway but not here silently works in production and 404s in development.
 *
 * Parsed rather than imported. Importing would execute `createNextIntlPlugin` and
 * drag `apps/web`'s dependency tree into this package for a table that is plain data.
 */

import type { RouteTarget } from '../routing';
import type { ParsedRoute } from './gateway-conf';

const REWRITE_ENTRY = /\{\s*source:\s*'([^']+)'\s*,\s*destination:\s*(`[^`]+`|'[^']+')\s*,?\s*\}/g;

/** `/api/:path*` and `/org/:orgId/...` to the canonical `*` vocabulary. */
function normalizeSource(source: string): string {
  const normalized = source.replace(/:[A-Za-z0-9_]+\*/g, '*').replace(/:[A-Za-z0-9_]+/g, '*');
  // A trailing `/*` is "this prefix and everything under it", which the canonical
  // vocabulary writes as a trailing slash.
  return normalized.endsWith('/*') ? normalized.slice(0, -1) : normalized;
}

/**
 * Destinations interpolating the `api` constant proxy to the API. Everything else is
 * an internal rewrite the dashboard handles itself (`/favicon.ico` → `/favicon.png`),
 * which is a `web` route, not a cross-app one.
 */
function targetOf(destination: string): RouteTarget {
  return destination.includes('${api}') ? 'api' : 'web';
}

export function parseNextRewrites(config: string): ParsedRoute[] {
  return [...config.matchAll(REWRITE_ENTRY)].map(([, source, destination]) => ({
    path: normalizeSource(source!),
    target: targetOf(destination!),
    source: `rewrite ${source}`,
  }));
}
