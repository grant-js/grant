import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { userAuthenticationMethods } from './user-authentication-methods.schema';
import { users } from './users.schema';

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    userAuthenticationMethodId: uuid('user_authentication_method_id')
      .references(() => userAuthenticationMethods.id, { onDelete: 'cascade' })
      .notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    /** Last rotated-away refresh secret; reuse of this value revokes the family. */
    previousToken: varchar('previous_token', { length: 255 }),
    /** Rotation family; reused refresh secrets revoke every live session that shares it. */
    familyId: uuid('family_id').notNull().defaultRandom(),
    audience: varchar('audience', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    emailVerified: boolean('email_verified').default(true).notNull(),
    mfaVerifiedAt: timestamp('mfa_verified_at'),
    lastUsedAt: timestamp('last_used_at'),
    userAgent: varchar('user_agent', { length: 500 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    index('user_sessions_token_idx').on(t.token),
    index('user_sessions_previous_token_idx').on(t.previousToken),
    index('user_sessions_family_id_idx').on(t.familyId),
    index('user_sessions_user_id_idx').on(t.userId),
    index('user_sessions_expires_at_idx').on(t.expiresAt),
    index('user_sessions_user_authentication_method_id_idx').on(t.userAuthenticationMethodId),
    index('user_sessions_deleted_at_idx').on(t.deletedAt),
  ]
);

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  userAuthenticationMethod: one(userAuthenticationMethods, {
    fields: [userSessions.userAuthenticationMethodId],
    references: [userAuthenticationMethods.id],
  }),
}));

export const userSessionAuditLogs = pgTable(
  'user_session_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userSessionId: uuid('user_session_id').references(() => userSessions.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }),
    scopeId: varchar('scope_id', { length: 255 }),
  },
  (t) => [
    index('user_session_audit_logs_user_session_id_idx').on(t.userSessionId),
    index('user_session_audit_logs_action_idx').on(t.action),
    index('user_session_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type UserSessionModel = typeof userSessions.$inferSelect;
export type NewUserSessionModel = typeof userSessions.$inferInsert;
