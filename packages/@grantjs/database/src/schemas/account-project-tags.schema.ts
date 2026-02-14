import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgPolicy,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts.schema';
import { projects } from './projects.schema';
import { tags } from './tags.schema';

export const accountProjectTags = pgTable(
  'account_project_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
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
    uniqueIndex('account_project_tags_account_id_project_id_tag_id_unique')
      .on(table.accountId, table.projectId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('account_project_tags_deleted_at_idx').on(table.deletedAt),
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`
        NULLIF(current_setting('app.current_account_id', true), '') IS NULL
        OR (account_id = NULLIF(current_setting('app.current_account_id', true), '')::uuid
            AND (NULLIF(current_setting('app.current_project_id', true), '') IS NULL
                 OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid))
      `,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

export const accountProjectTagsRelations = relations(accountProjectTags, ({ one }) => ({
  project: one(projects, {
    fields: [accountProjectTags.projectId],
    references: [projects.id],
  }),
  account: one(accounts, {
    fields: [accountProjectTags.accountId],
    references: [accounts.id],
  }),
  tag: one(tags, {
    fields: [accountProjectTags.tagId],
    references: [tags.id],
  }),
}));

export const accountProjectTagAuditLogs = pgTable(
  'account_project_tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountProjectTagId: uuid('account_project_tag_id').references(() => accountProjectTags.id, {
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
    index('account_project_tag_audit_logs_account_project_tag_id_idx').on(t.accountProjectTagId),
    index('account_project_tag_audit_logs_action_idx').on(t.action),
    index('account_project_tag_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type AccountProjectTagModel = typeof accountProjectTags.$inferSelect;
export type AccountProjectTagInsert = typeof accountProjectTags.$inferInsert;
export type AccountProjectTagAuditLogModel = typeof accountProjectTagAuditLogs.$inferSelect;
export type NewAccountProjectTagAuditLogModel = typeof accountProjectTagAuditLogs.$inferInsert;
