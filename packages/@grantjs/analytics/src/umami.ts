import type { AnalyticsEvent, IAnalyticsAdapter, ILogger } from '@grantjs/core';

export interface UmamiAnalyticsConfig {
  /** Umami API base URL (e.g. https://analytics.example.com or https://cloud.umami.is) */
  apiUrl: string;
  /** Website ID from Umami dashboard */
  websiteId: string;
  /** Optional hostname to send with each event */
  hostname?: string;
}

/**
 * Umami analytics adapter. Sends events to Umami's POST /api/send.
 * Requires a valid User-Agent header; no auth token for /api/send.
 */
export class UmamiAnalyticsAdapter implements IAnalyticsAdapter {
  private readonly config: UmamiAnalyticsConfig;
  private readonly logger: ILogger;

  constructor(config: UmamiAnalyticsConfig, logger: ILogger) {
    this.config = config;
    this.logger = logger;
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    const url = `${this.config.apiUrl.replace(/\/$/, '')}/api/send`;
    const payload = {
      type: 'event' as const,
      payload: {
        website: this.config.websiteId,
        name: event.name,
        hostname: this.config.hostname ?? 'grant-api',
        url: '/',
        title: event.category ?? event.name,
        data: event.properties ?? {},
        ...(event.requestId && { id: event.requestId }),
        ...(event.category && { tag: event.category }),
      },
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Grant-API/1.0 (Analytics)',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        this.logger.warn({
          msg: 'Umami analytics request failed',
          status: res.status,
          eventName: event.name,
        });
      }
    } catch (err) {
      this.logger.error({
        msg: 'Umami analytics send error',
        err,
        eventName: event.name,
      });
    }
  }
}
