import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgPolicy,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { userAuthenticationMethods } from './user-authentication-methods.schema';
import { users } from './users.schema';

/**
 * Project-app password reset (ADR 0011 § 6): one row per `(project, user)` holding the
 * SHA-256 digest of the live reset token and the request counter of the per-address limit.
 *
 * - **Hash only.** `token_hash` is a digest of a 256-bit random token; the token itself is
 *   in the email and nowhere else. It is looked up by digest (unique index).
 * - **One live token per member.** A new request replaces the digest, which kills the
 *   previous link; consuming a token sets `token_hash` to NULL (single use) and keeps the
 *   row, so the request counter survives it.
 * - **The per-address limit lives here.** `request_count` and `window_started_at` are
 *   updated in the same atomic upsert that stores the digest, keyed by the resolved user
 *   (the address is never stored), like the credential lockout it is modelled on.
 *
 * Carries `project_id` and the project policy its sibling pivots carry.
 */
export const projectPasswordResets = pgTable(
  'project_password_resets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    /** The Email method that received the link: completing the reset proves that mailbox. */
    authMethodId: uuid('auth_method_id')
      .references(() => userAuthenticationMethods.id, { onDelete: 'cascade' })
      .notNull(),
    /** SHA-256 hex of the live token, or NULL once it has been used. */
    tokenHash: varchar('token_hash', { length: 64 }),
    expiresAt: timestamp('expires_at').notNull(),
    requestCount: integer('request_count').default(1).notNull(),
    windowStartedAt: timestamp('window_started_at').notNull(),
    consumedAt: timestamp('consumed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('project_password_resets_project_id_user_id_unique').on(t.projectId, t.userId),
    uniqueIndex('project_password_resets_token_hash_unique').on(t.tokenHash),
    index('project_password_resets_user_id_idx').on(t.userId),
    index('project_password_resets_auth_method_id_idx').on(t.authMethodId),
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

export const projectPasswordResetsRelations = relations(projectPasswordResets, ({ one }) => ({
  project: one(projects, {
    fields: [projectPasswordResets.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectPasswordResets.userId],
    references: [users.id],
  }),
  authMethod: one(userAuthenticationMethods, {
    fields: [projectPasswordResets.authMethodId],
    references: [userAuthenticationMethods.id],
  }),
}));

export type ProjectPasswordResetModel = typeof projectPasswordResets.$inferSelect;
export type NewProjectPasswordResetModel = typeof projectPasswordResets.$inferInsert;
