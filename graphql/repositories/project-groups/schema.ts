import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, uniqueIndex, varchar, index } from 'drizzle-orm/pg-core';

import { groups } from '../groups/schema';
import { projects } from '../projects/schema';

export const projectGroups = pgTable(
  'project_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    groupId: uuid('group_id')
      .references(() => groups.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_groups_project_id_group_id_unique')
      .on(table.projectId, table.groupId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('project_groups_deleted_at_idx').on(table.deletedAt),
  ]
);

export const projectGroupsRelations = relations(projectGroups, ({ one }) => ({
  project: one(projects, {
    fields: [projectGroups.projectId],
    references: [projects.id],
  }),
  group: one(groups, {
    fields: [projectGroups.groupId],
    references: [groups.id],
  }),
}));

export const projectGroupAuditLogs = pgTable(
  'project_group_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectGroupId: uuid('project_group_id')
      .references(() => projectGroups.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('project_group_audit_logs_project_group_id_idx').on(t.projectGroupId),
    index('project_group_audit_logs_action_idx').on(t.action),
  ]
);

export type ProjectGroupModel = typeof projectGroups.$inferSelect;
export type ProjectGroupInsert = typeof projectGroups.$inferInsert;
export type ProjectGroupAuditLogModel = typeof projectGroupAuditLogs.$inferSelect;
export type NewProjectGroupAuditLogModel = typeof projectGroupAuditLogs.$inferInsert;

export const ProjectGroupAuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SOFT_DELETE: 'SOFT_DELETE',
} as const;

export type ProjectGroupAuditActionType =
  (typeof ProjectGroupAuditAction)[keyof typeof ProjectGroupAuditAction];
