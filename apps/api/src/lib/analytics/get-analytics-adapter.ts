import { AnalyticsFactory } from '@grantjs/analytics';
import type { IAnalyticsAdapter } from '@grantjs/core';

import { config } from '@/config';
import { loggerFactory } from '@/lib/logger';

let adapter: IAnalyticsAdapter | null = null;

/**
 * Returns the singleton analytics adapter (noop or Umami) from config.
 * Product emits go through `trackProductEvent`; this stays the composition point.
 */
export function getAnalyticsAdapter(): IAnalyticsAdapter {
  if (!adapter) {
    const provider =
      config.analytics.enabled && config.analytics.provider !== 'none'
        ? config.analytics.provider
        : 'none';

    adapter = AnalyticsFactory.create(
      {
        provider,
        umami:
          provider === 'umami'
            ? {
                apiUrl: config.analytics.umami.apiUrl,
                websiteId: config.analytics.umami.websiteId,
                hostname: config.analytics.umami.hostname,
              }
            : undefined,
      },
      loggerFactory
    );
  }
  return adapter;
}
