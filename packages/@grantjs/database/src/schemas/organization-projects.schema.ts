import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, varchar, uniqueIndex, index } from 'drizzle-orm/pg-core';

import { organizations } from './organizations.schema';
import { projects } from './projects.schema';

export const organizationProjects = pgTable(
  'organization_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('organization_projects_organization_id_project_id_unique')
      .on(table.organizationId, table.projectId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('organization_projects_deleted_at_idx').on(table.deletedAt),
  ]
);

export const organizationProjectsRelations = relations(organizationProjects, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationProjects.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [organizationProjects.projectId],
    references: [projects.id],
  }),
}));

export const organizationProjectsAuditLogs = pgTable(
  'organization_projects_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationProjectId: uuid('organization_project_id')
      .references(() => organizationProjects.id, { onDelete: 'cascade' })
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
    index('organization_projects_audit_logs_organization_project_id_idx').on(
      t.organizationProjectId
    ),
    index('organization_projects_audit_logs_action_idx').on(t.action),
    index('organization_projects_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type OrganizationProjectModel = typeof organizationProjects.$inferSelect;
export type NewOrganizationProjectModel = typeof organizationProjects.$inferInsert;
export type OrganizationProjectAuditLogModel = typeof organizationProjectsAuditLogs.$inferSelect;
export type NewOrganizationProjectAuditLogModel = typeof organizationProjectsAuditLogs.$inferInsert;
