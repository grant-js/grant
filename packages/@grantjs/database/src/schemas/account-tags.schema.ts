import { relations, sql } from 'drizzle-orm';
import {
  pgPolicy,
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  varchar,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.schema';
import { tags } from './tags.schema';

export const accountTags = pgTable(
  'account_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    tagId: uuid('tag_id')
      .references(() => tags.id, { onDelete: 'cascade' })
      .notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('account_tags_account_id_tag_id_unique')
      .on(table.accountId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('account_tags_deleted_at_idx').on(table.deletedAt),
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`NULLIF(current_setting('app.current_account_id', true), '') IS NULL OR account_id = NULLIF(current_setting('app.current_account_id', true), '')::uuid`,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

export const accountTagsRelations = relations(accountTags, ({ one }) => ({
  account: one(accounts, {
    fields: [accountTags.accountId],
    references: [accounts.id],
  }),
  tag: one(tags, {
    fields: [accountTags.tagId],
    references: [tags.id],
  }),
}));

export const accountTagAuditLogs = pgTable(
  'account_tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountTagId: uuid('account_tag_id').references(() => accountTags.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }),
    scopeId: varchar('scope_id', { length: 255 }),
  },
  (t) => [
    index('account_tag_audit_logs_account_tag_id_idx').on(t.accountTagId),
    index('account_tag_audit_logs_action_idx').on(t.action),
    index('account_tag_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type AccountTagModel = typeof accountTags.$inferSelect;
export type AccountTagInsert = typeof accountTags.$inferInsert;
export type AccountTagAuditLogModel = typeof accountTagAuditLogs.$inferSelect;
export type NewAccountTagAuditLogModel = typeof accountTagAuditLogs.$inferInsert;
