import { relations, sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { permissions } from './permissions.schema';
import { users } from './users.schema';

export const userPermissions = pgTable(
  'user_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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
    uniqueIndex('user_permissions_user_id_permission_id_unique')
      .on(table.userId, table.permissionId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('user_permissions_deleted_at_idx').on(table.deletedAt),
  ]
);

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userPermissionsAuditLogs = pgTable(
  'user_permissions_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userPermissionId: uuid('user_permission_id').references(() => userPermissions.id, {
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
    index('user_permissions_audit_logs_user_permission_id_idx').on(t.userPermissionId),
    index('user_permissions_audit_logs_action_idx').on(t.action),
    index('user_permissions_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type UserPermissionModel = typeof userPermissions.$inferSelect;
export type NewUserPermissionModel = typeof userPermissions.$inferInsert;
export type UserPermissionAuditLogModel = typeof userPermissionsAuditLogs.$inferSelect;
export type NewUserPermissionAuditLogModel = typeof userPermissionsAuditLogs.$inferInsert;
