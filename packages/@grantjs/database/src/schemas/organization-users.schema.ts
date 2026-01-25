import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, varchar, uniqueIndex, index } from 'drizzle-orm/pg-core';

import { organizations } from './organizations.schema';
import { users } from './users.schema';

export const organizationUsers = pgTable(
  'organization_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('organization_users_organization_id_user_id_unique')
      .on(table.organizationId, table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('organization_users_deleted_at_idx').on(table.deletedAt),
  ]
);

export const organizationUsersRelations = relations(organizationUsers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationUsers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationUsers.userId],
    references: [users.id],
  }),
}));

export const organizationUsersAuditLogs = pgTable(
  'organization_user_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationUserId: uuid('organization_user_id')
      .references(() => organizationUsers.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('organization_user_audit_logs_organization_user_id_idx').on(t.organizationUserId),
    index('organization_user_audit_logs_action_idx').on(t.action),
  ]
);

export type OrganizationUserModel = typeof organizationUsers.$inferSelect;
export type NewOrganizationUserModel = typeof organizationUsers.$inferInsert;
export type OrganizationUserAuditLogModel = typeof organizationUsersAuditLogs.$inferSelect;
export type NewOrganizationUserAuditLogModel = typeof organizationUsersAuditLogs.$inferInsert;
