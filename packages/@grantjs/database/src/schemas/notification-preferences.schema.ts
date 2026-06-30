import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const notificationChannels = ['in_app', 'email'] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

export const notificationPreferenceSources = ['user', 'org_enforced'] as const;
export type NotificationPreferenceSource = (typeof notificationPreferenceSources)[number];

/**
 * Per-user notification preference for a `category x channel`, optionally scoped.
 * `scopeId = ''` denotes the user's global default for the tenant; a concrete
 * `scopeId` overrides it. Precedence (resolved in the service) is
 * `org_enforced > user > category default`. User-scoped; no RLS policy (access
 * is enforced at the application layer by `recipientUserId`/`userId`).
 */
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }).notNull(),
    scopeId: varchar('scope_id', { length: 255 }).notNull().default(''),
    category: varchar('category', { length: 50 }).notNull(),
    channel: varchar('channel', { length: 20 }).$type<NotificationChannel>().notNull(),
    enabled: boolean('enabled').notNull(),
    source: varchar('source', { length: 20 })
      .$type<NotificationPreferenceSource>()
      .notNull()
      .default('user'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check('notification_preferences_channel_check', sql`("channel" IN ('in_app', 'email'))`),
    check('notification_preferences_source_check', sql`("source" IN ('user', 'org_enforced'))`),
    uniqueIndex('notification_preferences_unique').on(
      table.userId,
      table.scopeTenant,
      table.scopeId,
      table.category,
      table.channel
    ),
    index('notification_preferences_user_idx').on(table.userId),
  ]
);

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export type NotificationPreferenceModel = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferenceModel = typeof notificationPreferences.$inferInsert;
