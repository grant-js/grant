import { relations, sql } from 'drizzle-orm';
import { pgTable, pgPolicy, varchar, timestamp, uuid, index } from 'drizzle-orm/pg-core';

import { organizations } from './organizations.schema';
import { permissions } from './permissions.schema';

export const organizationPermissions = pgTable(
  'organization_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  () => [
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`NULLIF(current_setting('app.current_organization_id', true), '') IS NULL OR organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid`,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

export const organizationPermissionsRelations = relations(organizationPermissions, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationPermissions.organizationId],
    references: [organizations.id],
  }),
  permission: one(permissions, {
    fields: [organizationPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const organizationPermissionsAuditLogs = pgTable(
  'organization_permissions_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationPermissionId: uuid('organization_permission_id')
      .notNull()
      .references(() => organizationPermissions.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    scopeTenant: varchar('scope_tenant', { length: 50 }),
    scopeId: varchar('scope_id', { length: 255 }),
  },
  (t) => [
    index('organization_permissions_audit_logs_organization_permission_id_idx').on(
      t.organizationPermissionId
    ),
    index('organization_permissions_audit_logs_action_idx').on(t.action),
    index('organization_permissions_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type OrganizationPermissionModel = typeof organizationPermissions.$inferSelect;
export type NewOrganizationPermissionModel = typeof organizationPermissions.$inferInsert;
export type OrganizationPermissionAuditLogModel =
  typeof organizationPermissionsAuditLogs.$inferSelect;
export type NewOrganizationPermissionAuditLogModel =
  typeof organizationPermissionsAuditLogs.$inferInsert;
