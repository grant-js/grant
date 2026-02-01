import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    pictureUrl: varchar('picture_url', { length: 500 }),
    metadata: jsonb('metadata').default({}).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('users_deleted_at_idx').on(t.deletedAt),
    index('users_metadata_idx').using('gin', t.metadata),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  tags: many(userTags),
  roles: many(userRoles),
  authenticationMethods: many(userAuthenticationMethods),
  sessions: many(userSessions),
  accounts: many(accounts),
}));

export const userAuditLogs = pgTable(
  'user_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
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
    index('user_audit_logs_user_id_idx').on(t.userId),
    index('user_audit_logs_action_idx').on(t.action),
    index('user_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type UserModel = typeof users.$inferSelect;
export type NewUserModel = typeof users.$inferInsert;
export type UserAuditLogModel = typeof userAuditLogs.$inferSelect;
export type NewUserAuditLogModel = typeof userAuditLogs.$inferInsert;

import { accounts } from './accounts.schema';
import { userAuthenticationMethods } from './user-authentication-methods.schema';
import { userRoles } from './user-roles.schema';
import { userSessions } from './user-sessions.schema';
import { userTags } from './user-tags.schema';
