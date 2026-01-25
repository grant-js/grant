import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, varchar, uniqueIndex, index } from 'drizzle-orm/pg-core';

import { groups } from './groups.schema';
import { roles } from './roles.schema';

export const roleGroups = pgTable(
  'role_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    groupId: uuid('group_id')
      .references(() => groups.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('role_groups_role_id_group_id_unique')
      .on(table.roleId, table.groupId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('role_groups_deleted_at_idx').on(table.deletedAt),
  ]
);

export const roleGroupsRelations = relations(roleGroups, ({ one }) => ({
  role: one(roles, {
    fields: [roleGroups.roleId],
    references: [roles.id],
  }),
  group: one(groups, {
    fields: [roleGroups.groupId],
    references: [groups.id],
  }),
}));

export const roleGroupsAuditLogs = pgTable(
  'role_groups_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleGroupId: uuid('role_group_id')
      .references(() => roleGroups.id, { onDelete: 'cascade' })
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('role_groups_audit_logs_role_group_id_idx').on(t.roleGroupId),
    index('role_groups_audit_logs_action_idx').on(t.action),
  ]
);

export type RoleGroupModel = typeof roleGroups.$inferSelect;
export type NewRoleGroupModel = typeof roleGroups.$inferInsert;
export type RoleGroupAuditLogModel = typeof roleGroupsAuditLogs.$inferSelect;
export type NewRoleGroupAuditLogModel = typeof roleGroupsAuditLogs.$inferInsert;
