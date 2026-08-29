/**
 * CloudFront Function behaviour, exercised as code.
 *
 * These functions close the only two behavioural gaps between the nginx gateway and
 * the edge, and both are otherwise invisible until a distribution exists. Running
 * the actual source here means slice 3's deploy is confirming something already
 * known to be right, rather than discovering it.
 *
 * The source is a string because CloudFront Functions are a restricted JS dialect
 * rather than a module. `new Function` evaluates the real shipped text — not a
 * TypeScript copy of it, which could drift.
 */
import { describe, expect, it } from 'vitest';

import { INDEX_REWRITE_FUNCTION, TRAILING_SLASH_REDIRECT_FUNCTION } from './viewer-request';

type CloudFrontRequest = { uri: string };
type CloudFrontResponse = {
  statusCode?: number;
  headers?: { location?: { value: string } };
  uri?: string;
};

function load(source: string): (event: { request: CloudFrontRequest }) => CloudFrontResponse {
  return new Function(`${source}\nreturn handler;`)() as ReturnType<typeof load>;
}

describe('index rewrite', () => {
  const handler = load(INDEX_REWRITE_FUNCTION);
  const run = (uri: string) => handler({ request: { uri } });

  it.each([
    // The site entry point. S3 behind OAC resolves no index document, and
    // CloudFront's defaultRootObject covers only `/`, so without this /docs/ 404s.
    ['/docs/', '/docs/index.html'],
    ['/', '/index.html'],
    ['/docs/guide/', '/docs/guide/index.html'],
    // Extensionless, treated as a directory — matches try_files $uri/ in
    // docs/nginx-docs.conf.
    ['/docs/guide', '/docs/guide/index.html'],
  ])('%s → %s', (uri, expected) => {
    expect(run(uri).uri).toBe(expected);
  });

  it.each([
    // VitePress emits page.html rather than page/index.html, so these must pass
    // through untouched or every documentation page 404s.
    '/docs/guide/getting-started.html',
    '/docs/assets/app.4f3a.js',
    '/docs/assets/style.css',
    '/docs/favicon.ico',
  ])('leaves %s alone', (uri) => {
    expect(run(uri).uri).toBe(uri);
  });
});

describe('trailing-slash redirect', () => {
  const handler = load(TRAILING_SLASH_REDIRECT_FUNCTION);
  const run = (uri: string) => handler({ request: { uri } });

  it.each([
    ['/docs', '/docs/'],
    ['/api', '/api/'],
  ])('302s %s to %s', (uri, location) => {
    // nginx serves these today (`location = /docs { return 302 /docs/; }`); Express
    // does not reproduce them, so without this a bare /docs 404s at the edge.
    const result = run(uri);
    expect(result.statusCode).toBe(302);
    expect(result.headers?.location?.value).toBe(location);
  });

  it.each([
    // Only the two exact paths redirect. A prefix match here would 302 every
    // documentation page and every API call into a loop.
    '/docs/',
    '/docs/guide.html',
    '/api/projects',
    '/api-docs',
    '/en/dashboard',
    '/',
  ])('passes %s through', (uri) => {
    const result = run(uri);
    expect(result.statusCode).toBeUndefined();
    expect(result.uri).toBe(uri);
  });
});
