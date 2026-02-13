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

import { roles } from './roles.schema';
import { tags } from './tags.schema';

export const roleTags = pgTable(
  'role_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
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
    uniqueIndex('role_tags_role_id_tag_id_unique')
      .on(table.roleId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('role_tags_deleted_at_idx').on(table.deletedAt),
  ]
);

export const roleTagsRelations = relations(roleTags, ({ one }) => ({
  role: one(roles, {
    fields: [roleTags.roleId],
    references: [roles.id],
  }),
  tag: one(tags, {
    fields: [roleTags.tagId],
    references: [tags.id],
  }),
}));

export const roleTagAuditLogs = pgTable(
  'role_tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleTagId: uuid('role_tag_id').references(() => roleTags.id, { onDelete: 'set null' }),
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
    index('role_tag_audit_logs_role_tag_id_idx').on(t.roleTagId),
    index('role_tag_audit_logs_action_idx').on(t.action),
    index('role_tag_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type RoleTagModel = typeof roleTags.$inferSelect;
export type RoleTagInsert = typeof roleTags.$inferInsert;
export type RoleTagAuditLogModel = typeof roleTagAuditLogs.$inferSelect;
export type NewRoleTagAuditLogModel = typeof roleTagAuditLogs.$inferInsert;
