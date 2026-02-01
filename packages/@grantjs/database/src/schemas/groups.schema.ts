import { relations } from 'drizzle-orm';
import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    metadata: jsonb('metadata').default({}).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('groups_deleted_at_idx').on(t.deletedAt),
    index('groups_metadata_idx').using('gin', t.metadata),
  ]
);

export const groupsRelations = relations(groups, ({ many }) => ({
  auditLogs: many(groupAuditLogs),
  tags: many(groupTags),
  permissions: many(groupPermissions),
}));

export const groupAuditLogs = pgTable(
  'group_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .references(() => groups.id)
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
    index('group_audit_logs_group_id_idx').on(t.groupId),
    index('group_audit_logs_action_idx').on(t.action),
    index('group_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type GroupModel = typeof groups.$inferSelect;
export type NewGroupModel = typeof groups.$inferInsert;
export type GroupAuditLogModel = typeof groupAuditLogs.$inferSelect;
export type NewGroupAuditLogModel = typeof groupAuditLogs.$inferInsert;

import { groupPermissions } from './group-permissions.schema';
import { groupTags } from './group-tags.schema';
