import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { projectApps } from './project-apps.schema';
import { users } from './users.schema';

export const projectOAuthGrants = pgTable(
  'project_oauth_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectAppId: uuid('project_app_id')
      .references(() => projectApps.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }).notNull(),
    scopeId: varchar('scope_id', { length: 255 }).notNull(),
    scopes: jsonb('scopes').$type<string[]>(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    /** Last rotated-away refresh hash; reuse of this value revokes the family. */
    previousToken: varchar('previous_token', { length: 255 }),
    /** Rotation family; reused refresh secrets revoke every live grant that shares it. */
    familyId: uuid('family_id').notNull().defaultRandom(),
    expiresAt: timestamp('expires_at').notNull(),
    lastUsedAt: timestamp('last_used_at'),
    userAgent: varchar('user_agent', { length: 500 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    index('project_oauth_grants_token_idx').on(t.token),
    index('project_oauth_grants_previous_token_idx').on(t.previousToken),
    index('project_oauth_grants_family_id_idx').on(t.familyId),
    index('project_oauth_grants_project_app_id_idx').on(t.projectAppId),
    index('project_oauth_grants_user_id_idx').on(t.userId),
    index('project_oauth_grants_expires_at_idx').on(t.expiresAt),
    index('project_oauth_grants_deleted_at_idx').on(t.deletedAt),
    index('project_oauth_grants_project_app_user_idx').on(t.projectAppId, t.userId),
    index('project_oauth_grants_scope_tenant_scope_id_idx').on(t.scopeTenant, t.scopeId),
  ]
);

export const projectOAuthGrantsRelations = relations(projectOAuthGrants, ({ one }) => ({
  projectApp: one(projectApps, {
    fields: [projectOAuthGrants.projectAppId],
    references: [projectApps.id],
  }),
  user: one(users, {
    fields: [projectOAuthGrants.userId],
    references: [users.id],
  }),
}));

export const projectOAuthGrantAuditLogs = pgTable(
  'project_oauth_grant_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectOAuthGrantId: uuid('project_oauth_grant_id').references(() => projectOAuthGrants.id, {
      onDelete: 'set null',
    }),
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
    index('project_oauth_grant_audit_logs_grant_id_idx').on(t.projectOAuthGrantId),
    index('project_oauth_grant_audit_logs_action_idx').on(t.action),
    index('project_oauth_grant_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const projectOAuthGrantAuditLogsRelations = relations(
  projectOAuthGrantAuditLogs,
  ({ one }) => ({
    projectOAuthGrant: one(projectOAuthGrants, {
      fields: [projectOAuthGrantAuditLogs.projectOAuthGrantId],
      references: [projectOAuthGrants.id],
    }),
    performedByUser: one(users, {
      fields: [projectOAuthGrantAuditLogs.performedBy],
      references: [users.id],
    }),
  })
);

export type ProjectOAuthGrantModel = typeof projectOAuthGrants.$inferSelect;
export type NewProjectOAuthGrantModel = typeof projectOAuthGrants.$inferInsert;
export type ProjectOAuthGrantAuditLogModel = typeof projectOAuthGrantAuditLogs.$inferSelect;
export type NewProjectOAuthGrantAuditLogModel = typeof projectOAuthGrantAuditLogs.$inferInsert;
