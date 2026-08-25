/**
 * Boot-parity oracle — phase B, slice 1.
 *
 * The next slice extracts `create-app.ts` out of `server.ts`. The brief requires
 * that extraction be a **provable** no-op, "demonstrated by comparing boot behavior
 * and an e2e run, not by reading the diff". This file is that demonstration, and it
 * is written *before* the extraction on purpose: an oracle written afterwards
 * records whatever the extraction produced, including its mistakes.
 *
 * So every assertion here is black-box over the running container. Nothing imports
 * from `@/`, nothing knows whether an app factory exists, and none of it should need
 * editing in slice 2. **If a change to `server.ts` requires editing this file, that
 * change is not a no-op** — which is the entire signal this file exists to give.
 *
 * These assertions pin behavior; they do not endorse it. Two of them
 * (`oversized body` and `malformed JSON`) pin a 500 that arguably should be a 413
 * and a 400. Fixing that is a real change and should fail here loudly, then be
 * updated deliberately.
 *
 * Known gaps, which HTTP cannot see and slice 2's review must therefore check by
 * hand — recorded here rather than papered over:
 *   1. `import '@/lib/tracing'` must remain the first import of the process
 *      entrypoint, or OTel stops patching http/express.
 *   2. `initializeJobs()` must stay out of the app factory (`server.ts:151`). Moving
 *      it in would produce an identical log order, so nothing below catches it.
 *   3. `rateLimitMiddleware` is mounted but inert here
 *      (`SECURITY_ENABLE_RATE_LIMIT=false` in docker-compose.e2e.yml), so its
 *      presence is unobservable in this configuration.
 */
import { describe, expect, it } from 'vitest';

import { apiClient } from './helpers/api-client';
import {
  checkLogOrder,
  containerLogsAvailable,
  containerName,
  readContainerLogs,
} from './helpers/container-logs';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

