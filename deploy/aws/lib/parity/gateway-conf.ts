/**
 * Extracts the route table from `deploy/gateway.conf.template`.
 *
 * The gateway is the production routing implementation for the Kubernetes and
 * docker-compose targets, so it is the authority this parity check measures against.
 * Parsing rather than importing is unavoidable — it is an nginx config, not a module.
 */

import type { RouteTarget } from '../routing';

export interface ParsedRoute {
  /** Normalized to the canonical pattern vocabulary: `*` for one path segment. */
  readonly path: string;
  readonly target: RouteTarget;
  /** Verbatim `location` argument, for failure messages that point somewhere real. */
  readonly source: string;
}

const LOCATION_BLOCK = /location\s+(?:(=|~\*?|\^~)\s+)?(\S+)\s*\{([^}]*)\}/g;
const UPSTREAM = /proxy_pass\s+http:\/\/\$upstream_(api|web|docs|example)\b/;

/**
 * nginx regex locations to the canonical vocabulary. Each `[^/]+` becomes a single
 * `*` segment and `\.` is unescaped, so the project-scoped well-known location
 * parses to the same string the canonical table declares.
 */
function normalizeRegexLocation(pattern: string): string {
  return pattern
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    .replace(/\[\^\/\]\+/g, '*')
    .replace(/\\\./g, '.');
}

/**
 * Route table declared by the gateway.
 *
 * `location = /path` blocks are skipped: they are the trailing-slash redirects
 * (`= /api` → `/api/`), which express a redirect rather than a target, and the
 * prefix block beside each one already carries the routing.
 */
export function parseGatewayConf(conf: string): ParsedRoute[] {
  const routes: ParsedRoute[] = [];

  for (const match of conf.matchAll(LOCATION_BLOCK)) {
    const [, modifier, pattern, body] = match;
    if (modifier === '=') continue;

    const upstream = UPSTREAM.exec(body ?? '');
    if (!upstream || !pattern) continue;

    routes.push({
      path: modifier?.startsWith('~') ? normalizeRegexLocation(pattern) : pattern,
      target: upstream[1] as RouteTarget,
      source: `location ${modifier ? `${modifier} ` : ''}${pattern}`,
    });
  }

  return routes;
}
