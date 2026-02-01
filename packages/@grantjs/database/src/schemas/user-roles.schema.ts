import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, varchar, uniqueIndex, index } from 'drizzle-orm/pg-core';

import { roles } from './roles.schema';
import { users } from './users.schema';

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('user_roles_user_id_role_id_unique')
      .on(table.userId, table.roleId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const userRolesAuditLogs = pgTable(
  'user_role_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userRoleId: uuid('user_role_id')
      .references(() => userRoles.id)
      .notNull(),
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
    index('user_role_audit_logs_user_role_id_idx').on(t.userRoleId),
    index('user_role_audit_logs_action_idx').on(t.action),
    index('user_role_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type UserRoleModel = typeof userRoles.$inferSelect;
export type NewUserRoleModel = typeof userRoles.$inferInsert;
export type UserRoleAuditLogModel = typeof userRolesAuditLogs.$inferSelect;
export type NewUserRoleAuditLogModel = typeof userRolesAuditLogs.$inferInsert;
