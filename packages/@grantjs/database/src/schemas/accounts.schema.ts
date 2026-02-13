import { relations } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { accountProjects } from './account-projects.schema';
import { users } from './users.schema';

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 20 }).default('personal').notNull(), // 'personal' | 'organization'
    ownerId: uuid('owner_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(), // The user who owns this account
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('accounts_owner_id_idx').on(t.ownerId),
    index('accounts_type_idx').on(t.type),
    index('accounts_deleted_at_idx').on(t.deletedAt),
  ]
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  owner: one(users, {
    fields: [accounts.ownerId],
    references: [users.id],
  }),
  projects: many(accountProjects),
}));

export const accountAuditLogs = pgTable(
  'account_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
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
    index('account_audit_logs_account_id_idx').on(t.accountId),
    index('account_audit_logs_action_idx').on(t.action),
    index('account_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type AccountModel = typeof accounts.$inferSelect;
export type NewAccountModel = typeof accounts.$inferInsert;
export type AccountAuditLogModel = typeof accountAuditLogs.$inferSelect;
export type NewAccountAuditLogModel = typeof accountAuditLogs.$inferInsert;
