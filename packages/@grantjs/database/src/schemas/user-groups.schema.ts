import { relations, sql } from 'drizzle-orm';
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { groups } from './groups.schema';
import { users } from './users.schema';

export const userGroups = pgTable(
  'user_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    groupId: uuid('group_id')
      .references(() => groups.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('user_groups_user_id_group_id_unique')
      .on(table.userId, table.groupId)
      .where(sql`${table.deletedAt} IS NULL`),
    index('user_groups_deleted_at_idx').on(table.deletedAt),
  ]
);

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
}));

export const userGroupsAuditLogs = pgTable(
  'user_groups_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userGroupId: uuid('user_group_id').references(() => userGroups.id, { onDelete: 'set null' }),
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
    index('user_groups_audit_logs_user_group_id_idx').on(t.userGroupId),
    index('user_groups_audit_logs_action_idx').on(t.action),
    index('user_groups_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type UserGroupModel = typeof userGroups.$inferSelect;
export type NewUserGroupModel = typeof userGroups.$inferInsert;
export type UserGroupAuditLogModel = typeof userGroupsAuditLogs.$inferSelect;
export type NewUserGroupAuditLogModel = typeof userGroupsAuditLogs.$inferInsert;
