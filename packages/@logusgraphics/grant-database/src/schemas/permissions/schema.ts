import { relations } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    action: varchar('action', { length: 255 }).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('permissions_deleted_at_idx').on(t.deletedAt)]
);

export const permissionsRelations = relations(permissions, ({ many }) => ({
  tags: many(permissionTags),
}));

export const permissionAuditLogs = pgTable(
  'permission_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('permission_audit_logs_permission_id_idx').on(t.permissionId),
    index('permission_audit_logs_action_idx').on(t.action),
  ]
);

export type PermissionModel = typeof permissions.$inferSelect;
export type NewPermissionModel = typeof permissions.$inferInsert;
export type PermissionAuditLogModel = typeof permissionAuditLogs.$inferSelect;
export type NewPermissionAuditLogModel = typeof permissionAuditLogs.$inferInsert;

import { permissionTags } from '../permission-tags/schema';
