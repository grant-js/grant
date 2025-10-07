import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

import { accounts } from '../accounts/schema';
import { projects } from '../projects/schema';

export const accountProjects = pgTable(
  'account_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('account_projects_account_id_project_id_unique')
      .on(table.accountId, table.projectId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('account_projects_deleted_at_idx').on(table.deletedAt),
  ]
);

export const accountProjectsRelations = relations(accountProjects, ({ one }) => ({
  account: one(accounts, {
    fields: [accountProjects.accountId],
    references: [accounts.id],
  }),
  project: one(projects, {
    fields: [accountProjects.projectId],
    references: [projects.id],
  }),
}));

export const accountProjectsAuditLogs = pgTable(
  'account_project_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountProjectId: uuid('account_project_id')
      .references(() => accountProjects.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('account_project_audit_logs_account_project_id_idx').on(t.accountProjectId),
    index('account_project_audit_logs_action_idx').on(t.action),
  ]
);

export type AccountProjectModel = typeof accountProjects.$inferSelect;
export type NewAccountProjectModel = typeof accountProjects.$inferInsert;
export type AccountProjectAuditLogModel = typeof accountProjectsAuditLogs.$inferSelect;
export type NewAccountProjectAuditLogModel = typeof accountProjectsAuditLogs.$inferInsert;

export const AccountProjectAuditAction = {
  CREATE: 'CREATE',
  DELETE: 'DELETE',
} as const;

export type AccountProjectAuditActionType =
  (typeof AccountProjectAuditAction)[keyof typeof AccountProjectAuditAction];
