import { relations, sql } from 'drizzle-orm';
import { index, pgPolicy, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { groups } from './groups.schema';
import { organizations } from './organizations.schema';

export const organizationGroups = pgTable(
  'organization_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
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

export const organizationGroupsRelations = relations(organizationGroups, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationGroups.organizationId],
    references: [organizations.id],
  }),
  group: one(groups, {
    fields: [organizationGroups.groupId],
    references: [groups.id],
  }),
}));

export const organizationGroupsAuditLogs = pgTable(
  'organization_groups_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationGroupId: uuid('organization_group_id')
      .notNull()
      .references(() => organizationGroups.id, { onDelete: 'cascade' }),
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
    index('organization_groups_audit_logs_organization_group_id_idx').on(t.organizationGroupId),
    index('organization_groups_audit_logs_action_idx').on(t.action),
    index('organization_groups_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type OrganizationGroupModel = typeof organizationGroups.$inferSelect;
export type NewOrganizationGroup = typeof organizationGroups.$inferInsert;
export type OrganizationGroupAuditLog = typeof organizationGroupsAuditLogs.$inferSelect;
export type NewOrganizationGroupAuditLog = typeof organizationGroupsAuditLogs.$inferInsert;
