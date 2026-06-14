import { relations, sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { permissions } from './permissions.schema';
import { roles } from './roles.schema';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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
    uniqueIndex('role_permissions_role_id_permission_id_unique')
      .on(table.roleId, table.permissionId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('role_permissions_deleted_at_idx').on(table.deletedAt),
  ]
);

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const rolePermissionsAuditLogs = pgTable(
  'role_permissions_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rolePermissionId: uuid('role_permission_id').references(() => rolePermissions.id, {
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
    index('role_permissions_audit_logs_role_permission_id_idx').on(t.rolePermissionId),
    index('role_permissions_audit_logs_action_idx').on(t.action),
    index('role_permissions_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type RolePermissionModel = typeof rolePermissions.$inferSelect;
export type NewRolePermissionModel = typeof rolePermissions.$inferInsert;
export type RolePermissionAuditLogModel = typeof rolePermissionsAuditLogs.$inferSelect;
export type NewRolePermissionAuditLogModel = typeof rolePermissionsAuditLogs.$inferInsert;
