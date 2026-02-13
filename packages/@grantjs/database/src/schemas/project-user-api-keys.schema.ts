import { relations, sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { apiKeys } from './api-keys.schema';
import { projects } from './projects.schema';
import { users } from './users.schema';

export const projectUserApiKeys = pgTable(
  'project_user_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    apiKeyId: uuid('api_key_id')
      .references(() => apiKeys.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_user_api_keys_api_key_project_user_unique')
      .on(table.apiKeyId, table.projectId, table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('project_user_api_keys_api_key_id_idx').on(table.apiKeyId),
    index('project_user_api_keys_project_id_idx').on(table.projectId),
    index('project_user_api_keys_user_id_idx').on(table.userId),
    index('project_user_api_keys_deleted_at_idx').on(table.deletedAt),
  ]
);

export const projectUserApiKeysRelations = relations(projectUserApiKeys, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [projectUserApiKeys.apiKeyId],
    references: [apiKeys.id],
  }),
  project: one(projects, {
    fields: [projectUserApiKeys.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUserApiKeys.userId],
    references: [users.id],
    relationName: 'projectUserApiKeyUser',
  }),
}));

export const projectUserApiKeyAuditLogs = pgTable(
  'project_user_api_key_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectUserApiKeyId: uuid('project_user_api_key_id')
      .references(() => projectUserApiKeys.id, { onDelete: 'cascade' })
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
    index('project_user_api_key_audit_logs_project_user_api_key_id_idx').on(t.projectUserApiKeyId),
    index('project_user_api_key_audit_logs_action_idx').on(t.action),
    index('project_user_api_key_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const projectUserApiKeyAuditLogsRelations = relations(
  projectUserApiKeyAuditLogs,
  ({ one }) => ({
    projectUserApiKey: one(projectUserApiKeys, {
      fields: [projectUserApiKeyAuditLogs.projectUserApiKeyId],
      references: [projectUserApiKeys.id],
    }),
    performedByUser: one(users, {
      fields: [projectUserApiKeyAuditLogs.performedBy],
      references: [users.id],
    }),
  })
);

export type ProjectUserApiKeyModel = typeof projectUserApiKeys.$inferSelect;
export type NewProjectUserApiKeyModel = typeof projectUserApiKeys.$inferInsert;
export type ProjectUserApiKeyAuditLogModel = typeof projectUserApiKeyAuditLogs.$inferSelect;
export type NewProjectUserApiKeyAuditLogModel = typeof projectUserApiKeyAuditLogs.$inferInsert;
