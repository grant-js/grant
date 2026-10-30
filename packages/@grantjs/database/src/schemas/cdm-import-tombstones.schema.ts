import { relations, sql } from 'drizzle-orm';
import { pgPolicy, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';

/**
 * Deletion tombstones of CDM imports: one row per `(project, kind, import key)` whose
 * identity the person deleted themselves, so a later import of the project does not create
 * it again. Not to be confused with the soft-delete a replace import applies to CDM-managed
 * rows (`apps/api/src/lib/cdm/README.md`): that one is a `deleted_at`, this one is a table.
 *
 * - **No key in clear.** For an e-mail keyed identity the import key is an address, so the
 *   table stores `external_key_fingerprint`, an HMAC-SHA256 of `kind` and the key under the
 *   CDM fingerprint secret, and nothing else about the person: no user id, no name, no copy
 *   of the record. A row cannot be read back to a key; the import checks the keys of its own
 *   document against it.
 * - **Blocks creation only.** The import skips creating an identity for a tombstoned key; a
 *   document user that resolves to a live identity is never blocked.
 * - **Never removed by Grant.** No expiry and no mutation; an operator lifts one by deleting
 *   the row. Rows go with their project (`on delete cascade`).
 *
 * Carries `project_id` and the project policy its sibling pivots carry.
 */
export const cdmImportTombstones = pgTable(
  'cdm_import_tombstones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    /** The import marker's `kind`; `'user'` today. */
    kind: varchar('kind', { length: 50 }).notNull(),
    /** HMAC-SHA256 hex of `kind` and the import key (64 characters). Never the key. */
    externalKeyFingerprint: varchar('external_key_fingerprint', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('cdm_import_tombstones_project_kind_fingerprint_unique').on(
      t.projectId,
      t.kind,
      t.externalKeyFingerprint
    ),
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

export const cdmImportTombstonesRelations = relations(cdmImportTombstones, ({ one }) => ({
  project: one(projects, {
    fields: [cdmImportTombstones.projectId],
    references: [projects.id],
  }),
}));

export type CdmImportTombstoneModel = typeof cdmImportTombstones.$inferSelect;
export type NewCdmImportTombstoneModel = typeof cdmImportTombstones.$inferInsert;
