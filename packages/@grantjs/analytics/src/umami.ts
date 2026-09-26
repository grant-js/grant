import type { AnalyticsEvent, IAnalyticsAdapter, ILogger } from '@grantjs/core';

export interface UmamiAnalyticsConfig {
  /** Umami API base URL (e.g. https://analytics.example.com or https://cloud.umami.is) */
  apiUrl: string;
  /** Website ID from Umami dashboard */
  websiteId: string;
  /** Optional hostname to send with each event */
  hostname?: string;
}

function umamiEventData(event: AnalyticsEvent): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (event.properties) {
    for (const [key, value] of Object.entries(event.properties)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }
  }

  if (event.userId) {
    data.actorId = event.userId;
  }
  if (event.accountId) {
    data.accountId = event.accountId;
  }
  if (event.organizationId) {
    data.organizationId = event.organizationId;
  }
  if (event.requestId) {
    data.requestId = event.requestId;
  }

  return data;
}

/**
 * Sends named events to Umami POST /api/send.
 * Payload `id` stays unset: Umami uses it as a visitor cache key.
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
    const data = umamiEventData(event);
    const payload = {
      type: 'event' as const,
      payload: {
        website: this.config.websiteId,
        name: event.name,
        hostname: this.config.hostname ?? 'grant-api',
        url: '/',
        title: event.category ?? event.name,
        data,
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
