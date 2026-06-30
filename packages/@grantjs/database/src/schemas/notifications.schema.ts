import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { eventLog } from './event-log.schema';
import { notificationChannels } from './notification-preferences.schema';
import { users } from './users.schema';

export const notificationStatuses = ['pending', 'delivered', 'failed', 'dead'] as const;
export type NotificationStatus = (typeof notificationStatuses)[number];

/**
 * Per-recipient notification derived from a domain event. For the `in_app`
 * channel this row is the read model itself (created `delivered`); for `email`
 * it tracks send state with app-level retry. One row per
 * `(event, recipient, channel)` guarantees idempotent fan-out. User-scoped; no
 * RLS policy (access enforced at the application layer by `recipientUserId`).
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .references(() => eventLog.id, { onDelete: 'cascade' })
      .notNull(),
    recipientUserId: uuid('recipient_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    channel: varchar('channel', { length: 20 })
      .$type<(typeof notificationChannels)[number]>()
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body'),
    refEntity: varchar('ref_entity', { length: 100 }),
    refId: varchar('ref_id', { length: 255 }),
    status: varchar('status', { length: 20 })
      .$type<NotificationStatus>()
      .notNull()
      .default('pending'),
    seenAt: timestamp('seen_at'),
    readAt: timestamp('read_at'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at'),
    errorDetails: jsonb('error_details'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check('notifications_channel_check', sql`("channel" IN ('in_app', 'email'))`),
    check(
      'notifications_status_check',
      sql`("status" IN ('pending', 'delivered', 'failed', 'dead'))`
    ),
    uniqueIndex('notifications_event_recipient_channel_unique').on(
      table.eventId,
      table.recipientUserId,
      table.channel
    ),
    index('notifications_recipient_idx').on(table.recipientUserId, table.createdAt),
    index('notifications_recipient_unread_idx').on(table.recipientUserId, table.readAt),
    index('notifications_due_idx').on(table.channel, table.status, table.nextRetryAt),
  ]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  event: one(eventLog, {
    fields: [notifications.eventId],
    references: [eventLog.id],
  }),
  recipient: one(users, {
    fields: [notifications.recipientUserId],
    references: [users.id],
  }),
}));

export type NotificationModel = typeof notifications.$inferSelect;
export type NewNotificationModel = typeof notifications.$inferInsert;
