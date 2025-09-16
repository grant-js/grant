import { relations } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

import { userAuthenticationMethods } from '../user-authentication-methods/schema';
import { users } from '../users/schema';

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    authMethodId: uuid('auth_method_id')
      .references(() => userAuthenticationMethods.id, { onDelete: 'cascade' })
      .notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    scope: varchar('scope', { length: 50 }).notNull(), // 'account', 'organization', 'project'
    scopeId: uuid('scope_id').notNull(), // ID of the account/organization/project
    expiresAt: timestamp('expires_at').notNull(),
    lastUsedAt: timestamp('last_used_at'),
    userAgent: varchar('user_agent', { length: 500 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    index('user_sessions_token_idx').on(t.token),
    index('user_sessions_user_id_idx').on(t.userId),
    index('user_sessions_scope_scope_id_idx').on(t.scope, t.scopeId),
    index('user_sessions_expires_at_idx').on(t.expiresAt),
    index('user_sessions_auth_method_id_idx').on(t.authMethodId),
    index('user_sessions_deleted_at_idx').on(t.deletedAt),
  ]
);

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  authMethod: one(userAuthenticationMethods, {
    fields: [userSessions.authMethodId],
    references: [userAuthenticationMethods.id],
  }),
}));

export type UserSessionModel = typeof userSessions.$inferSelect;
export type NewUserSessionModel = typeof userSessions.$inferInsert;

export const SessionScope = {
  ACCOUNT: 'account',
  ORGANIZATION: 'organization',
  PROJECT: 'project',
} as const;

export type SessionScopeType = (typeof SessionScope)[keyof typeof SessionScope];
