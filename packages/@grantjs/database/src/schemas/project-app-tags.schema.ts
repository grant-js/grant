import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { projectApps } from './project-apps.schema';
import { tags } from './tags.schema';

export const projectAppTags = pgTable(
  'project_app_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectAppId: uuid('project_app_id')
      .references(() => projectApps.id, { onDelete: 'cascade' })
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
    uniqueIndex('project_app_tags_project_app_id_tag_id_unique')
      .on(table.projectAppId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('project_app_tags_deleted_at_idx').on(table.deletedAt),
  ]
);

export const projectAppTagsRelations = relations(projectAppTags, ({ one }) => ({
  projectApp: one(projectApps, {
    fields: [projectAppTags.projectAppId],
    references: [projectApps.id],
  }),
  tag: one(tags, {
    fields: [projectAppTags.tagId],
    references: [tags.id],
  }),
}));

export const projectAppTagAuditLogs = pgTable(
  'project_app_tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectAppTagId: uuid('project_app_tag_id').references(() => projectAppTags.id, {
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
    index('project_app_tag_audit_logs_project_app_tag_id_idx').on(t.projectAppTagId),
    index('project_app_tag_audit_logs_action_idx').on(t.action),
    index('project_app_tag_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type ProjectAppTagModel = typeof projectAppTags.$inferSelect;
export type ProjectAppTagInsert = typeof projectAppTags.$inferInsert;
export type ProjectAppTagAuditLogModel = typeof projectAppTagAuditLogs.$inferSelect;
export type NewProjectAppTagAuditLogModel = typeof projectAppTagAuditLogs.$inferInsert;
