import type { ILoggerFactory, ITelemetryAdapter } from '@grantjs/core';
import { ConfigurationError, noopLogger } from '@grantjs/core';

import { CloudWatchTelemetryAdapter } from './cloudwatch';
import { EmfTelemetryAdapter } from './emf';
import { NoopTelemetryAdapter } from './noop';

export type TelemetryProvider = 'none' | 'cloudwatch' | 'emf';

export interface TelemetryFactoryConfig {
  provider: TelemetryProvider;
  cloudwatch?: {
    region: string;
    logGroupName: string;
    logStreamPrefix?: string;
  };
  emf?: {
    namespace: string;
    dimensions: string[];
    metrics: Record<string, string>;
  };
}

/**
 * Factory for creating telemetry adapter instances based on configuration.
 * Adapters receive ILogger via loggerFactory; they never import @grantjs/logger.
 */
export class TelemetryFactory {
  static create(config: TelemetryFactoryConfig, loggerFactory?: ILoggerFactory): ITelemetryAdapter {
    const mkLogger = (name: string) => loggerFactory?.createLogger(name) ?? noopLogger;

    switch (config.provider) {
      case 'none':
        return new NoopTelemetryAdapter();

      case 'cloudwatch': {
        if (!config.cloudwatch?.region || !config.cloudwatch?.logGroupName) {
          throw new ConfigurationError(
            'CloudWatch telemetry requires region and logGroupName in config.telemetry.cloudwatch'
          );
        }
        return new CloudWatchTelemetryAdapter(
          {
            region: config.cloudwatch.region,
            logGroupName: config.cloudwatch.logGroupName,
            logStreamPrefix: config.cloudwatch.logStreamPrefix,
          },
          mkLogger('CloudWatchTelemetryAdapter')
        );
      }

      case 'emf': {
        // No required config: the defaults below are a working namespace and a
        // low-cardinality dimension set, so `TELEMETRY_PROVIDER=emf` alone works.
        return new EmfTelemetryAdapter(
          {
            namespace: config.emf?.namespace || 'Grant/API',
            dimensions: config.emf?.dimensions ?? ['method', 'statusCode'],
            metrics: config.emf?.metrics ?? { duration: 'Milliseconds' },
          },
          mkLogger('EmfTelemetryAdapter')
        );
      }

      default:
        return new NoopTelemetryAdapter();
    }
  }
}
