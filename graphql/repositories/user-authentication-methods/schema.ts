import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';

import { users } from '../users/schema';

export const userAuthenticationMethods = pgTable(
  'user_authentication_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    provider: varchar('provider', { length: 50 }).notNull(), // 'email', 'google', 'github'
    providerId: varchar('provider_id', { length: 255 }).notNull(), // email address or OAuth provider ID
    providerData: jsonb('provider_data'), // JSON: additional provider data (now properly typed!)
    isVerified: boolean('is_verified').default(false).notNull(),
    verifiedAt: timestamp('verified_at'),
    isPrimary: boolean('is_primary').default(false).notNull(), // One primary method per user
    lastUsedAt: timestamp('last_used_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('user_auth_methods_provider_provider_id_unique')
      .on(t.provider, t.providerId)
      .where(sql`${t.deletedAt} IS NULL`),
    index('user_auth_methods_user_id_idx').on(t.userId),
    index('user_auth_methods_provider_idx').on(t.provider),
    index('user_auth_methods_deleted_at_idx').on(t.deletedAt),
    // Add GIN index for efficient JSON queries
    index('user_auth_methods_provider_data_idx').using('gin', t.providerData),
  ]
);

export const userAuthenticationMethodsRelations = relations(
  userAuthenticationMethods,
  ({ one }) => ({
    user: one(users, {
      fields: [userAuthenticationMethods.userId],
      references: [users.id],
    }),
  })
);

export const userAuthenticationMethodsAuditLogs = pgTable(
  'user_authentication_method_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userAuthenticationMethodId: uuid('user_authentication_method_id')
      .references(() => userAuthenticationMethods.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('user_auth_method_audit_logs_user_auth_method_id_idx').on(t.userAuthenticationMethodId),
    index('user_auth_method_audit_logs_action_idx').on(t.action),
  ]
);

export type UserAuthenticationMethodModel = typeof userAuthenticationMethods.$inferSelect;
export type NewUserAuthenticationMethodModel = typeof userAuthenticationMethods.$inferInsert;
export type UserAuthenticationMethodAuditLogModel =
  typeof userAuthenticationMethodsAuditLogs.$inferSelect;
export type NewUserAuthenticationMethodAuditLogModel =
  typeof userAuthenticationMethodsAuditLogs.$inferInsert;
