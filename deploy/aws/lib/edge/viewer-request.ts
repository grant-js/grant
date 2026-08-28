/**
 * CloudFront Functions that close the two gaps between nginx and CloudFront.
 *
 * Both are stated in the story brief § Routing as the only behavioural differences
 * between the gateway and the edge. Neither is exotic; both are invisible until the
 * first deploy, which is why they are written and unit-tested here rather than
 * discovered against a live distribution.
 *
 * CloudFront Functions are a restricted JavaScript dialect (ES5.1-ish, no `const`
 * in older runtimes, no async, sub-millisecond budget), so the code is kept as a
 * string rather than compiled from TypeScript. It is small enough to read.
 */

/**
 * Resolves directory indexes for the S3 origin.
 *
 * S3 REST origins behind Origin Access Control do **no** index-document resolution:
 * a request for `/docs/` becomes the key `docs/` and 404s. CloudFront's
 * "default root object" only covers `/`, not subdirectories. VitePress emits
 * `guide/foo.html` rather than `guide/foo/index.html`, so this mostly matters for
 * `/docs/` itself — but it matters absolutely there, which is the site's entry point.
 */
export const INDEX_REWRITE_FUNCTION = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    // Extensionless path: treat as a directory, matching try_files $uri/ in
    // docs/nginx-docs.conf.
    request.uri = uri + '/index.html';
  }

  return request;
}
`.trim();

/**
 * The trailing-slash redirects nginx serves today.
 *
 * `deploy/gateway.conf.template` has `location = /docs { return 302 /docs/; }` and
 * the same for `/api`. Express does not reproduce them, and without them `/docs`
 * falls through to the web catch-all and 404s — a broken link from anywhere that
 * writes the bare path.
 *
 * Attached to the **default** behaviour: a bare `/docs` does not match the `/docs/*`
 * pattern, so only the catch-all sees it.
 */
export const TRAILING_SLASH_REDIRECT_FUNCTION = `
function handler(event) {
  var uri = event.request.uri;

  if (uri === '/docs' || uri === '/api') {
    return {
      statusCode: 302,
      statusDescription: 'Found',
      headers: { location: { value: uri + '/' } },
    };
  }

  return event.request;
}
`.trim();
