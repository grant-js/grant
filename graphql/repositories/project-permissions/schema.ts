import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, uniqueIndex, varchar, index } from 'drizzle-orm/pg-core';

import { permissions } from '../permissions/schema';
import { projects } from '../projects/schema';

export const projectPermissions = pgTable(
  'project_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_permissions_project_id_permission_id_unique')
      .on(table.projectId, table.permissionId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('project_permissions_deleted_at_idx').on(table.deletedAt),
  ]
);

export const projectPermissionsRelations = relations(projectPermissions, ({ one }) => ({
  project: one(projects, {
    fields: [projectPermissions.projectId],
    references: [projects.id],
  }),
  permission: one(permissions, {
    fields: [projectPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const projectPermissionsAuditLogs = pgTable(
  'project_permission_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectPermissionId: uuid('project_permission_id')
      .references(() => projectPermissions.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('project_permission_audit_logs_project_permission_id_idx').on(t.projectPermissionId),
    index('project_permission_audit_logs_action_idx').on(t.action),
  ]
);

export type ProjectPermissionModel = typeof projectPermissions.$inferSelect;
export type ProjectPermissionInsert = typeof projectPermissions.$inferInsert;
export type ProjectPermissionAuditLogModel = typeof projectPermissionsAuditLogs.$inferSelect;
export type NewProjectPermissionAuditLogModel = typeof projectPermissionsAuditLogs.$inferInsert;
