/**
 * Routing parity oracle — phase C, slice 1.
 *
 * Grant serves every app from one hostname and lets the path pick the app. That
 * mapping is implemented twice today and will be implemented a third time as
 * CloudFront cache behaviours. Nothing currently checks the two against each other,
 * so a route added to the gateway but not to the dev rewrites works in production
 * and 404s locally — or the reverse, which is worse.
 *
 * This file is written **before** the CloudFront behaviours exist, deliberately: an
 * oracle written afterwards records whatever the implementation produced, including
 * its mistakes. Slice 2 adds the third witness by deriving behaviours from
 * `CANONICAL_ROUTES`; nothing here should need to change when it does.
 *
 * The check reads the real files rather than fixtures. Fixtures would drift from the
 * thing being checked, which is the exact failure this exists to prevent.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CANONICAL_ROUTES, resolveRoute, type RouteTarget } from '../routing';
import { INTENTIONAL_DIVERGENCES, isIntentionalDivergence } from './divergences';
import { type ParsedRoute, parseGatewayConf } from './gateway-conf';
import { parseNextRewrites } from './next-rewrites';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (relativePath: string) => readFileSync(`${repoRoot}${relativePath}`, 'utf8');

const gatewayRoutes = parseGatewayConf(read('deploy/gateway.conf.template'));
const nextRoutes = parseNextRewrites(read('apps/web/next.config.ts'));

/**
 * Floors, not exact counts. An exact count is a second table to maintain and fails
 * on every legitimate route addition; a floor only fires when a parser silently
 * stops matching — which would otherwise make every assertion below pass vacuously.
 */
const MIN_GATEWAY_ROUTES = 10;
const MIN_NEXT_ROUTES = 15;

function witnesses(routes: readonly ParsedRoute[], pattern: string): ParsedRoute[] {
  return routes.filter((route) => resolveRoute(route.path)?.pattern === pattern);
}

describe('canonical routing table', () => {
  describe('parsers', () => {
    it('extracts a plausible route table from the gateway', () => {
      expect(gatewayRoutes.length).toBeGreaterThanOrEqual(MIN_GATEWAY_ROUTES);
    });

    it('extracts a plausible rewrite table from next.config.ts', () => {
      expect(nextRoutes.length).toBeGreaterThanOrEqual(MIN_NEXT_ROUTES);
    });

    it('resolves every parsed path to a declared target', () => {
      // Guards the matcher itself: a resolveRoute that returned undefined for
      // everything would make the target comparisons below trivially pass.
      const unresolved = [...gatewayRoutes, ...nextRoutes].filter(
        (route) => resolveRoute(route.path) === undefined
      );
      expect(unresolved).toEqual([]);
    });
  });

  describe('the gateway agrees with the declaration', () => {
    it.each(gatewayRoutes)('$source routes to $target', ({ path, target, source }) => {
      if (isIntentionalDivergence('gateway', path)) return;

      const route = resolveRoute(path);
      expect(route, `${source} matches no canonical route`).toBeDefined();
      expect(route?.target, `${source} → ${route?.pattern}`).toBe(target);
    });
  });

  describe('the dev rewrites agree with the declaration', () => {
    it.each(nextRoutes)('$source routes to $target', ({ path, target, source }) => {
      if (isIntentionalDivergence('next-rewrites', path)) return;

      const route = resolveRoute(path);
      expect(route, `${source} matches no canonical route`).toBeDefined();
      expect(route?.target, `${source} → ${route?.pattern}`).toBe(target);
    });
  });

  describe('coverage', () => {
    it('every declared route is implemented by the gateway', () => {
      // The gateway is the production implementation, so a canonical route it does
      // not serve is a route that does not exist.
      const unwitnessed = CANONICAL_ROUTES.filter(
        (route) => witnesses(gatewayRoutes, route.pattern).length === 0
      ).map((route) => route.pattern);

      expect(unwitnessed).toEqual([]);
    });

    it('every API route is also proxied in development', () => {
      // The dev rewrites exist precisely so API paths work on a single origin under
      // `pnpm dev`. docs, example and the web catch-all are deliberately absent —
      // next.config.ts:22 records why — so the requirement is scoped to the API.
      const unproxied = CANONICAL_ROUTES.filter(
        (route) =>
          route.target === ('api' satisfies RouteTarget) &&
          witnesses(nextRoutes, route.pattern).length === 0
      ).map((route) => route.pattern);

      expect(unproxied).toEqual([]);
    });
  });

  describe('the divergence list stays honest', () => {
    it.each(INTENTIONAL_DIVERGENCES)(
      '$source $path is still divergent',
      ({ source, path, reason }) => {
        const routes = source === 'gateway' ? gatewayRoutes : nextRoutes;
        const parsed = routes.find((route) => route.path === path);

        expect(parsed, `listed but no longer present: ${path} — ${reason}`).toBeDefined();

        // A divergence that now agrees with the declaration is a stale entry, and a
        // stale entry silences a real difference the day one appears at that path.
        expect(
          resolveRoute(path)?.target,
          `no longer divergent; drop this entry: ${path}`
        ).not.toBe(parsed?.target);
      }
    );
  });
});
