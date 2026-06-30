import { relations, sql } from 'drizzle-orm';
import {
  bigserial,
  check,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const eventDeliveryClasses = ['transactional', 'notification'] as const;
export type EventDeliveryClass = (typeof eventDeliveryClasses)[number];

export const eventRelayStatuses = ['pending', 'dispatched'] as const;
export type EventRelayStatus = (typeof eventRelayStatuses)[number];

/**
 * Domain-event outbox (`event_log`).
 *
 * Append-only source of truth written in the same transaction as the data
 * change + audit log. Independent consumers (webhooks, notifications) read from
 * here. `sequence` provides a monotonic ordering token surfaced in the envelope
 * so consumers can reorder and detect gaps. Like the existing `*_audit_logs`
 * tables, scoping is enforced at the application/repository layer and through
 * the project-scoped policy below; the relay/sweep run under the owner role.
 */
export const eventLog = pgTable(
  'event_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sequence: bigserial('sequence', { mode: 'number' }).notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    deliveryClass: varchar('delivery_class', { length: 20 })
      .$type<EventDeliveryClass>()
      .notNull()
      .default('notification'),
    scopeTenant: varchar('scope_tenant', { length: 50 }).notNull(),
    scopeId: varchar('scope_id', { length: 255 }).notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    subjectUserId: uuid('subject_user_id').references(() => users.id, { onDelete: 'set null' }),
    payload: jsonb('payload').notNull(),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
    relayStatus: varchar('relay_status', { length: 20 })
      .$type<EventRelayStatus>()
      .notNull()
      .default('pending'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    check(
      'event_log_delivery_class_check',
      sql`("delivery_class" IN ('transactional', 'notification'))`
    ),
    check('event_log_relay_status_check', sql`("relay_status" IN ('pending', 'dispatched'))`),
    index('event_log_relay_status_sequence_idx').on(table.relayStatus, table.sequence),
    index('event_log_scope_sequence_idx').on(table.scopeTenant, table.scopeId, table.sequence),
    index('event_log_type_idx').on(table.type),
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR scope_id LIKE '%' || current_setting('app.current_project_id', true)`,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

export const eventLogRelations = relations(eventLog, ({ one }) => ({
  actor: one(users, {
    fields: [eventLog.actorUserId],
    references: [users.id],
  }),
  subject: one(users, {
    fields: [eventLog.subjectUserId],
    references: [users.id],
  }),
}));

export type EventLogModel = typeof eventLog.$inferSelect;
export type NewEventLogModel = typeof eventLog.$inferInsert;