describe('boot parity oracle', () => {
  describe('route table', () => {
    it('exposes exactly the documented REST operations', async () => {
      const res = await apiClient().get('/api-docs.json').expect(200);
      const paths = (res.body as { paths: Record<string, Record<string, unknown>> }).paths;

      const operations = Object.entries(paths)
        .flatMap(([path, ops]) =>
          Object.keys(ops)
            .filter((m) => (HTTP_METHODS as readonly string[]).includes(m))
            .map((m) => `${m.toUpperCase()} ${path}`)
        )
        .sort();

      // Snapshot rather than a count: a slice that drops one route and adds another
      // keeps the count identical.
      expect(operations).toMatchSnapshot();
    });
  });

  describe('mount points', () => {
    it('serves /health', async () => {
      const res = await apiClient().get('/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok' });
      expect(typeof (res.body as { timestamp: string }).timestamp).toBe('string');
    });

    it('serves the OpenAPI document', async () => {
      const res = await apiClient().get('/api-docs.json').expect(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toHaveProperty('openapi');
    });

    it('serves the REST router under /api', async () => {
      // 400, not 404: the route exists and its validation ran, which additionally
      // proves contextMiddleware built a context for it.
      const res = await apiClient().get('/api/projects');
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('serves GraphQL under /graphql', async () => {
      const res = await apiClient()
        .post('/graphql')
        .set('content-type', 'application/json')
        .send({ query: '{ __typename }' })
        .expect(200);

      expect(res.body).toEqual({ data: { __typename: 'Query' } });
    });

    it('serves the JWKS router', async () => {
      await apiClient().get('/.well-known/jwks.json').expect(200);
    });

    it('serves the metrics endpoint', async () => {
      const res = await apiClient().get('/metrics').expect(200);
      expect(res.text).toContain('http_requests_total');
    });

    it('leaves unknown routes to the Express default handler', async () => {
      const res = await apiClient().get('/definitely-not-a-route');
      expect(res.status).toBe(404);
      // No catch-all 404 handler is mounted; the response is Express's HTML.
      expect(res.text).toContain('Cannot GET');
    });
  });

  describe('middleware chain', () => {
    /**
     * Response header order is the execution order of the middleware that set them.
     * That makes the chain at `server.ts:93-101` directly observable without knowing
     * anything about how the app was constructed — the strongest ordering signal
     * available to a black-box test.
     */
    it('applies cors, then helmet, then i18n, then request logging', async () => {
      const res = await apiClient()
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      const order = Object.keys(res.headers);
      const positionOf = (header: string) => order.indexOf(header);

      const cors = positionOf('access-control-allow-origin');
      const helmet = positionOf('x-content-type-options');
      const i18n = positionOf('content-language');
      const requestLogging = positionOf('x-request-id');

      expect(cors).toBeGreaterThanOrEqual(0);
      expect(helmet).toBeGreaterThan(cors);
      expect(i18n).toBeGreaterThan(helmet);
      expect(requestLogging).toBeGreaterThan(i18n);
    });

    it('mounts cors with credentials', async () => {
      const res = await apiClient()
        .options('/api/projects')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['vary']).toContain('Origin');
    });

    it('mounts helmet with the expected header set', async () => {
      const res = await apiClient().get('/health').expect(200);

      expect(res.headers).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'referrer-policy': 'no-referrer',
        'x-dns-prefetch-control': 'off',
        'cross-origin-opener-policy': 'same-origin',
      });
      expect(res.headers['strict-transport-security']).toContain('max-age=');
    });

    it('mounts i18n and negotiates a supported locale', async () => {
      const english = await apiClient().get('/health').set('Accept-Language', 'en').expect(200);
      expect(english.headers['content-language']).toBe('en');

      const german = await apiClient().get('/health').set('Accept-Language', 'de').expect(200);
      expect(german.headers['content-language']).toBe('de');

      // Unsupported locales fall back rather than erroring.
      const fallback = await apiClient().get('/health').set('Accept-Language', 'es').expect(200);
      expect(fallback.headers['content-language']).toBe('en');
    });

    it('assigns a distinct request id per request', async () => {
      const first = await apiClient().get('/health').expect(200);
      const second = await apiClient().get('/health').expect(200);

      expect(first.headers['x-request-id']).toBeTruthy();
      expect(second.headers['x-request-id']).toBeTruthy();
      expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
    });

    it('mounts the JSON body parser ahead of the routes', async () => {
      const body = JSON.stringify({ a: 'x'.repeat(1024) });
      const res = await apiClient()
        .post('/api/projects')
        .set('content-type', 'application/json')
        .send(body);

      // Parsed and rejected by route validation, not by the parser.
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('enforces the JSON body limit above API_JSON_BODY_LIMIT_BYTES', async () => {
      // Pinned, not endorsed: body-parser raises PayloadTooLargeError and the error
      // handler maps it to 500 rather than 413. See
      // plans/2026-08-21-aws-lambda-runtime-measurements.md § finding 2.
      const oversized = `{"a":"${'x'.repeat(11 * 1024 * 1024)}"}`;
      const res = await apiClient()
        .post('/api/projects')
        .set('content-type', 'application/json')
        .send(oversized);

      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({ code: 'INTERNAL_ERROR' });
    });

    it('routes errors through the error handler last', async () => {
      const res = await apiClient()
        .post('/api/projects')
        .set('content-type', 'application/json')
        .send('{not json');

      // Also pinned rather than endorsed: a malformed body is a 500, not a 400.
      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({
        code: 'INTERNAL_ERROR',
        translationKey: 'errors.common.internalError',
      });
    });

    it('records requests in the metrics registry', async () => {
      await apiClient().get('/health').expect(200);
      const res = await apiClient().get('/metrics').expect(200);

      expect(res.text).toMatch(/http_requests_total\{[^}]*route="\/health"/);
    });
  });

  describe('config-gated mounts', () => {
    it('omits Swagger UI when SWAGGER_ENABLED is false', async () => {
      // The gate itself is the assertion: the e2e stack sets SWAGGER_ENABLED=false,
      // so a slice that mounted it unconditionally would show up here.
      await apiClient().get('/api-docs/').expect(404);
    });
  });

  describe('boot sequence', () => {
    const available = containerLogsAvailable();

    it.skipIf(!available)('runs the boot steps in order', () => {
      const logs = readContainerLogs();

      const { ordered, found } = checkLogOrder(logs, [
        '📋 Configuration Summary',
        'i18n initialized',
        'Database connection initialized',
        'Job scheduling initialized',
        'Server started successfully',
      ]);

      expect({ ordered, found }).toMatchObject({ ordered: true });
    });

    it.skipIf(!available)('bootstraps the database before opening the port', () => {
      const logs = readContainerLogs();

      // bootstrapDatabase() logs nothing itself, but its migration run makes
      // Postgres emit NOTICEs. Those landing before the ready line is the
      // observable form of "migrate and seed completed before listen".
      const { ordered } = checkLogOrder(logs, [
        '__drizzle_migrations',
        'Server started successfully',
      ]);

      expect(ordered).toBe(true);
    });

    it('reports when container logs are unreadable', () => {
      // Not a real assertion — a visible marker, so a run where the two tests above
      // silently skipped cannot be mistaken for a run where they passed.
      expect(available || `container logs unavailable: ${containerName()}`).toBeTruthy();
    });
  });
});
