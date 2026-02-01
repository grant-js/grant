import { relations } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('projects_deleted_at_idx').on(t.deletedAt)]
);

export const projectAuditLogs = pgTable(
  'project_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id)
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
    index('project_audit_logs_project_id_idx').on(t.projectId),
    index('project_audit_logs_action_idx').on(t.action),
    index('project_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const projectsRelations = relations(projects, ({ many }) => ({
  auditLogs: many(projectAuditLogs),
  tags: many(projectTags),
  organizationTags: many(organizationProjectTags),
  accountTags: many(accountProjectTags),
  users: many(projectUsers),
  roles: many(projectRoles),
  groups: many(projectGroups),
  permissions: many(projectPermissions),
  accounts: many(accountProjects),
  resources: many(projectResources),
}));

export const projectAuditLogsRelations = relations(projectAuditLogs, ({ one }) => ({
  project: one(projects, {
    fields: [projectAuditLogs.projectId],
    references: [projects.id],
  }),
}));

export type ProjectModel = typeof projects.$inferSelect;
export type NewProjectModel = typeof projects.$inferInsert;
export type ProjectAuditLogModel = typeof projectAuditLogs.$inferSelect;
export type NewProjectAuditLogModel = typeof projectAuditLogs.$inferInsert;

import { accountProjectTags } from './account-project-tags.schema';
import { accountProjects } from './account-projects.schema';
import { organizationProjectTags } from './organization-project-tags.schema';
import { projectGroups } from './project-groups.schema';
import { projectPermissions } from './project-permissions.schema';
import { projectResources } from './project-resources.schema';
import { projectRoles } from './project-roles.schema';
import { projectTags } from './project-tags.schema';
import { projectUsers } from './project-users.schema';
