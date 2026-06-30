import type {
  ILogger,
  ILoggerFactory,
  IWebhookDeliveryAdapter,
  IWebhookSigner,
} from '@grantjs/core';

import { HttpWebhookDeliveryAdapter } from './delivery';
import { HmacWebhookSigner } from './signer';
import type { SsrfGuardOptions } from './ssrf';

const noop = () => {};
const noopLogger: ILogger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => noopLogger,
};

export interface WebhookFactoryConfig {
  defaultTimeoutMs: number;
  ssrf: SsrfGuardOptions;
}

export interface WebhookAdapters {
  signer: IWebhookSigner;
  delivery: IWebhookDeliveryAdapter;
}

/**
 * Build the webhook signer + HTTP delivery adapter. The logger factory is
 * injected (the package never imports `@grantjs/logger`); a no-op logger is
 * used when no factory is provided.
 */
export function createWebhookAdapters(
  config: WebhookFactoryConfig,
  loggerFactory?: ILoggerFactory
): WebhookAdapters {
  const mkLogger = (name: string) => loggerFactory?.createLogger(name) ?? noopLogger;
  return {
    signer: new HmacWebhookSigner(),
    delivery: new HttpWebhookDeliveryAdapter(
      { defaultTimeoutMs: config.defaultTimeoutMs, ssrf: config.ssrf },
      mkLogger('HttpWebhookDeliveryAdapter')
    ),
  };
}
