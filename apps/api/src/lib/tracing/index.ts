/**
 * OpenTelemetry tracing bootstrap. Must be imported first in server.ts so the SDK
 * starts before any instrumented modules (http, express, ioredis) are loaded.
 */

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';

import { config } from '@/config';
import { logger } from '@/lib/logger';

let sdk: NodeSDK | null = null;

function createExporter(): JaegerExporter | OTLPTraceExporter {
  switch (config.tracing.backend) {
    case 'jaeger':
      return new JaegerExporter({
        endpoint: config.tracing.jaegerEndpoint,
      });
    case 'otlp':
    case 'xray':
      return new OTLPTraceExporter({
        url: config.tracing.otlpEndpoint,
      });
    default:
      return new JaegerExporter({
        endpoint: config.tracing.jaegerEndpoint,
      });
  }
}

/**
 * `batch` buffers spans and exports them on a timer, which is the right trade for a
 * long-running server: fewer, larger exports.
 *
 * That trade inverts wherever the process can stop between requests without warning.
 * On Lambda behind the Web Adapter the execution environment is frozen the instant a
 * response is returned and may never thaw, so a buffered batch is not delayed — it is
 * gone, and the spans lost are disproportionately those of the slowest requests. The
 * application gets no invocation-ended signal it could flush on, so the export has to
 * not be buffered in the first place.
 *
 * `simple` exports each span as it ends. It costs one export call per span, which is
 * cheap against a collector on loopback and is what the ADOT layer expects.
 */
function createSpanProcessor(exporter: JaegerExporter | OTLPTraceExporter): SpanProcessor {
  if (config.tracing.spanProcessor === 'simple') {
    return new SimpleSpanProcessor(exporter);
  }
  return new BatchSpanProcessor(exporter, {
    maxQueueSize: 2048,
    scheduledDelayMillis: 5000,
  });
}

/** Resource attribute names (OpenTelemetry semantic conventions) */
const ATTR_SERVICE_NAME = 'service.name';
const ATTR_SERVICE_VERSION = 'service.version';
const ATTR_DEPLOYMENT_ENVIRONMENT = 'deployment.environment';

/**
 * Initialize OpenTelemetry tracing. No-op when config.tracing.enabled is false.
 * Call this by importing this module first in server.ts (side-effect import).
 */
function initializeTracing(): void {
  if (!config.tracing.enabled) {
    return;
  }

  try {
    const exporter = createExporter();

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.tracing.serviceName,
      [ATTR_SERVICE_VERSION]: config.app.version,
      [ATTR_DEPLOYMENT_ENVIRONMENT]: config.app.nodeEnv,
    });

    const autoInstrumentations = getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-graphql': {
        enabled: true,
        allowValues: true,
        mergeItems: true,
      },
      // App uses postgres.js, not pg; skip pg instrumentation
      '@opentelemetry/instrumentation-pg': { enabled: false },
      // Use ioredis instrumentation below; redis-4 key removed in newer auto-instrumentations
    });

    sdk = new NodeSDK({
      resource,
      spanProcessor: createSpanProcessor(exporter),
      instrumentations: [autoInstrumentations, new IORedisInstrumentation()],
    });

    sdk.start();

    logger.info({
      msg: 'OpenTelemetry tracing initialized',
      backend: config.tracing.backend,
      serviceName: config.tracing.serviceName,
      samplingRate: config.tracing.samplingRate,
    });
  } catch (err) {
    logger.error({
      msg: 'Failed to initialize OpenTelemetry tracing',
      err,
    });
  }
}

/**
 * Shutdown the tracing SDK and flush spans. Call from server gracefulShutdown
 * before closing DB/cache. No-op if tracing was never started.
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    logger.info({ msg: 'OpenTelemetry tracing shut down' });
  }
}

// Side-effect: initialize when this module is loaded (first import in server.ts)
initializeTracing();
