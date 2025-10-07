import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, varchar, uniqueIndex, index } from 'drizzle-orm/pg-core';

import { groups } from '../groups/schema';
import { permissions } from '../permissions/schema';

export const groupPermissions = pgTable(
  'group_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .references(() => groups.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('group_permissions_group_id_permission_id_unique')
      .on(table.groupId, table.permissionId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('group_permissions_deleted_at_idx').on(table.deletedAt),
  ]
);

export const groupPermissionsRelations = relations(groupPermissions, ({ one }) => ({
  group: one(groups, {
    fields: [groupPermissions.groupId],
    references: [groups.id],
  }),
  permission: one(permissions, {
    fields: [groupPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const groupPermissionsAuditLogs = pgTable(
  'group_permission_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupPermissionId: uuid('group_permission_id')
      .references(() => groupPermissions.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('group_permission_audit_logs_group_permission_id_idx').on(t.groupPermissionId),
    index('group_permission_audit_logs_action_idx').on(t.action),
  ]
);

export type GroupPermissionModel = typeof groupPermissions.$inferSelect;
export type NewGroupPermissionModel = typeof groupPermissions.$inferInsert;
export type GroupPermissionAuditLogModel = typeof groupPermissionsAuditLogs.$inferSelect;
export type NewGroupPermissionAuditLogModel = typeof groupPermissionsAuditLogs.$inferInsert;
