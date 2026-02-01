import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: varchar('client_id', { length: 255 }).notNull(),
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
    uniqueIndex('api_keys_client_id_unique').on(table.clientId),
    index('api_keys_deleted_at_idx').on(table.deletedAt),
    index('api_keys_is_revoked_idx').on(table.isRevoked),
  ]
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  createdByUser: one(users, {
    fields: [apiKeys.createdBy],
    references: [users.id],
    relationName: 'apiKeyCreatedBy',
  }),
  revokedByUser: one(users, {
    fields: [apiKeys.revokedBy],
    references: [users.id],
    relationName: 'apiKeyRevokedBy',
  }),
}));

export const apiKeyAuditLogs = pgTable(
  'api_key_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    apiKeyId: uuid('api_key_id')
      .references(() => apiKeys.id, { onDelete: 'cascade' })
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }),
    scopeId: varchar('scope_id', { length: 255 }),
  },
  (t) => [
    index('api_key_audit_logs_api_key_id_idx').on(t.apiKeyId),
    index('api_key_audit_logs_action_idx').on(t.action),
    index('api_key_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const apiKeyAuditLogsRelations = relations(apiKeyAuditLogs, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiKeyAuditLogs.apiKeyId],
    references: [apiKeys.id],
  }),
  performedByUser: one(users, {
    fields: [apiKeyAuditLogs.performedBy],
    references: [users.id],
  }),
}));

export type ApiKeyModel = typeof apiKeys.$inferSelect;
export type NewApiKeyModel = typeof apiKeys.$inferInsert;
export type ApiKeyAuditLogModel = typeof apiKeyAuditLogs.$inferSelect;
export type NewApiKeyAuditLogModel = typeof apiKeyAuditLogs.$inferInsert;
