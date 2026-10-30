import { relations, sql } from 'drizzle-orm';
import {
  index,
  pgPolicy,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { apiKeys } from './api-keys.schema';
import { projects } from './projects.schema';

/**
 * The encrypted copy of a project user's API-key secret, kept only for a project that opted in
 * (`projects.exportable_api_key_secrets`). One row per key, replaced in place on rotate. The
 * triple is the output of `sealSecret` (AES-256-GCM); nothing here is readable without
 * `API_KEY_EXPORTABLE_SECRET_ENCRYPTION_KEY`.
 */
export const apiKeyExportableSecrets = pgTable(
  'api_key_exportable_secrets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    apiKeyId: uuid('api_key_id')
      .references(() => apiKeys.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    encryptedSecret: varchar('encrypted_secret', { length: 4000 }).notNull(),
    secretIv: varchar('secret_iv', { length: 255 }).notNull(),
    secretTag: varchar('secret_tag', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('api_key_exportable_secrets_api_key_id_unique').on(table.apiKeyId),
    index('api_key_exportable_secrets_project_id_idx').on(table.projectId),
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

export const apiKeyExportableSecretsRelations = relations(apiKeyExportableSecrets, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiKeyExportableSecrets.apiKeyId],
    references: [apiKeys.id],
  }),
  project: one(projects, {
    fields: [apiKeyExportableSecrets.projectId],
    references: [projects.id],
  }),
}));

export type ApiKeyExportableSecretModel = typeof apiKeyExportableSecrets.$inferSelect;
export type NewApiKeyExportableSecretModel = typeof apiKeyExportableSecrets.$inferInsert;
