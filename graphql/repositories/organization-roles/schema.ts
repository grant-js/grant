import { relations, sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, uniqueIndex, varchar, index } from 'drizzle-orm/pg-core';

import { organizations } from '../organizations/schema';
import { roles } from '../roles/schema';

export const organizationRoles = pgTable(
  'organization_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    uniqueIndex('organization_roles_organization_id_role_id_unique')
      .on(table.organizationId, table.roleId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('organization_roles_deleted_at_idx').on(table.deletedAt),
  ]
);

export const organizationRolesRelations = relations(organizationRoles, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationRoles.organizationId],
    references: [organizations.id],
  }),
  role: one(roles, {
    fields: [organizationRoles.roleId],
    references: [roles.id],
  }),
}));

export const organizationRolesAuditLogs = pgTable(
  'organization_role_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationRoleId: uuid('organization_role_id')
      .references(() => organizationRoles.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('organization_role_audit_logs_organization_role_id_idx').on(t.organizationRoleId),
    index('organization_role_audit_logs_action_idx').on(t.action),
  ]
);

export type OrganizationRoleModel = typeof organizationRoles.$inferSelect;
export type OrganizationRoleInsert = typeof organizationRoles.$inferInsert;
export type OrganizationRoleAuditLogModel = typeof organizationRolesAuditLogs.$inferSelect;
export type NewOrganizationRoleAuditLogModel = typeof organizationRolesAuditLogs.$inferInsert;
