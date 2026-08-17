import type { IAnalyticsAdapter, ILoggerFactory } from '@grantjs/core';
import { ConfigurationError, noopLogger } from '@grantjs/core';

import { NoopAnalyticsAdapter } from './noop';
import { UmamiAnalyticsAdapter } from './umami';

export type AnalyticsProvider = 'none' | 'umami';

export interface AnalyticsFactoryConfig {
  provider: AnalyticsProvider;
  umami?: {
    apiUrl: string;
    websiteId: string;
    hostname?: string;
  };
}

/**
 * Factory for creating analytics adapter instances.
 * Adapters receive ILogger via loggerFactory; they never import @grantjs/logger directly.
 */
export class AnalyticsFactory {
  static create(config: AnalyticsFactoryConfig, loggerFactory?: ILoggerFactory): IAnalyticsAdapter {
    const mkLogger = (name: string) => loggerFactory?.createLogger(name) ?? noopLogger;

    switch (config.provider) {
      case 'none':
        return new NoopAnalyticsAdapter();

      case 'umami': {
        if (!config.umami?.apiUrl || !config.umami?.websiteId) {
          throw new ConfigurationError(
            'Umami analytics requires apiUrl and websiteId in config.analytics.umami'
          );
        }
        return new UmamiAnalyticsAdapter(
          {
            apiUrl: config.umami.apiUrl,
            websiteId: config.umami.websiteId,
            hostname: config.umami.hostname,
          },
          mkLogger('UmamiAnalyticsAdapter')
        );
      }

      default:
        return new NoopAnalyticsAdapter();
    }
  }
}
