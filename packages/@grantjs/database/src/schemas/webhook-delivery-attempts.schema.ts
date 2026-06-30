import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { eventLog } from './event-log.schema';
import { webhookSubscriptions } from './webhook-subscriptions.schema';

export const webhookDeliveryStatuses = [
  'pending',
  'running',
  'delivered',
  'failed',
  'dead',
] as const;
export type WebhookDeliveryStatus = (typeof webhookDeliveryStatuses)[number];

/**
 * One delivery record per (event, subscription). Created idempotently by the
 * webhook dispatcher; advanced by the delivery job (sign + POST). App-level
 * retries escalate over ~24h via `attemptCount` / `nextRetryAt` before the
 * record is parked as `dead` for manual replay.
 */
export const webhookDeliveryAttempts = pgTable(
  'webhook_delivery_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .references(() => eventLog.id, { onDelete: 'cascade' })
      .notNull(),
    subscriptionId: uuid('subscription_id')
      .references(() => webhookSubscriptions.id, { onDelete: 'cascade' })
      .notNull(),
    status: varchar('status', { length: 20 })
      .$type<WebhookDeliveryStatus>()
      .notNull()
      .default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at'),
    lastResponseStatus: integer('last_response_status'),
    errorDetails: jsonb('error_details'),
    deliveredAt: timestamp('delivered_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check(
      'webhook_delivery_attempts_status_check',
      sql`("status" IN ('pending', 'running', 'delivered', 'failed', 'dead'))`
    ),
    uniqueIndex('webhook_delivery_attempts_event_subscription_unique').on(
      table.eventId,
      table.subscriptionId
    ),
    index('webhook_delivery_attempts_due_idx').on(table.status, table.nextRetryAt),
    index('webhook_delivery_attempts_subscription_id_idx').on(table.subscriptionId),
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR EXISTS (SELECT 1 FROM webhook_subscriptions ws WHERE ws.id = subscription_id AND ws.project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid)`,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

export const webhookDeliveryAttemptsRelations = relations(webhookDeliveryAttempts, ({ one }) => ({
  event: one(eventLog, {
    fields: [webhookDeliveryAttempts.eventId],
    references: [eventLog.id],
  }),
  subscription: one(webhookSubscriptions, {
    fields: [webhookDeliveryAttempts.subscriptionId],
    references: [webhookSubscriptions.id],
  }),
}));

export type WebhookDeliveryAttemptModel = typeof webhookDeliveryAttempts.$inferSelect;
export type NewWebhookDeliveryAttemptModel = typeof webhookDeliveryAttempts.$inferInsert;
