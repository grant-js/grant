import { relations, sql } from 'drizzle-orm';
import { index, pgPolicy, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { apiKeys } from './api-keys.schema';
import { permissions } from './permissions.schema';
import { projects } from './projects.schema';

/**
 * The permissions a project API key carries instead of a role. The key's tenant and project
 * live on its `organization_project_api_keys` / `account_project_api_keys` row; `project_id`
 * is repeated here so the table carries the project row-level policy of its siblings.
 */
export const apiKeyPermissions = pgTable(
  'api_key_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    apiKeyId: uuid('api_key_id')
      .references(() => apiKeys.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('api_key_permissions_api_key_permission_unique')
      .on(table.apiKeyId, table.permissionId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('api_key_permissions_api_key_id_idx').on(table.apiKeyId),
    index('api_key_permissions_permission_id_idx').on(table.permissionId),
    index('api_key_permissions_project_id_idx').on(table.projectId),
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid`,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

export const apiKeyPermissionsRelations = relations(apiKeyPermissions, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiKeyPermissions.apiKeyId],
    references: [apiKeys.id],
  }),
  permission: one(permissions, {
    fields: [apiKeyPermissions.permissionId],
    references: [permissions.id],
  }),
  project: one(projects, {
    fields: [apiKeyPermissions.projectId],
    references: [projects.id],
  }),
}));

export type ApiKeyPermissionModel = typeof apiKeyPermissions.$inferSelect;
export type NewApiKeyPermissionModel = typeof apiKeyPermissions.$inferInsert;
