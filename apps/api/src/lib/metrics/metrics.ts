import promClient from 'prom-client';

import { config } from '@/config';

import type { Request, Response } from 'express';

/**
 * Prometheus registry. Default labels and optional default metrics (CPU, memory)
 * are applied at module load when config.metrics.enabled is true.
 */
export const register = new promClient.Registry();

if (config.metrics.enabled) {
  register.setDefaultLabels(config.metrics.defaultLabels);
  if (config.metrics.collectDefaults) {
    promClient.collectDefaultMetrics({ register });
  }
}

// ---------------------------------------------------------------------------
// HTTP metrics (low cardinality: method, route, status_code)
// ---------------------------------------------------------------------------

export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.5, 1, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Metrics middleware: records request duration and count on response finish.
 * No-op when config.metrics.enabled is false. Mount before routes.
 */
export function metricsMiddleware(req: Request, res: Response, next: () => void): void {
  if (!config.metrics.enabled) {
    return next();
  }
  const startTime = Date.now();
  const route = (req.route?.path as string) || req.path;

  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = String(res.statusCode);
    const labels = { method: req.method, route, status_code: statusCode };
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });

  next();
}

/**
 * Serves Prometheus text format. Mount at config.metrics.endpoint (e.g. GET /metrics).
 */
export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (_error) {
    res.status(500).send('Error collecting metrics');
  }
}
