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

import { permissions } from './permissions.schema';
import { projects } from './projects.schema';
import { users } from './users.schema';

export const projectUserPermissions = pgTable(
  'project_user_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_user_permissions_project_user_permission_unique')
      .on(table.projectId, table.userId, table.permissionId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('project_user_permissions_deleted_at_idx').on(table.deletedAt),
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

export const projectUserPermissionsRelations = relations(projectUserPermissions, ({ one }) => ({
  project: one(projects, {
    fields: [projectUserPermissions.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUserPermissions.userId],
    references: [users.id],
  }),
  permission: one(permissions, {
    fields: [projectUserPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const projectUserPermissionAuditLogs = pgTable(
  'project_user_permission_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectUserPermissionId: uuid('project_user_permission_id').references(
      () => projectUserPermissions.id,
      { onDelete: 'set null' }
    ),
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
    index('project_user_permission_audit_logs_project_user_permission_id_idx').on(
      t.projectUserPermissionId
    ),
    index('project_user_permission_audit_logs_action_idx').on(t.action),
    index('project_user_permission_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type ProjectUserPermissionModel = typeof projectUserPermissions.$inferSelect;
export type ProjectUserPermissionInsert = typeof projectUserPermissions.$inferInsert;
export type ProjectUserPermissionAuditLogModel = typeof projectUserPermissionAuditLogs.$inferSelect;
export type NewProjectUserPermissionAuditLogModel =
  typeof projectUserPermissionAuditLogs.$inferInsert;
