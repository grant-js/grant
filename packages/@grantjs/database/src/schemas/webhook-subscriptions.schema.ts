import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { users } from './users.schema';

/**
 * Per-project webhook subscription. Machine integrations register a URL + event
 * type filter; the signing secret is generated server-side, stored here, and
 * shown to the caller exactly once.
 */
export const webhookSubscriptions = pgTable(
  'webhook_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }).notNull(),
    scopeId: varchar('scope_id', { length: 255 }).notNull(),
    url: varchar('url', { length: 2048 }).notNull(),
    secretRef: varchar('secret_ref', { length: 255 }).notNull(),
    eventTypes: text('event_types').array().notNull(),
    active: boolean('active').notNull().default(true),
    description: varchar('description', { length: 500 }),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('webhook_subscriptions_project_id_idx').on(table.projectId),
    index('webhook_subscriptions_scope_idx').on(table.scopeTenant, table.scopeId),
    index('webhook_subscriptions_active_idx').on(table.active),
    index('webhook_subscriptions_deleted_at_idx').on(table.deletedAt),
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid`,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

export const webhookSubscriptionsRelations = relations(webhookSubscriptions, ({ one }) => ({
  project: one(projects, {
    fields: [webhookSubscriptions.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [webhookSubscriptions.createdById],
    references: [users.id],
  }),
}));

export type WebhookSubscriptionModel = typeof webhookSubscriptions.$inferSelect;
export type NewWebhookSubscriptionModel = typeof webhookSubscriptions.$inferInsert;
