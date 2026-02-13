import { relations, sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.schema';
import { apiKeys } from './api-keys.schema';
import { projects } from './projects.schema';
import { roles } from './roles.schema';
import { users } from './users.schema';

export const accountProjectApiKeys = pgTable(
  'account_project_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    apiKeyId: uuid('api_key_id')
      .references(() => apiKeys.id, { onDelete: 'cascade' })
      .notNull(),
    accountRoleId: uuid('account_role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('account_project_api_keys_account_project_api_key_unique')
      .on(table.accountId, table.projectId, table.apiKeyId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('account_project_api_keys_account_id_idx').on(table.accountId),
    index('account_project_api_keys_project_id_idx').on(table.projectId),
    index('account_project_api_keys_api_key_id_idx').on(table.apiKeyId),
    index('account_project_api_keys_account_role_id_idx').on(table.accountRoleId),
    index('account_project_api_keys_deleted_at_idx').on(table.deletedAt),
  ]
);

export const accountProjectApiKeysRelations = relations(accountProjectApiKeys, ({ one }) => ({
  account: one(accounts, {
    fields: [accountProjectApiKeys.accountId],
    references: [accounts.id],
  }),
  project: one(projects, {
    fields: [accountProjectApiKeys.projectId],
    references: [projects.id],
  }),
  apiKey: one(apiKeys, {
    fields: [accountProjectApiKeys.apiKeyId],
    references: [apiKeys.id],
  }),
  role: one(roles, {
    fields: [accountProjectApiKeys.accountRoleId],
    references: [roles.id],
  }),
}));

export const accountProjectApiKeyAuditLogs = pgTable(
  'account_project_api_key_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountProjectApiKeyId: uuid('account_project_api_key_id')
      .references(() => accountProjectApiKeys.id, { onDelete: 'cascade' })
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }),
    scopeId: varchar('scope_id', { length: 255 }),
  },
  (t) => [
    index('account_project_api_key_audit_logs_account_project_api_key_id_idx').on(
      t.accountProjectApiKeyId
    ),
    index('account_project_api_key_audit_logs_action_idx').on(t.action),
    index('account_project_api_key_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const accountProjectApiKeyAuditLogsRelations = relations(
  accountProjectApiKeyAuditLogs,
  ({ one }) => ({
    accountProjectApiKey: one(accountProjectApiKeys, {
      fields: [accountProjectApiKeyAuditLogs.accountProjectApiKeyId],
      references: [accountProjectApiKeys.id],
    }),
    performedByUser: one(users, {
      fields: [accountProjectApiKeyAuditLogs.performedBy],
      references: [users.id],
    }),
  })
);

export type AccountProjectApiKeyModel = typeof accountProjectApiKeys.$inferSelect;
export type NewAccountProjectApiKeyModel = typeof accountProjectApiKeys.$inferInsert;
export type AccountProjectApiKeyAuditLogModel = typeof accountProjectApiKeyAuditLogs.$inferSelect;
export type NewAccountProjectApiKeyAuditLogModel =
  typeof accountProjectApiKeyAuditLogs.$inferInsert;
