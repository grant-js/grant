import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, uniqueIndex, varchar, index } from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { roles } from './roles.schema';

export const projectRoles = pgTable(
  'project_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('project_roles_project_id_role_id_unique')
      .on(table.projectId, table.roleId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const projectRolesRelations = relations(projectRoles, ({ one }) => ({
  project: one(projects, {
    fields: [projectRoles.projectId],
    references: [projects.id],
  }),
  role: one(roles, {
    fields: [projectRoles.roleId],
    references: [roles.id],
  }),
}));

export const projectRoleAuditLogs = pgTable(
  'project_role_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectRoleId: uuid('project_role_id').references(() => projectRoles.id, {
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
    index('project_role_audit_logs_project_role_id_idx').on(t.projectRoleId),
    index('project_role_audit_logs_action_idx').on(t.action),
    index('project_role_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type ProjectRoleModel = typeof projectRoles.$inferSelect;
export type ProjectRoleInsert = typeof projectRoles.$inferInsert;
export type ProjectRoleAuditLogModel = typeof projectRoleAuditLogs.$inferSelect;
export type NewProjectRoleAuditLogModel = typeof projectRoleAuditLogs.$inferInsert;
