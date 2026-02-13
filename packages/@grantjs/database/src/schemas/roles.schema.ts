import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { roleGroups } from './role-groups.schema';
import { roleTags } from './role-tags.schema';

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    metadata: jsonb('metadata').default({}).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('roles_deleted_at_idx').on(t.deletedAt),
    index('roles_metadata_idx').using('gin', t.metadata),
  ]
);

export const rolesRelations = relations(roles, ({ many }) => ({
  tags: many(roleTags),
  groups: many(roleGroups),
}));

export const roleAuditLogs = pgTable(
  'role_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
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
    index('role_audit_logs_role_id_idx').on(t.roleId),
    index('role_audit_logs_action_idx').on(t.action),
    index('role_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type RoleModel = typeof roles.$inferSelect;
export type NewRoleModel = typeof roles.$inferInsert;
export type RoleAuditLogModel = typeof roleAuditLogs.$inferSelect;
export type NewRoleAuditLogModel = typeof roleAuditLogs.$inferInsert;
