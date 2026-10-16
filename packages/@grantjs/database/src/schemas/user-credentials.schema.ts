import { CREDENTIAL_SOURCES } from '@grantjs/core';
import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * Platform-scope password credential (ADR 0011 § 2): `(user, hash, source)` for the Grant
 * console. A core table like `users` and `user_authentication_methods`, so it has no RLS:
 * it is reached through the user, never through a tenant pivot. Project credentials live
 * in `project_user_credentials`, a separate table, so a platform query cannot name a
 * project row. There is no email column: the caller resolves an identifier to a user id.
 */
export const userCredentials = pgTable(
  'user_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
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
    uniqueIndex('user_credentials_user_id_unique')
      .on(t.userId)
      .where(sql`${t.deletedAt} IS NULL`),
    index('user_credentials_user_id_idx').on(t.userId),
    index('user_credentials_deleted_at_idx').on(t.deletedAt),
    check(
      'user_credentials_source_check',
      sql.raw(`("source" IN (${CREDENTIAL_SOURCES.map((s) => `'${s}'`).join(', ')}))`)
    ),
  ]
);

export const userCredentialsRelations = relations(userCredentials, ({ one }) => ({
  user: one(users, {
    fields: [userCredentials.userId],
    references: [users.id],
  }),
}));

/** Audit log of credential changes. Records source, scope and user, never the hash. */
export const userCredentialAuditLogs = pgTable(
  'user_credential_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userCredentialId: uuid('user_credential_id').references(() => userCredentials.id, {
      onDelete: 'set null',
    }),
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
    index('user_credential_audit_logs_user_credential_id_idx').on(t.userCredentialId),
    index('user_credential_audit_logs_action_idx').on(t.action),
    index('user_credential_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const userCredentialAuditLogsRelations = relations(userCredentialAuditLogs, ({ one }) => ({
  userCredential: one(userCredentials, {
    fields: [userCredentialAuditLogs.userCredentialId],
    references: [userCredentials.id],
  }),
  performedByUser: one(users, {
    fields: [userCredentialAuditLogs.performedBy],
    references: [users.id],
  }),
}));

/**
 * Failed-attempt counter per platform user. Keyed by the resolved user, independent of
 * whether a credential exists, so a guesser cannot tell the two apart. Ephemeral state:
 * deleted on a successful sign-in, with the user (cascade) and on erasure.
 */
export const userCredentialLockouts = pgTable('user_credential_lockouts', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  failedAttempts: integer('failed_attempts').default(0).notNull(),
  windowStartedAt: timestamp('window_started_at').notNull(),
  lockedUntil: timestamp('locked_until'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserCredentialModel = typeof userCredentials.$inferSelect;
export type NewUserCredentialModel = typeof userCredentials.$inferInsert;
export type UserCredentialAuditLogModel = typeof userCredentialAuditLogs.$inferSelect;
export type NewUserCredentialAuditLogModel = typeof userCredentialAuditLogs.$inferInsert;
export type UserCredentialLockoutModel = typeof userCredentialLockouts.$inferSelect;
export type NewUserCredentialLockoutModel = typeof userCredentialLockouts.$inferInsert;
