import { relations, sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { users } from './users.schema';

export const projectUsers = pgTable(
  'project_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    /** Project-visible display name override; null means use global users.name */
    displayName: varchar('display_name', { length: 255 }),
    /** Project-visible picture URL override; null means use global users.picture_url */
    pictureUrl: varchar('picture_url', { length: 500 }),
    /** Denormalized search tokens (name, displayName, CDM searchable, allowlisted metadata). */
    searchDocument: text('search_document').default('').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('project_users_metadata_idx').using('gin', table.metadata),
    index('project_users_search_document_trgm_idx').using(
      'gin',
      sql`${table.searchDocument} gin_trgm_ops`
    ),
    uniqueIndex('project_users_project_id_user_id_unique')
      .on(table.projectId, table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    /** Non-unique: many rows can share the same soft-delete timestamp (e.g. parallel deletes). */
    index('project_users_deleted_at_idx').on(table.deletedAt),
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

export const projectUsersRelations = relations(projectUsers, ({ one }) => ({
  project: one(projects, {
    fields: [projectUsers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUsers.userId],
    references: [users.id],
  }),
}));

export const projectUserAuditLogs = pgTable(
  'project_user_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectUserId: uuid('project_user_id').references(() => projectUsers.id, {
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
    index('project_user_audit_logs_project_user_id_idx').on(t.projectUserId),
    index('project_user_audit_logs_action_idx').on(t.action),
    index('project_user_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type ProjectUserModel = typeof projectUsers.$inferSelect;
export type NewProjectUserModel = typeof projectUsers.$inferInsert;
export type ProjectUserAuditLogModel = typeof projectUserAuditLogs.$inferSelect;
export type NewProjectUserAuditLogModel = typeof projectUserAuditLogs.$inferInsert;
