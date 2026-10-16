import { CREDENTIAL_SOURCES } from '@grantjs/core';
import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { users } from './users.schema';

/**
 * Project-scope password credential (ADR 0011 § 2): `(project, user, hash, source)` for
 * that project's apps. Shaped like `project_user_api_keys` and `project_user_groups`:
 * `project_id` and `user_id` columns, not a foreign key to `project_users.id`, which is
 * replaced when a member is re-added. The project policy is the one its sibling pivots
 * carry. Platform credentials live in `user_credentials`, a separate table.
 */
export const projectUserCredentials = pgTable(
  'project_user_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    /** bcrypt hash (`$2a$`/`$2b$`/`$2y$`). Never in audit values, events, exports or logs. */
    hash: varchar('hash', { length: 255 }).notNull(),
    source: varchar('source', { length: 30 }).notNull(),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    uniqueIndex('project_user_credentials_project_id_user_id_unique')
      .on(t.projectId, t.userId)
      .where(sql`${t.deletedAt} IS NULL`),
    index('project_user_credentials_project_id_idx').on(t.projectId),
    index('project_user_credentials_user_id_idx').on(t.userId),
    index('project_user_credentials_deleted_at_idx').on(t.deletedAt),
    check(
      'project_user_credentials_source_check',
      sql.raw(`("source" IN (${CREDENTIAL_SOURCES.map((s) => `'${s}'`).join(', ')}))`)
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

export const projectUserCredentialsRelations = relations(projectUserCredentials, ({ one }) => ({
  project: one(projects, {
    fields: [projectUserCredentials.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUserCredentials.userId],
    references: [users.id],
    relationName: 'projectUserCredentialUser',
  }),
}));

/** Audit log of project credential changes. Records source, scope and user, never the hash. */
export const projectUserCredentialAuditLogs = pgTable(
  'project_user_credential_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectUserCredentialId: uuid('project_user_credential_id').references(
      () => projectUserCredentials.id,
      { onDelete: 'set null' }
    ),
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
    index('project_user_credential_audit_logs_credential_id_idx').on(t.projectUserCredentialId),
    index('project_user_credential_audit_logs_action_idx').on(t.action),
    index('project_user_credential_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const projectUserCredentialAuditLogsRelations = relations(
  projectUserCredentialAuditLogs,
  ({ one }) => ({
    projectUserCredential: one(projectUserCredentials, {
      fields: [projectUserCredentialAuditLogs.projectUserCredentialId],
      references: [projectUserCredentials.id],
    }),
    performedByUser: one(users, {
      fields: [projectUserCredentialAuditLogs.performedBy],
      references: [users.id],
    }),
  })
);

/**
 * Failed-attempt counter per `(project, user)`. Keyed by the resolved user, independent of
 * whether a credential exists. Ephemeral state: deleted on a successful sign-in, with the
 * project or user (cascade) and on erasure. The project policy is the credential table's.
 */
export const projectUserCredentialLockouts = pgTable(
  'project_user_credential_lockouts',
  {
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    failedAttempts: integer('failed_attempts').default(0).notNull(),
    windowStartedAt: timestamp('window_started_at').notNull(),
    lockedUntil: timestamp('locked_until'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    primaryKey({
      name: 'project_user_credential_lockouts_pk',
      columns: [t.projectId, t.userId],
    }),
    index('project_user_credential_lockouts_user_id_idx').on(t.userId),
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

export type ProjectUserCredentialModel = typeof projectUserCredentials.$inferSelect;
export type NewProjectUserCredentialModel = typeof projectUserCredentials.$inferInsert;
export type ProjectUserCredentialAuditLogModel = typeof projectUserCredentialAuditLogs.$inferSelect;
export type NewProjectUserCredentialAuditLogModel =
  typeof projectUserCredentialAuditLogs.$inferInsert;
export type ProjectUserCredentialLockoutModel = typeof projectUserCredentialLockouts.$inferSelect;
export type NewProjectUserCredentialLockoutModel =
  typeof projectUserCredentialLockouts.$inferInsert;
