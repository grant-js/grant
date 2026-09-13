import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { projectAppTags } from './project-app-tags.schema';
import { projects } from './projects.schema';
import { roles } from './roles.schema';
import { users } from './users.schema';

export const projectApps = pgTable(
  'project_apps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    clientId: varchar('client_id', { length: 255 }).notNull(),
    clientSecretHash: varchar('client_secret_hash', { length: 255 }),
    name: varchar('name', { length: 255 }),
    redirectUris: jsonb('redirect_uris').$type<string[]>().notNull(),
    scopes: jsonb('scopes').$type<string[]>(),
    enabledProviders: jsonb('enabled_providers').$type<string[]>(),
    allowSignUp: boolean('allow_sign_up').default(true).notNull(),
    signUpRoleId: uuid('sign_up_role_id').references(() => roles.id, { onDelete: 'set null' }),
    pictureUrl: varchar('picture_url', { length: 500 }),
    picturePath: varchar('picture_path', { length: 1024 }),
    primaryColor: varchar('primary_color', { length: 7 }),
    showHelpPanel: boolean('show_help_panel'),
    themeMode: varchar('theme_mode', { length: 16 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    uniqueIndex('project_apps_client_id_unique')
      .on(t.clientId)
      .where(sql`${t.deletedAt} IS NULL`),
    index('project_apps_project_id_idx').on(t.projectId),
    index('project_apps_sign_up_role_id_idx').on(t.signUpRoleId),
    index('project_apps_deleted_at_idx').on(t.deletedAt),
  ]
);

export const projectAppsRelations = relations(projectApps, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectApps.projectId],
    references: [projects.id],
  }),
  tags: many(projectAppTags),
}));

export const projectAppAuditLogs = pgTable(
  'project_app_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectAppId: uuid('project_app_id').references(() => projectApps.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }),
    scopeId: varchar('scope_id', { length: 255 }),
  },
  (t) => [
    index('project_app_audit_logs_project_app_id_idx').on(t.projectAppId),
    index('project_app_audit_logs_action_idx').on(t.action),
    index('project_app_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const projectAppAuditLogsRelations = relations(projectAppAuditLogs, ({ one }) => ({
  projectApp: one(projectApps, {
    fields: [projectAppAuditLogs.projectAppId],
    references: [projectApps.id],
  }),
  performedByUser: one(users, {
    fields: [projectAppAuditLogs.performedBy],
    references: [users.id],
  }),
}));

export type ProjectAppModel = typeof projectApps.$inferSelect;
export type NewProjectAppModel = typeof projectApps.$inferInsert;
export type ProjectAppAuditLogModel = typeof projectAppAuditLogs.$inferSelect;
export type NewProjectAppAuditLogModel = typeof projectAppAuditLogs.$inferInsert;
