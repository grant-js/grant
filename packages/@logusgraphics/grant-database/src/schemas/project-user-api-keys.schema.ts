import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { users } from './users.schema';

export const projectUserApiKeys = pgTable(
  'project_user_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    clientId: varchar('client_id', { length: 255 }).notNull().unique(),
    clientSecretHash: varchar('client_secret_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    description: varchar('description', { length: 1000 }),
    expiresAt: timestamp('expires_at'),
    lastUsedAt: timestamp('last_used_at'),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    revokedAt: timestamp('revoked_at'),
    revokedBy: uuid('revoked_by').references(() => users.id),
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_user_api_keys_project_user_unique')
      .on(table.projectId, table.userId)
      .where(sql`${table.deletedAt} IS NULL AND ${table.isRevoked} = false`),
    index('project_user_api_keys_project_id_idx').on(table.projectId),
    index('project_user_api_keys_user_id_idx').on(table.userId),
    index('project_user_api_keys_deleted_at_idx').on(table.deletedAt),
    index('project_user_api_keys_is_revoked_idx').on(table.isRevoked),
  ]
);

export const projectUserApiKeysRelations = relations(projectUserApiKeys, ({ one }) => ({
  project: one(projects, {
    fields: [projectUserApiKeys.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUserApiKeys.userId],
    references: [users.id],
    relationName: 'projectUserApiKeyUser',
  }),
  createdByUser: one(users, {
    fields: [projectUserApiKeys.createdBy],
    references: [users.id],
    relationName: 'projectUserApiKeyCreatedBy',
  }),
  revokedByUser: one(users, {
    fields: [projectUserApiKeys.revokedBy],
    references: [users.id],
    relationName: 'projectUserApiKeyRevokedBy',
  }),
}));

export const projectUserApiKeyAuditLogs = pgTable(
  'project_user_api_key_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectUserApiKeyId: uuid('project_user_api_key_id')
      .references(() => projectUserApiKeys.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('project_user_api_key_audit_logs_key_id_idx').on(t.projectUserApiKeyId),
    index('project_user_api_key_audit_logs_action_idx').on(t.action),
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
