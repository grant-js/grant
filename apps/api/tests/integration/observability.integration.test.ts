/**
 * Integration tests for observability wiring: metrics endpoint, telemetry adapter,
 * analytics adapter, and tracing shutdown. Uses mocked config so no real env or
 * full server is required. Matches the pattern of rate-limit.integration.test.ts.
 */

import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const noop = () => {};
const noopLogger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => noopLogger,
};

const mockConfig = vi.hoisted(() => ({
  metrics: {
    enabled: true,
    endpoint: '/metrics',
    defaultLabels: { environment: 'test', service: 'grant-api' },
    collectDefaults: false,
  },
  telemetry: {
    provider: 'none' as const,
    cloudwatch: {
      region: 'us-east-1',
      logGroupName: '',
      logStreamPrefix: 'grant-api',
    },
  },
  analytics: {
    enabled: false,
    provider: 'none' as const,
    umami: { apiUrl: '', websiteId: '', hostname: 'grant-api' },
  },
  tracing: {
    enabled: false,
    backend: 'jaeger' as const,
    jaegerEndpoint: 'http://localhost:14268/api/traces',
    otlpEndpoint: 'http://localhost:4318/v1/traces',
    samplingRate: 1.0,
    serviceName: 'grant-api',
  },
  app: { version: '1.0.0', nodeEnv: 'test' as const },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

vi.mock('@/lib/logger', () => ({
  logger: noopLogger,
  createLogger: () => noopLogger,
  loggerFactory: { createLogger: () => noopLogger },
}));

describe('observability integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('metrics endpoint', () => {
    it('returns 200 and body includes http_requests_total when METRICS_ENABLED=true', async () => {
      mockConfig.metrics.enabled = true;

      const { metricsMiddleware, metricsHandler } = await import('@/lib/metrics');
      const app = express();
      app.use(metricsMiddleware);
      app.get(mockConfig.metrics.endpoint, metricsHandler);
      app.get('/ok', (_req, res) => res.send('ok'));

      const res = await request(app).get('/ok');
      expect(res.status).toBe(200);

      const metricsRes = await request(app).get(mockConfig.metrics.endpoint);
      expect(metricsRes.status).toBe(200);
      expect(metricsRes.text).toContain('http_requests_total');
      expect(metricsRes.text).toContain('http_request_duration_seconds');
    });
  });

  describe('telemetry adapter', () => {
    it('returns adapter with sendLog that does not throw when provider is none', async () => {
      mockConfig.telemetry.provider = 'none';

      const { getTelemetryAdapter } = await import('@/lib/telemetry');
      const adapter = getTelemetryAdapter();
      expect(adapter).toBeDefined();
      expect(typeof adapter.sendLog).toBe('function');

      await expect(
        adapter.sendLog({
          message: 'test',
          level: 'info',
          timestamp: new Date().toISOString(),
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('analytics adapter', () => {
    it('returns adapter with trackEvent that does not throw when disabled', async () => {
      mockConfig.analytics.enabled = false;
      mockConfig.analytics.provider = 'none';

      const { getAnalyticsAdapter } = await import('@/lib/analytics');
      const adapter = getAnalyticsAdapter();
      expect(adapter).toBeDefined();
      expect(typeof adapter.trackEvent).toBe('function');

      await expect(adapter.trackEvent({ name: 'test', category: 'test' })).resolves.toBeUndefined();
    });
  });

  describe('tracing shutdown', () => {
    it('shutdownTracing does not throw when tracing was disabled', async () => {
      mockConfig.tracing.enabled = false;

      const { shutdownTracing } = await import('@/lib/tracing');
      await expect(shutdownTracing()).resolves.toBeUndefined();
    });
  });
});
