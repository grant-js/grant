import { relations, sql } from 'drizzle-orm';
import {
  index,
  pgPolicy,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { groups } from './groups.schema';
import { projects } from './projects.schema';
import { users } from './users.schema';

export const projectUserGroups = pgTable(
  'project_user_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    groupId: uuid('group_id')
      .references(() => groups.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_user_groups_project_user_group_unique')
      .on(table.projectId, table.userId, table.groupId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('project_user_groups_deleted_at_idx').on(table.deletedAt),
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

export const projectUserGroupsRelations = relations(projectUserGroups, ({ one }) => ({
  project: one(projects, {
    fields: [projectUserGroups.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUserGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [projectUserGroups.groupId],
    references: [groups.id],
  }),
}));

export const projectUserGroupAuditLogs = pgTable(
  'project_user_group_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectUserGroupId: uuid('project_user_group_id').references(() => projectUserGroups.id, {
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
    index('project_user_group_audit_logs_project_user_group_id_idx').on(t.projectUserGroupId),
    index('project_user_group_audit_logs_action_idx').on(t.action),
    index('project_user_group_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type ProjectUserGroupModel = typeof projectUserGroups.$inferSelect;
export type ProjectUserGroupInsert = typeof projectUserGroups.$inferInsert;
export type ProjectUserGroupAuditLogModel = typeof projectUserGroupAuditLogs.$inferSelect;
export type NewProjectUserGroupAuditLogModel = typeof projectUserGroupAuditLogs.$inferInsert;
