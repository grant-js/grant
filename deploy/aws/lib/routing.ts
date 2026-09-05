/**
 * The canonical URL routing table.
 *
 * Grant serves every app from one hostname, and the path decides which app answers.
 * That mapping is currently implemented twice — `deploy/gateway.conf.template` for
 * the Kubernetes and docker-compose targets, and `apps/web/next.config.ts` rewrites
 * for local development. The AWS target adds a third implementation as CloudFront
 * cache behaviours.
 *
 * This module is the single declaration those implementations are checked against.
 * It deliberately does **not** generate any of them: rewriting `gateway.conf.template`
 * would give a change here a blast radius reaching the existing Kubernetes
 * deployment, which the phase C brief rules out. See
 * `plans/2026-08-21-aws-edge-infra-stack.md` § Gate 1 decisions.
 */

/** The application that answers a request. */
export type RouteTarget = 'api' | 'web' | 'docs' | 'example';

export interface CanonicalRoute {
  /**
   * Path pattern at the canonical URL. A `*` matches exactly one path segment. A
   * pattern without `*` matches by string prefix, which is nginx's `location`
   * semantics — `/api-docs` therefore covers `/api-docs.json`.
   */
  readonly pattern: string;
  readonly target: RouteTarget;
  /** Why this route exists, for a reader who has never seen the gateway config. */
  readonly description: string;
}

/**
 * Grouped by target for reading, **not** by precedence.
 *
 * Precedence is computed by `routesByPrecedence()` rather than declared, because
 * CloudFront evaluates cache behaviours in the order given rather than by
 * specificity — so a hand-maintained order would be load-bearing config that looks
 * like formatting, and reordering these entries for readability would silently
 * change routing. Derive behaviour order from that helper, never from this array.
 */
export const CANONICAL_ROUTES: readonly CanonicalRoute[] = [
  {
    pattern: '/graphql',
    target: 'api',
    description: 'GraphQL endpoint.',
  },
  {
    pattern: '/api-docs',
    target: 'api',
    description: 'Swagger UI and the OpenAPI document. Gated by SWAGGER_ENABLED.',
  },
  {
    pattern: '/api/',
    target: 'api',
    description: 'REST router.',
  },
  {
    pattern: '/health',
    target: 'api',
    description: 'Liveness probe.',
  },
  {
    pattern: '/.well-known/',
    target: 'api',
    description: 'Platform-level well-known documents, including JWKS.',
  },
  {
    pattern: '/org/*/prj/*/.well-known/',
    target: 'api',
    description: 'Project-scoped well-known documents, organization-addressed.',
  },
  {
    pattern: '/acc/*/prj/*/.well-known/',
    target: 'api',
    description: 'Project-scoped well-known documents, account-addressed.',
  },
  {
    pattern: '/storage',
    target: 'api',
    description:
      'Local-provider file serving. Mounted only when STORAGE_PROVIDER=local (apps/api/src/create-app.ts:157), so the AWS target omits it.',
  },
  {
    pattern: '/example',
    target: 'example',
    description: 'The Next.js client example app.',
  },
  {
    pattern: '/docs/',
    target: 'docs',
    description: 'VitePress documentation. Built with base /docs/ (docs/.vitepress/config.ts:16).',
  },
  {
    pattern: '/',
    target: 'web',
    description: 'Catch-all. The dashboard, all of it locale-prefixed.',
  },
];

/**
 * True when `path` is routed by `pattern`.
 *
 * Patterns containing `*` match segment-wise, with `*` standing for exactly one
 * segment and any trailing segments allowed. Patterns without `*` match by string
 * prefix, mirroring nginx `location` semantics.
 */
export function matchesPattern(path: string, pattern: string): boolean {
  if (!pattern.includes('*')) {
    return path === pattern || path.startsWith(pattern);
  }

  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);
  if (pathSegments.length < patternSegments.length) return false;

  return patternSegments.every(
    (segment, index) => segment === '*' || segment === pathSegments[index]
  );
}

/**
 * Routes most specific first — the order a matcher must try them in, and the order
 * CloudFront cache behaviours must be declared in.
 *
 * Longest pattern wins. Length is a sound proxy for specificity here because every
 * pattern is anchored at the root, so a longer pattern always constrains strictly
 * more of the path. The `/` catch-all is shortest and therefore always last.
 */
export function routesByPrecedence(): CanonicalRoute[] {
  return [...CANONICAL_ROUTES].sort((a, b) => b.pattern.length - a.pattern.length);
}

/**
 * The most specific route covering `path`, or undefined.
 *
 * Longest pattern wins, so the `/` catch-all only applies when nothing else does.
 * Length is the right proxy for specificity here because every pattern is anchored
 * at the root.
 */
export function resolveRoute(path: string): CanonicalRoute | undefined {
  return routesByPrecedence().find((route) => matchesPattern(path, route.pattern));
}
