/**
 * Integration test: request-scoped logger bound by request-logging middleware
 * includes requestId in log payload when a route calls getRequestLogger(req).info(...).
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = vi.hoisted(() => ({
  tracing: { enabled: false },
  telemetry: { provider: 'none' as const },
}));

vi.mock('@/config', () => ({ config: mockConfig }));
vi.mock('@/lib/telemetry', () => ({
  getTelemetryAdapter: vi.fn(() => ({ sendLog: vi.fn().mockResolvedValue(undefined) })),
}));
vi.mock('@opentelemetry/api', () => ({ trace: { getActiveSpan: vi.fn(() => null) } }));

const infoSpy = vi.fn();
let capturedChildContext: Record<string, unknown> = {};

const mockLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child(ctx: Record<string, unknown>) {
    capturedChildContext = { ...ctx };
    return {
      trace: vi.fn(),
      debug: vi.fn(),
      info: (obj: object) => infoSpy({ ...capturedChildContext, ...obj }),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(function (this: unknown) {
        return this;
      }),
    };
  },
};

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

describe('request-scoped logger integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedChildContext = {};
  });

  it('route using getRequestLogger(req).info() produces log payload with requestId and message', async () => {
    const { requestLoggingMiddleware, getRequestLogger } =
      await import('@/middleware/request-logging.middleware');

    const app = express();
    app.use(express.json());
    app.use(requestLoggingMiddleware);
    app.get('/test-event', (req, res) => {
      getRequestLogger(req).info({ msg: 'Test event' });
      res.status(200).json({ ok: true });
    });

    const res = await request(app).get('/test-event');

    expect(res.status).toBe(200);
    expect(infoSpy).toHaveBeenCalled();
    const completionLog = infoSpy.mock.calls.find(
      (call: unknown[]) => (call[0] as { msg?: string })?.msg === 'Request completed'
    );
    const eventLog = infoSpy.mock.calls.find(
      (call: unknown[]) => (call[0] as { msg?: string })?.msg === 'Test event'
    );
    expect(completionLog).toBeDefined();
    expect(eventLog).toBeDefined();
    expect(eventLog![0]).toMatchObject({
      requestId: expect.any(String),
      msg: 'Test event',
    });
  });
});
