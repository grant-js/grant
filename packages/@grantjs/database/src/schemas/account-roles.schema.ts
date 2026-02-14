import { relations, sql } from 'drizzle-orm';
import {
  pgPolicy,
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  varchar,
  index,
} from 'drizzle-orm/pg-core';

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
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`NULLIF(current_setting('app.current_account_id', true), '') IS NULL OR account_id = NULLIF(current_setting('app.current_account_id', true), '')::uuid`,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
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
    accountRoleId: uuid('account_role_id').references(() => accountRoles.id, {
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
    index('account_role_audit_logs_account_role_id_idx').on(t.accountRoleId),
    index('account_role_audit_logs_action_idx').on(t.action),
    index('account_role_audit_logs_scope_tenant_idx').on(t.scopeTenant),
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
