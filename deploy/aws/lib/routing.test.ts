/**
 * Unit tests for the matcher the parity oracle is built on.
 *
 * `routing-parity.test.ts` compares real files against `CANONICAL_ROUTES`; if the
 * matcher is wrong, that comparison is wrong in a way that looks like agreement.
 * These cases pin the two semantics that are easy to get backwards — nginx's string
 * prefix matching, and segment-wise wildcards.
 */
import { describe, expect, it } from 'vitest';

import { CANONICAL_ROUTES, matchesPattern, resolveRoute, routesByPrecedence } from './routing';

describe('matchesPattern', () => {
  describe('patterns without a wildcard match by string prefix', () => {
    it.each([
      ['/api-docs', '/api-docs', true],
      // nginx `location /api-docs` is a string prefix, not a path prefix, so the
      // OpenAPI document is covered by the Swagger route rather than needing its own.
      ['/api-docs.json', '/api-docs', true],
      ['/api-docs/swagger-ui.css', '/api-docs', true],
      ['/api/projects', '/api/', true],
      // The trailing slash is load-bearing: `/api` alone is the redirect block.
      ['/api', '/api/', false],
      ['/apiary', '/api/', false],
      ['/health', '/health', true],
      ['/graphql', '/graphql', true],
      ['/anything', '/', true],
    ])('%s against %s → %s', (path, pattern, expected) => {
      expect(matchesPattern(path, pattern)).toBe(expected);
    });
  });

  describe('a wildcard matches exactly one segment', () => {
    const projectWellKnown = '/org/*/prj/*/.well-known/';

    it.each([
      ['/org/acme/prj/site/.well-known/jwks.json', projectWellKnown, true],
      ['/org/acme/prj/site/.well-known/', projectWellKnown, true],
      // Too few segments to reach `.well-known`.
      ['/org/acme/.well-known/jwks.json', projectWellKnown, false],
      // Right shape, wrong literal segment.
      ['/org/acme/prj/site/other', projectWellKnown, false],
      // A wildcard does not span a separator.
      ['/org/acme/extra/prj/site/.well-known/x', projectWellKnown, false],
    ])('%s against %s → %s', (path, pattern, expected) => {
      expect(matchesPattern(path, pattern)).toBe(expected);
    });
  });
});

describe('resolveRoute', () => {
  it.each([
    // /api-docs must win over /api/ — both are plausible prefixes of the same string.
    ['/api-docs.json', '/api-docs', 'api'],
    ['/api/projects', '/api/', 'api'],
    ['/graphql', '/graphql', 'api'],
    ['/health', '/health', 'api'],
    ['/.well-known/jwks.json', '/.well-known/', 'api'],
    ['/org/acme/prj/site/.well-known/jwks.json', '/org/*/prj/*/.well-known/', 'api'],
    ['/acc/1/prj/site/.well-known/jwks.json', '/acc/*/prj/*/.well-known/', 'api'],
    ['/storage/uploads/file.pdf', '/storage', 'api'],
    ['/docs/guide/getting-started.html', '/docs/', 'docs'],
    ['/example/anything', '/example', 'example'],
    // Locale-prefixed dashboard routes and everything else fall to the catch-all.
    ['/en/dashboard', '/', 'web'],
    ['/de/auth/login', '/', 'web'],
    ['/', '/', 'web'],
  ])('%s → %s (%s)', (path, expectedPattern, expectedTarget) => {
    const route = resolveRoute(path);
    expect(route?.pattern).toBe(expectedPattern);
    expect(route?.target).toBe(expectedTarget);
  });

  it('resolves every path to something, because of the catch-all', () => {
    // If this ever returns undefined the parity oracle silently stops comparing.
    expect(resolveRoute('/totally/unknown/path')).toBeDefined();
  });
});

describe('CANONICAL_ROUTES', () => {
  it('declares no duplicate patterns', () => {
    const patterns = CANONICAL_ROUTES.map((route) => route.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it('ends with the catch-all when ordered by precedence', () => {
    // Slice 2 derives CloudFront behaviours from routesByPrecedence(), and CloudFront
    // evaluates behaviours in declaration order rather than by specificity. Pinning
    // the helper — not the declaration — means the array stays free to be grouped for
    // reading without silently changing routing.
    expect(routesByPrecedence().at(-1)).toMatchObject({ pattern: '/', target: 'web' });
  });

  it('orders by precedence, most specific first', () => {
    const lengths = routesByPrecedence().map((route) => route.pattern.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });

  it('loses no routes when ordered', () => {
    expect(routesByPrecedence()).toHaveLength(CANONICAL_ROUTES.length);
  });
});
