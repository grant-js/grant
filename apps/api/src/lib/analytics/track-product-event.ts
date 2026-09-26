import type { AnalyticsEvent, ProductAnalyticsEvent, ProductEventProperties } from '@grantjs/core';
import { PRODUCT_EVENT_CATEGORY } from '@grantjs/core';
import type { DomainEvent } from '@grantjs/schema';
import { Tenant } from '@grantjs/schema';

import { createLogger } from '@/lib/logger';

import { getAnalyticsAdapter } from './get-analytics-adapter';
import { projectDomainEvent } from './project-domain-event';

const logger = createLogger('ProductAnalytics');

const PRODUCT_PROPERTY_KEYS = [
  'provider',
  'reason',
  'result',
  'operation',
  'enabled',
  'stepUpRequired',
  'actorId',
  'scopeTenant',
  'scopeId',
  'projectId',
] as const satisfies readonly (keyof ProductEventProperties)[];

function compactProperties(
  properties: ProductEventProperties | undefined
): Record<string, unknown> | undefined {
  if (!properties) {
    return undefined;
  }

  const compact: Record<string, unknown> = {};
  for (const key of PRODUCT_PROPERTY_KEYS) {
    const value = properties[key];
    if (value !== undefined) {
      compact[key] = value;
    }
  }
  return Object.keys(compact).length > 0 ? compact : undefined;
}

function toAnalyticsEvent(event: ProductAnalyticsEvent): AnalyticsEvent {
  const properties = event.properties;
  return {
    name: event.name,
    category: PRODUCT_EVENT_CATEGORY[event.name],
    properties: compactProperties(properties),
    userId: properties?.actorId,
    accountId: properties?.scopeTenant === Tenant.Account ? properties.scopeId : undefined,
    organizationId:
      properties?.scopeTenant === Tenant.Organization ? properties.scopeId : undefined,
    requestId: event.requestId,
  };
}

async function sendProductEvent(event: ProductAnalyticsEvent): Promise<void> {
  try {
    await getAnalyticsAdapter().trackEvent(toAnalyticsEvent(event));
  } catch (err: unknown) {
    logger.error({ msg: 'Analytics track failed', err, eventName: event.name });
  }
}

/** Fire-and-forget. A failed send is logged and does not reject. */
export function trackProductEvent(event: ProductAnalyticsEvent): void {
  void sendProductEvent(event);
}

type ScheduleAfterCommit = (fn: () => void | Promise<void>) => void;

/**
 * Queue a success event until the request transaction commits.
 * Without a hook, sends immediately (the same fallback project sync uses).
 */
export function trackProductEventAfterCommit(
  scheduleAfterCommit: ScheduleAfterCommit | undefined,
  event: ProductAnalyticsEvent
): void {
  const defer =
    scheduleAfterCommit ??
    ((fn: () => void | Promise<void>) => {
      void Promise.resolve(fn());
    });
  defer(() => {
    trackProductEvent(event);
  });
}

/** Project a committed outbox batch. Unlisted types are skipped. Sends are sequential. */
export async function trackProjectedDomainEvents(events: readonly DomainEvent[]): Promise<void> {
  for (const event of events) {
    const projected = projectDomainEvent(event);
    if (projected) {
      await sendProductEvent(projected);
    }
  }
}
