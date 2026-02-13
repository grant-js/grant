import { relations, sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { resources } from './resources.schema';

export const projectResources = pgTable(
  'project_resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    resourceId: uuid('resource_id')
      .references(() => resources.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_resources_project_id_resource_id_unique')
      .on(table.projectId, table.resourceId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('project_resources_deleted_at_idx').on(table.deletedAt),
  ]
);

export const projectResourcesRelations = relations(projectResources, ({ one }) => ({
  project: one(projects, {
    fields: [projectResources.projectId],
    references: [projects.id],
  }),
  resource: one(resources, {
    fields: [projectResources.resourceId],
    references: [resources.id],
  }),
}));

export const projectResourceAuditLogs = pgTable(
  'project_resource_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectResourceId: uuid('project_resource_id').references(() => projectResources.id, {
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
    index('project_resource_audit_logs_project_resource_id_idx').on(t.projectResourceId),
    index('project_resource_audit_logs_action_idx').on(t.action),
    index('project_resource_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const projectResourceAuditLogsRelations = relations(projectResourceAuditLogs, ({ one }) => ({
  projectResource: one(projectResources, {
    fields: [projectResourceAuditLogs.projectResourceId],
    references: [projectResources.id],
  }),
}));

export type ProjectResourceModel = typeof projectResources.$inferSelect;
export type ProjectResourceInsert = typeof projectResources.$inferInsert;
export type ProjectResourceAuditLogModel = typeof projectResourceAuditLogs.$inferSelect;
export type NewProjectResourceAuditLogModel = typeof projectResourceAuditLogs.$inferInsert;
