import type {
  ILogger,
  IWebhookDeliveryAdapter,
  WebhookDeliveryRequest,
  WebhookDeliveryResult,
} from '@grantjs/core';

import { assertUrlAllowed, SsrfBlockedError, type SsrfGuardOptions } from './ssrf';

export interface HttpWebhookDeliveryConfig {
  /** Default per-request timeout in milliseconds. */
  defaultTimeoutMs: number;
  /** SSRF guard configuration. */
  ssrf: SsrfGuardOptions;
}

/** HTTP statuses that should be retried even though a response was received. */
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429]);

/**
 * HTTP webhook delivery adapter built on the global `fetch`. Applies the SSRF
 * guard before every request and classifies failures so the dispatcher can
 * decide whether to retry.
 */
export class HttpWebhookDeliveryAdapter implements IWebhookDeliveryAdapter {
  constructor(
    private readonly config: HttpWebhookDeliveryConfig,
    private readonly logger: ILogger
  ) {}

  async validateUrl(url: string): Promise<void> {
    await assertUrlAllowed(url, this.config.ssrf);
  }

  async deliver(request: WebhookDeliveryRequest): Promise<WebhookDeliveryResult> {
    try {
      await assertUrlAllowed(request.url, this.config.ssrf);
    } catch (error) {
      if (error instanceof SsrfBlockedError) {
        return {
          ok: false,
          status: null,
          errorType: 'ssrf',
          errorMessage: error.message,
          retryable: false,
        };
      }
      throw error;
    }

    const controller = new AbortController();
    const timeoutMs = request.timeoutMs ?? this.config.defaultTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
        redirect: 'error',
      });

      const status = response.status;
      if (status >= 200 && status < 300) {
        return { ok: true, status, retryable: false };
      }

      const retryable = status >= 500 || RETRYABLE_HTTP_STATUSES.has(status);
      return {
        ok: false,
        status,
        errorType: 'http',
        errorMessage: `Endpoint responded with HTTP ${status}`,
        retryable,
      };
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError';
      this.logger.warn({
        msg: 'Webhook delivery failed at transport layer',
        url: request.url,
        err: error,
      });
      return {
        ok: false,
        status: null,
        errorType: isAbort ? 'timeout' : 'network',
        errorMessage: error instanceof Error ? error.message : String(error),
        retryable: true,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
