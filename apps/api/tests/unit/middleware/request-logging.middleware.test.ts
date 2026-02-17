/**
 * Unit tests for request-logging middleware: requestId and request-scoped logger
 * on req, and finish log payload (msg, statusCode, duration).
 */

import { Request, Response } from 'express';
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

const childInfo = vi.fn();
const childWarn = vi.fn();
const childError = vi.fn();
const childLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: childInfo,
  warn: childWarn,
  error: childError,
  fatal: vi.fn(),
  child: vi.fn(function (this: unknown) {
    return this;
  }),
};

const rootLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(() => childLogger),
};

vi.mock('@/lib/logger', () => ({
  logger: rootLogger,
}));

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/api/test',
    headers: {},
    query: {},
    ip: '127.0.0.1',
    ...overrides,
  } as Request;
}

interface MockRes extends Record<string, unknown> {
  setHeader: ReturnType<typeof vi.fn>;
  statusCode: number;
  writableEnded: boolean;
  _onFinish?: () => void;
  _onClose?: () => void;
  on: (event: string, fn: () => void) => MockRes;
  emit: (event: string) => boolean;
}

function createMockRes(): Response & {
  statusCode: number;
  _onFinish?: () => void;
  _onClose?: () => void;
} {
  const res: MockRes = {
    setHeader: vi.fn(),
    statusCode: 200,
    writableEnded: false,
    _onFinish: undefined,
    _onClose: undefined,
    on(event: string, fn: () => void) {
      if (event === 'finish') this._onFinish = fn;
      if (event === 'close') this._onClose = fn;
      return this;
    },
    emit(event: string) {
      if (event === 'finish') this._onFinish?.();
      if (event === 'close') this._onClose?.();
      return true;
    },
  };
  return res as unknown as Response & {
    statusCode: number;
    _onFinish?: () => void;
    _onClose?: () => void;
  };
}

describe('requestLoggingMiddleware', () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.tracing.enabled = false;
    mockConfig.telemetry.provider = 'none';
  });

  it('sets req.requestId and req.logger and calls next()', async () => {
    const { requestLoggingMiddleware } = await import('@/middleware/request-logging.middleware');
    const req = createMockReq();
    const res = createMockRes();

    requestLoggingMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as { requestId?: string }).requestId).toBeDefined();
    expect(typeof (req as { requestId?: string }).requestId).toBe('string');
    expect((req as { logger?: { info: unknown } }).logger).toBeDefined();
    expect((req as { logger?: { info: unknown } }).logger).toBe(childLogger);
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      (req as unknown as { requestId: string }).requestId
    );
  });

  it('on res finish with status 200, logs with msg "Request completed", statusCode, and duration', async () => {
    const { requestLoggingMiddleware } = await import('@/middleware/request-logging.middleware');
    const req = createMockReq();
    const res = createMockRes();
    res.statusCode = 200;

    requestLoggingMiddleware(req, res, next);
    expect(childInfo).toHaveBeenCalled(); // incoming request
    childInfo.mockClear();

    res.emit('finish');

    expect(childInfo).toHaveBeenCalledTimes(1);
    const payload = childInfo.mock.calls[0][0];
    expect(payload).toMatchObject({
      msg: 'Request completed',
      statusCode: 200,
    });
    expect(typeof payload.duration).toBe('number');
  });

  it('on res finish with status 400, uses warn level for completion log', async () => {
    const { requestLoggingMiddleware } = await import('@/middleware/request-logging.middleware');
    const req = createMockReq();
    const res = createMockRes();
    res.statusCode = 400;

    requestLoggingMiddleware(req, res, next);
    childWarn.mockClear();

    res.emit('finish');

    expect(childWarn).toHaveBeenCalledTimes(1);
    expect(childWarn.mock.calls[0][0]).toMatchObject({
      msg: 'Request completed',
      statusCode: 400,
    });
  });
});
