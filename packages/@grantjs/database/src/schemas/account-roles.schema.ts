import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, uniqueIndex, varchar, index } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.schema';
import { roles } from './roles.schema';
import { users } from './users.schema';

export const accountRoles = pgTable(
  'account_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('account_roles_account_id_role_id_unique')
      .on(table.accountId, table.roleId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const accountRolesRelations = relations(accountRoles, ({ one }) => ({
  account: one(accounts, {
    fields: [accountRoles.accountId],
    references: [accounts.id],
  }),
  role: one(roles, {
    fields: [accountRoles.roleId],
    references: [roles.id],
  }),
}));

export const accountRoleAuditLogs = pgTable(
  'account_role_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountRoleId: uuid('account_role_id')
      .references(() => accountRoles.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('account_role_audit_logs_account_role_id_idx').on(t.accountRoleId),
    index('account_role_audit_logs_action_idx').on(t.action),
  ]
);

export const accountRoleAuditLogsRelations = relations(accountRoleAuditLogs, ({ one }) => ({
  accountRole: one(accountRoles, {
    fields: [accountRoleAuditLogs.accountRoleId],
    references: [accountRoles.id],
  }),
  performedByUser: one(users, {
    fields: [accountRoleAuditLogs.performedBy],
    references: [users.id],
  }),
}));

export type AccountRoleModel = typeof accountRoles.$inferSelect;
export type AccountRoleInsert = typeof accountRoles.$inferInsert;
export type AccountRoleAuditLogModel = typeof accountRoleAuditLogs.$inferSelect;
export type NewAccountRoleAuditLogModel = typeof accountRoleAuditLogs.$inferInsert;
