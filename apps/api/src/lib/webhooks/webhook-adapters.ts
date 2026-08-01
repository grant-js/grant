import { createWebhookAdapters, type WebhookAdapters } from '@grantjs/webhooks';

import { config } from '@/config';
import { loggerFactory } from '@/lib/logger';

/**
 * Process-wide webhook signer + HTTP delivery adapter. Built once from config;
 * the SSRF guard settings come from {@link config.webhooks}.
 */
export const webhookAdapters: WebhookAdapters = createWebhookAdapters(
  {
    defaultTimeoutMs: config.webhooks.deliveryTimeoutMs,
    ssrf: {
      allowedProtocols: [...config.webhooks.ssrf.allowedProtocols],
      allowPrivateTargets: config.webhooks.ssrf.allowPrivateTargets,
      allowlist: [...config.webhooks.ssrf.allowlist],
      denylist: [...config.webhooks.ssrf.denylist],
    },
  },
  loggerFactory
);
