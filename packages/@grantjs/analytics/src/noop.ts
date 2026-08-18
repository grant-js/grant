import type { AnalyticsEvent, IAnalyticsAdapter } from '@grantjs/core';

/**
 * No-op analytics adapter. Drops all events; used when provider is 'none' or disabled.
 */
export class NoopAnalyticsAdapter implements IAnalyticsAdapter {
  async trackEvent(_event: AnalyticsEvent): Promise<void> {
    // no-op
  }
}
