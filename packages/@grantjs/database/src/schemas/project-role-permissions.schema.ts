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
import { roles } from './roles.schema';

export const projectRolePermissions = pgTable(
  'project_role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_role_permissions_project_role_permission_unique')
      .on(table.projectId, table.roleId, table.permissionId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('project_role_permissions_deleted_at_idx').on(table.deletedAt),
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

export const projectRolePermissionsRelations = relations(projectRolePermissions, ({ one }) => ({
  project: one(projects, {
    fields: [projectRolePermissions.projectId],
    references: [projects.id],
  }),
  role: one(roles, {
    fields: [projectRolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [projectRolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const projectRolePermissionAuditLogs = pgTable(
  'project_role_permission_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectRolePermissionId: uuid('project_role_permission_id').references(
      () => projectRolePermissions.id,
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
    index('project_role_permission_audit_logs_project_role_permission_id_idx').on(
      t.projectRolePermissionId
    ),
    index('project_role_permission_audit_logs_action_idx').on(t.action),
    index('project_role_permission_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type ProjectRolePermissionModel = typeof projectRolePermissions.$inferSelect;
export type ProjectRolePermissionInsert = typeof projectRolePermissions.$inferInsert;
export type ProjectRolePermissionAuditLogModel = typeof projectRolePermissionAuditLogs.$inferSelect;
export type NewProjectRolePermissionAuditLogModel =
  typeof projectRolePermissionAuditLogs.$inferInsert;
