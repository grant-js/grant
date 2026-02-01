import { DEFAULT_RESOURCE_ACTIONS } from '@grantjs/constants';
import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { projectResources } from './project-resources.schema';
import { resourceTags } from './resource-tags.schema';
import { users } from './users.schema';

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    actions: text('actions')
      .array()
      .default([...DEFAULT_RESOURCE_ACTIONS])
      .notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    index('resources_slug_idx').on(t.slug),
    index('resources_deleted_at_idx').on(t.deletedAt),
    index('resources_is_active_idx').on(t.isActive),
  ]
);

export const resourcesRelations = relations(resources, ({ many }) => ({
  auditLogs: many(resourceAuditLogs),
  projects: many(projectResources),
  tags: many(resourceTags),
}));

export const resourceAuditLogs = pgTable(
  'resource_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceId: uuid('resource_id')
      .references(() => resources.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }),
    scopeId: varchar('scope_id', { length: 255 }),
  },
  (t) => [
    index('resource_audit_logs_resource_id_idx').on(t.resourceId),
    index('resource_audit_logs_action_idx').on(t.action),
    index('resource_audit_logs_performed_by_idx').on(t.performedBy),
    index('resource_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const resourceAuditLogsRelations = relations(resourceAuditLogs, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceAuditLogs.resourceId],
    references: [resources.id],
  }),
  performer: one(users, {
    fields: [resourceAuditLogs.performedBy],
    references: [users.id],
  }),
}));

export type ResourceModel = typeof resources.$inferSelect;
export type NewResourceModel = typeof resources.$inferInsert;
export type ResourceAuditLogModel = typeof resourceAuditLogs.$inferSelect;
export type NewResourceAuditLogModel = typeof resourceAuditLogs.$inferInsert;
