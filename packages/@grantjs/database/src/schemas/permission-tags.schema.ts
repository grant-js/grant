import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  varchar,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

import { permissions } from './permissions.schema';
import { tags } from './tags.schema';

export const permissionTags = pgTable(
  'permission_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    permissionId: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
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
    uniqueIndex('permission_tags_permission_id_tag_id_unique')
      .on(table.permissionId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('permission_tags_deleted_at_idx').on(table.deletedAt),
  ]
);

export const permissionTagsRelations = relations(permissionTags, ({ one }) => ({
  permission: one(permissions, {
    fields: [permissionTags.permissionId],
    references: [permissions.id],
  }),
  tag: one(tags, {
    fields: [permissionTags.tagId],
    references: [tags.id],
  }),
}));

export const permissionTagAuditLogs = pgTable(
  'permission_tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    permissionTagId: uuid('permission_tag_id')
      .references(() => permissionTags.id)
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
    index('permission_tag_audit_logs_permission_tag_id_idx').on(t.permissionTagId),
    index('permission_tag_audit_logs_action_idx').on(t.action),
    index('permission_tag_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type PermissionTagModel = typeof permissionTags.$inferSelect;
export type PermissionTagInsert = typeof permissionTags.$inferInsert;
export type PermissionTagAuditLogModel = typeof permissionTagAuditLogs.$inferSelect;
export type NewPermissionTagAuditLogModel = typeof permissionTagAuditLogs.$inferInsert;
