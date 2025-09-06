import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  varchar,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

import { projects } from '../projects/schema';
import { tags } from '../tags/schema';

export const projectTags = pgTable(
  'project_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    tagId: uuid('tag_id')
      .references(() => tags.id, { onDelete: 'cascade' })
      .notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_tags_project_id_tag_id_unique')
      .on(table.projectId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('project_tags_deleted_at_idx').on(table.deletedAt),
  ]
);

export const projectTagsRelations = relations(projectTags, ({ one }) => ({
  project: one(projects, {
    fields: [projectTags.projectId],
    references: [projects.id],
  }),
  tag: one(tags, {
    fields: [projectTags.tagId],
    references: [tags.id],
  }),
}));

export const projectTagAuditLogs = pgTable(
  'project_tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectTagId: uuid('project_tag_id')
      .references(() => projectTags.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('project_tag_audit_logs_project_tag_id_idx').on(t.projectTagId),
    index('project_tag_audit_logs_action_idx').on(t.action),
  ]
);

export type ProjectTagModel = typeof projectTags.$inferSelect;
export type ProjectTagInsert = typeof projectTags.$inferInsert;
export type ProjectTagAuditLogModel = typeof projectTagAuditLogs.$inferSelect;
export type NewProjectTagAuditLogModel = typeof projectTagAuditLogs.$inferInsert;

export const ProjectTagAuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SOFT_DELETE: 'SOFT_DELETE',
} as const;

export type ProjectTagAuditActionType =
  (typeof ProjectTagAuditAction)[keyof typeof ProjectTagAuditAction];
