import { relations, sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { users } from './users.schema';

export const projectOAuthConnections = pgTable(
  'project_oauth_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    clientId: varchar('client_id', { length: 255 }).notNull(),
    encryptedSecret: varchar('encrypted_secret', { length: 4000 }).notNull(),
    secretIv: varchar('secret_iv', { length: 255 }).notNull(),
    secretTag: varchar('secret_tag', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    uniqueIndex('project_oauth_connections_project_id_provider_unique')
      .on(t.projectId, t.provider)
      .where(sql`${t.deletedAt} IS NULL`),
    index('project_oauth_connections_project_id_idx').on(t.projectId),
    index('project_oauth_connections_deleted_at_idx').on(t.deletedAt),
  ]
);

export const projectOAuthConnectionsRelations = relations(projectOAuthConnections, ({ one }) => ({
  project: one(projects, {
    fields: [projectOAuthConnections.projectId],
    references: [projects.id],
  }),
}));

export const projectOAuthConnectionAuditLogs = pgTable(
  'project_oauth_connection_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectOAuthConnectionId: uuid('project_oauth_connection_id').references(
      () => projectOAuthConnections.id,
      { onDelete: 'set null' }
    ),
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
    index('project_oauth_connection_audit_logs_connection_id_idx').on(t.projectOAuthConnectionId),
    index('project_oauth_connection_audit_logs_action_idx').on(t.action),
    index('project_oauth_connection_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const projectOAuthConnectionAuditLogsRelations = relations(
  projectOAuthConnectionAuditLogs,
  ({ one }) => ({
    projectOAuthConnection: one(projectOAuthConnections, {
      fields: [projectOAuthConnectionAuditLogs.projectOAuthConnectionId],
      references: [projectOAuthConnections.id],
    }),
    performedByUser: one(users, {
      fields: [projectOAuthConnectionAuditLogs.performedBy],
      references: [users.id],
    }),
  })
);

export type ProjectOAuthConnectionModel = typeof projectOAuthConnections.$inferSelect;
export type NewProjectOAuthConnectionModel = typeof projectOAuthConnections.$inferInsert;
export type ProjectOAuthConnectionAuditLogModel =
  typeof projectOAuthConnectionAuditLogs.$inferSelect;
export type NewProjectOAuthConnectionAuditLogModel =
  typeof projectOAuthConnectionAuditLogs.$inferInsert;
