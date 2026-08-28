/**
 * CloudFront cache behaviours, derived from the canonical routing table.
 *
 * This is the third witness the slice 1 oracle was written for. `gateway.conf.template`
 * and `next.config.ts` are parsed and compared; CloudFront is *generated*, which is
 * strictly stronger — a route cannot be present in the declaration and missing from
 * the distribution.
 *
 * Kept as a pure function over `CANONICAL_ROUTES`, separate from the constructs that
 * consume it, so behaviour derivation is testable without synthesizing or deploying
 * anything. The `Distribution` that uses this arrives with the docs site.
 */

import { type CanonicalRoute, routesByPrecedence, type RouteTarget } from './routing';

/** Where a behaviour sends the request. Resolved to real origins by the stack. */
type OriginKind = 'api' | 'docs-bucket' | 'web-assets-bucket';

/**
 * How aggressively a behaviour may cache.
 *
 * Named rather than expressed as CDK cache policies so the mapping is reviewable as
 * data. Anything reaching the API is uncached: responses are per-tenant and
 * per-session, and a cached authenticated response is a cross-tenant data leak.
 */
type CachePolicyKind = 'disabled' | 'short' | 'long' | 'immutable';

export interface CloudFrontBehaviour {
  /** CloudFront path pattern. `*` here is CloudFront's own wildcard syntax. */
  readonly pathPattern: string;
  readonly origin: OriginKind;
  readonly cache: CachePolicyKind;
  /** Why, for a reviewer reading the synthesized template. */
  readonly description: string;
}

/** Targets needing an explicit behaviour. `web` is the default origin; `example` is not deployed. */
type RoutedTarget = 'api' | 'docs';

const ORIGIN_FOR_TARGET: Record<RoutedTarget, OriginKind> = {
  api: 'api',
  docs: 'docs-bucket',
};

function isRoutedTarget(target: RouteTarget): target is RoutedTarget {
  return target === 'api' || target === 'docs';
}

/**
 * Routes the AWS target deliberately does not serve.
 *
 * `/storage` is mounted only when `STORAGE_PROVIDER=local`
 * (`apps/api/src/create-app.ts:157`). This target uses S3, so the route is dead here
 * — dropped rather than ported, which is a decision recorded in the story brief.
 */
const OMITTED_ON_AWS: readonly string[] = ['/storage'];

/**
 * Translates a canonical pattern to CloudFront's path-pattern syntax.
 *
 * Two cases, and the second is a deliberate widening:
 *
 * - **No wildcard** — append `*`, giving nginx's string-prefix semantics.
 *   `/api-docs` becomes `/api-docs*`, which covers `/api-docs.json` exactly as
 *   `location /api-docs` does.
 * - **Wildcard present** — truncate at the first wildcard.
 *   The project-scoped well-known route becomes `/org/*`, rather than a pattern
 *   carrying wildcards in the middle.
 *
 * The widening is safe because no web route can collide: every dashboard route is
 * locale-prefixed (`apps/web/app/[locale]/…`), the locales are `en` and `de`, and
 * there is no `/org` or `/acc` route in the web app. A non-well-known `/org/…` path
 * therefore 404s from the API instead of from the web app — the same outcome by a
 * different route. Recorded in the story brief § Routing.
 */
export function toPathPattern(pattern: string): string {
  if (pattern === '/') return '*';

  const firstWildcard = pattern.indexOf('*');
  if (firstWildcard === -1) return `${pattern}*`;

  return pattern.slice(0, firstWildcard + 1);
}

function cacheFor(route: CanonicalRoute): CachePolicyKind {
  if (route.target === 'docs') return 'long';

  // A pattern containing a wildcard gets truncated by toPathPattern, so the
  // behaviour covers strictly more than the route it came from:
  // the project-scoped well-known route becomes `/org/*`, which matches every path
  // under /org/, not just the well-known documents. The policy must be derived from
  // what the behaviour actually matches, so a widened pattern is never cached —
  // otherwise a per-tenant response under /org/ would be served from the edge.
  if (route.pattern.includes('*')) return 'disabled';

  // Well-known documents are small, public, and read on every token verification;
  // a short TTL cuts origin load without making key rotation slow to take effect.
  if (route.pattern.includes('.well-known')) return 'short';

  return 'disabled';
}

/**
 * Behaviours in the order CloudFront must evaluate them.
 *
 * CloudFront matches behaviours in declaration order rather than by specificity, so
 * this order is load-bearing. It comes from `routesByPrecedence()` — never from the
 * declaration array's own order, which is grouped for reading.
 */
export function toCloudFrontBehaviours(): CloudFrontBehaviour[] {
  const behaviours: CloudFrontBehaviour[] = [];
  const seen = new Set<string>();

  for (const route of routesByPrecedence()) {
    if (!isRoutedTarget(route.target)) continue;
    if (OMITTED_ON_AWS.includes(route.pattern)) continue;

    const pathPattern = toPathPattern(route.pattern);
    // Truncating at the first wildcard can collapse two canonical routes onto one
    // pattern. CloudFront rejects duplicate path patterns on a distribution, so the
    // first (most specific) wins and the collision is dropped rather than fatal.
    if (seen.has(pathPattern)) continue;
    seen.add(pathPattern);

    behaviours.push({
      pathPattern,
      origin: ORIGIN_FOR_TARGET[route.target],
      cache: cacheFor(route),
      description: route.description,
    });
  }

  return behaviours;
}

/**
 * Behaviours that exist for reasons outside the routing table.
 *
 * `_next/static` is Next.js build output with content-hashed filenames, served from
 * S3 rather than the web Lambda. It is not a canonical *route* — nothing chooses
 * between apps for it — so it is declared here rather than polluting the table the
 * gateway is checked against.
 */
export const ASSET_BEHAVIOURS: readonly CloudFrontBehaviour[] = [
  {
    pathPattern: '/_next/static/*',
    origin: 'web-assets-bucket',
    cache: 'immutable',
    description: 'Next.js build output; filenames are content-hashed.',
  },
];
