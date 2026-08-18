import type { ILoggerFactory, ITelemetryAdapter } from '@grantjs/core';
import { ConfigurationError, noopLogger } from '@grantjs/core';

import { CloudWatchTelemetryAdapter } from './cloudwatch';
import { NoopTelemetryAdapter } from './noop';

export type TelemetryProvider = 'none' | 'cloudwatch';

export interface TelemetryFactoryConfig {
  provider: TelemetryProvider;
  cloudwatch?: {
    region: string;
    logGroupName: string;
    logStreamPrefix?: string;
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

      default:
        return new NoopTelemetryAdapter();
    }
  }
}
