/**
 * The third witness.
 *
 * Slices 1's oracle *parses* the gateway and the dev rewrites and compares them.
 * CloudFront behaviours are **generated** from the same declaration, which is
 * strictly stronger: a route cannot be in the table and missing from the
 * distribution. These tests pin the translation, so slice 3 wires a derivation that
 * is already known to be right rather than establishing correctness at deploy time.
 */
import { describe, expect, it } from 'vitest';

import { ASSET_BEHAVIOURS, toCloudFrontBehaviours, toPathPattern } from './behaviours';
import { CANONICAL_ROUTES, routesByPrecedence } from './routing';

const behaviours = toCloudFrontBehaviours();

describe('toPathPattern', () => {
  it.each([
    // nginx string-prefix semantics: /api-docs covers /api-docs.json.
    ['/api-docs', '/api-docs*'],
    ['/graphql', '/graphql*'],
    ['/health', '/health*'],
    ['/api/', '/api/*'],
    ['/.well-known/', '/.well-known/*'],
    // Truncated at the first wildcard rather than kept as a mid-pattern wildcard.
    ['/org/*/prj/*/.well-known/', '/org/*'],
    ['/acc/*/prj/*/.well-known/', '/acc/*'],
    // The catch-all is CloudFront's default behaviour.
    ['/', '*'],
  ])('%s → %s', (pattern, expected) => {
    expect(toPathPattern(pattern)).toBe(expected);
  });

  it('never emits a wildcard in the middle of a pattern', () => {
    // The story brief avoids mid-pattern wildcards deliberately. If this ever fails,
    // the derivation has started producing patterns the brief reasoned about as
    // absent — re-open that decision rather than relaxing this test.
    for (const { pathPattern } of behaviours) {
      const firstWildcard = pathPattern.indexOf('*');
      if (firstWildcard === -1) continue;
      expect(pathPattern.slice(firstWildcard)).toBe('*');
    }
  });
});

describe('toCloudFrontBehaviours', () => {
  it('emits no duplicate path patterns', () => {
    // CloudFront rejects a distribution with two behaviours on the same pattern, so
    // this would fail at deploy rather than at synth.
    const patterns = behaviours.map((b) => b.pathPattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it('preserves precedence order', () => {
    // CloudFront evaluates in declaration order. The derivation must not reorder
    // relative to routesByPrecedence(), or a general pattern can shadow a specific one.
    const derivedOrder = behaviours.map((b) => b.pathPattern);
    const expectedOrder = routesByPrecedence()
      .filter((r) => r.target === 'api' || r.target === 'docs')
      .filter((r) => r.pattern !== '/storage')
      .map((r) => toPathPattern(r.pattern))
      .filter((pattern, index, all) => all.indexOf(pattern) === index);

    expect(derivedOrder).toEqual(expectedOrder);
  });

  it('omits /storage, which this target does not serve', () => {
    // apps/api/src/create-app.ts:157 mounts it only for STORAGE_PROVIDER=local.
    expect(behaviours.map((b) => b.pathPattern)).not.toContain('/storage*');
  });

  it('omits the web catch-all, which is the default behaviour', () => {
    expect(behaviours.map((b) => b.pathPattern)).not.toContain('*');
  });

  it('omits the example app, which this target does not deploy', () => {
    expect(behaviours.map((b) => b.pathPattern)).not.toContain('/example*');
  });

  it('covers every API and docs route in the declaration', () => {
    // The generation guarantee, stated as a test: nothing routable is dropped.
    const expected = new Set(
      CANONICAL_ROUTES.filter((r) => r.target === 'api' || r.target === 'docs')
        .filter((r) => r.pattern !== '/storage')
        .map((r) => toPathPattern(r.pattern))
    );
    expect(new Set(behaviours.map((b) => b.pathPattern))).toEqual(expected);
  });

  describe('caching', () => {
    it('never caches a response from the API', () => {
      // API responses are per-tenant and per-session. A cached authenticated response
      // is a cross-tenant data leak, so this is a security assertion, not a perf one.
      const cachedApi = behaviours.filter(
        (b) => b.origin === 'api' && b.cache !== 'disabled' && b.cache !== 'short'
      );
      expect(cachedApi).toEqual([]);
    });

    it('caches only the platform .well-known documents', () => {
      // Public, tiny, read on every token verification — and a short TTL keeps key
      // rotation from taking long to propagate.
      const shortCached = behaviours.filter((b) => b.cache === 'short');
      expect(shortCached.map((b) => b.pathPattern)).toEqual(['/.well-known/*']);
    });

    it('never caches a widened pattern', () => {
      // toPathPattern truncates at the first wildcard, so /org/*/prj/*/.well-known/
      // becomes /org/*, which matches every path under /org/ rather than only the
      // well-known documents. Deriving the cache policy from the narrow route would
      // serve per-tenant responses from the edge.
      const widened = behaviours.filter(
        (b) => b.pathPattern.endsWith('/*') === false && b.pathPattern.includes('*')
      );
      const widenedPrefixes = behaviours.filter((b) =>
        ['/org/*', '/acc/*'].includes(b.pathPattern)
      );

      expect(widenedPrefixes).not.toHaveLength(0);
      for (const behaviour of [...widened, ...widenedPrefixes]) {
        expect(behaviour.cache, `${behaviour.pathPattern} must not be cached`).toBe('disabled');
      }
    });

    it('caches docs aggressively', () => {
      const docs = behaviours.filter((b) => b.origin === 'docs-bucket');
      expect(docs).not.toHaveLength(0);
      expect(docs.every((b) => b.cache === 'long')).toBe(true);
    });
  });
});

describe('ASSET_BEHAVIOURS', () => {
  it('serves Next.js build output immutably from the web origin', () => {
    // From the web function rather than a bucket, and that is correctness rather than
    // convenience: a bucket would be filled from a host build while the function serves
    // HTML from a container build, and Next randomises its build ID per build. The HTML
    // would reference assets the bucket never had.
    expect(ASSET_BEHAVIOURS).toEqual([
      expect.objectContaining({
        pathPattern: '/_next/static/*',
        origin: 'web',
        cache: 'immutable',
      }),
    ]);
  });

  it('does not collide with a derived behaviour', () => {
    const derived = new Set(behaviours.map((b) => b.pathPattern));
    for (const asset of ASSET_BEHAVIOURS) {
      expect(derived.has(asset.pathPattern)).toBe(false);
    }
  });
});
