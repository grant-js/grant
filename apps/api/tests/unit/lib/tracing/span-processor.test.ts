/**
 * The span-processor choice is the whole of this slice's runtime behavior, and it
 * fails silently: pick `batch` on Lambda and traces simply do not appear, with no
 * error anywhere to explain it. So assert the selection directly.
 */
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { afterEach, describe, expect, it, vi } from 'vitest';

const startSpy = vi.fn();
let capturedSpanProcessor: unknown = null;

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: class {
    constructor(cfg: { spanProcessor: unknown }) {
      capturedSpanProcessor = cfg.spanProcessor;
    }
    start = startSpy;
    shutdown = vi.fn();
  },
}));
vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: () => [],
}));
vi.mock('@opentelemetry/instrumentation-ioredis', () => ({
  IORedisInstrumentation: class {},
}));

const tracingConfig: Record<string, unknown> = {
  enabled: true,
  backend: 'otlp',
  otlpEndpoint: 'http://localhost:4318/v1/traces',
  jaegerEndpoint: 'http://localhost:14268/api/traces',
  spanProcessor: 'batch',
  samplingRate: 1,
  serviceName: 'grant-api',
};

vi.mock('@/config', () => ({
  config: {
    get tracing() {
      return tracingConfig;
    },
    app: { version: '1.0.0', nodeEnv: 'test' },
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

async function loadTracing(spanProcessor: string, enabled = true) {
  tracingConfig.spanProcessor = spanProcessor;
  tracingConfig.enabled = enabled;
  capturedSpanProcessor = null;
  vi.resetModules();
  await import('@/lib/tracing');
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('tracing span processor selection', () => {
  it('defaults to BatchSpanProcessor, preserving server behavior', async () => {
    await loadTracing('batch');

    expect(capturedSpanProcessor).toBeInstanceOf(BatchSpanProcessor);
  });

  it('uses SimpleSpanProcessor when configured for a freezable runtime', async () => {
    await loadTracing('simple');

    expect(capturedSpanProcessor).toBeInstanceOf(SimpleSpanProcessor);
    expect(capturedSpanProcessor).not.toBeInstanceOf(BatchSpanProcessor);
  });

  it('builds no SDK at all when tracing is disabled', async () => {
    await loadTracing('simple', false);

    expect(capturedSpanProcessor).toBeNull();
    expect(startSpy).not.toHaveBeenCalled();
  });
});
