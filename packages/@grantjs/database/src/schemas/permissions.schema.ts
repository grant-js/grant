import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { permissionTags } from './permission-tags.schema';
import { resources } from './resources.schema';

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    action: varchar('action', { length: 255 }).notNull(),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'set null' }),
    condition: jsonb('condition'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('permissions_deleted_at_idx').on(t.deletedAt),
    index('permissions_resource_id_idx').on(t.resourceId),
    index('permissions_condition_idx').using('gin', t.condition),
  ]
);

export const permissionsRelations = relations(permissions, ({ one, many }) => ({
  resource: one(resources, {
    fields: [permissions.resourceId],
    references: [resources.id],
  }),
  tags: many(permissionTags),
}));

export const permissionAuditLogs = pgTable(
  'permission_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'set null' }),
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
    index('permission_audit_logs_permission_id_idx').on(t.permissionId),
    index('permission_audit_logs_action_idx').on(t.action),
    index('permission_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type PermissionModel = typeof permissions.$inferSelect;
export type NewPermissionModel = typeof permissions.$inferInsert;
export type PermissionAuditLogModel = typeof permissionAuditLogs.$inferSelect;
export type NewPermissionAuditLogModel = typeof permissionAuditLogs.$inferInsert;
