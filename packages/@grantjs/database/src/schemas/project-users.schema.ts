import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, varchar, uniqueIndex, index } from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { users } from './users.schema';

export const projectUsers = pgTable(
  'project_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_users_project_id_user_id_unique')
      .on(table.projectId, table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('project_users_deleted_at_idx').on(table.deletedAt),
  ]
);

export const projectUsersRelations = relations(projectUsers, ({ one }) => ({
  project: one(projects, {
    fields: [projectUsers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUsers.userId],
    references: [users.id],
  }),
}));

export const projectUserAuditLogs = pgTable(
  'project_user_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectUserId: uuid('project_user_id')
      .references(() => projectUsers.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('project_user_audit_logs_project_user_id_idx').on(t.projectUserId),
    index('project_user_audit_logs_action_idx').on(t.action),
  ]
);

export type ProjectUserModel = typeof projectUsers.$inferSelect;
export type NewProjectUserModel = typeof projectUsers.$inferInsert;
export type ProjectUserAuditLogModel = typeof projectUserAuditLogs.$inferSelect;
export type NewProjectUserAuditLogModel = typeof projectUserAuditLogs.$inferInsert;
