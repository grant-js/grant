import { relations, sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { apiKeys } from './api-keys.schema';
import { organizations } from './organizations.schema';
import { projects } from './projects.schema';
import { roles } from './roles.schema';
import { users } from './users.schema';

export const organizationProjectApiKeys = pgTable(
  'organization_project_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    apiKeyId: uuid('api_key_id')
      .references(() => apiKeys.id, { onDelete: 'cascade' })
      .notNull(),
    organizationRoleId: uuid('organization_role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('organization_project_api_keys_org_project_api_key_unique')
      .on(table.organizationId, table.projectId, table.apiKeyId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('organization_project_api_keys_organization_id_idx').on(table.organizationId),
    index('organization_project_api_keys_project_id_idx').on(table.projectId),
    index('organization_project_api_keys_api_key_id_idx').on(table.apiKeyId),
    index('organization_project_api_keys_organization_role_id_idx').on(table.organizationRoleId),
    index('organization_project_api_keys_deleted_at_idx').on(table.deletedAt),
  ]
);

export const organizationProjectApiKeysRelations = relations(
  organizationProjectApiKeys,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationProjectApiKeys.organizationId],
      references: [organizations.id],
    }),
    project: one(projects, {
      fields: [organizationProjectApiKeys.projectId],
      references: [projects.id],
    }),
    apiKey: one(apiKeys, {
      fields: [organizationProjectApiKeys.apiKeyId],
      references: [apiKeys.id],
    }),
    role: one(roles, {
      fields: [organizationProjectApiKeys.organizationRoleId],
      references: [roles.id],
    }),
  })
);

export const organizationProjectApiKeyAuditLogs = pgTable(
  'organization_project_api_key_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationProjectApiKeyId: uuid('organization_project_api_key_id')
      .references(() => organizationProjectApiKeys.id, { onDelete: 'cascade' })
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
    index('organization_project_api_key_audit_logs_org_project_api_key_id_idx').on(
      t.organizationProjectApiKeyId
    ),
    index('organization_project_api_key_audit_logs_action_idx').on(t.action),
    index('organization_project_api_key_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const organizationProjectApiKeyAuditLogsRelations = relations(
  organizationProjectApiKeyAuditLogs,
  ({ one }) => ({
    organizationProjectApiKey: one(organizationProjectApiKeys, {
      fields: [organizationProjectApiKeyAuditLogs.organizationProjectApiKeyId],
      references: [organizationProjectApiKeys.id],
    }),
    performedByUser: one(users, {
      fields: [organizationProjectApiKeyAuditLogs.performedBy],
      references: [users.id],
    }),
  })
);

export type OrganizationProjectApiKeyModel = typeof organizationProjectApiKeys.$inferSelect;
export type NewOrganizationProjectApiKeyModel = typeof organizationProjectApiKeys.$inferInsert;
export type OrganizationProjectApiKeyAuditLogModel =
  typeof organizationProjectApiKeyAuditLogs.$inferSelect;
export type NewOrganizationProjectApiKeyAuditLogModel =
  typeof organizationProjectApiKeyAuditLogs.$inferInsert;
