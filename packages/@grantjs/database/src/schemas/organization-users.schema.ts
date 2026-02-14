import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  pgPolicy,
  uuid,
  timestamp,
  varchar,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

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
    organizationUserId: uuid('organization_user_id').references(() => organizationUsers.id, {
      onDelete: 'set null',
    }),
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
    index('organization_user_audit_logs_organization_user_id_idx').on(t.organizationUserId),
    index('organization_user_audit_logs_action_idx').on(t.action),
    index('organization_user_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type OrganizationUserModel = typeof organizationUsers.$inferSelect;
export type NewOrganizationUserModel = typeof organizationUsers.$inferInsert;
export type OrganizationUserAuditLogModel = typeof organizationUsersAuditLogs.$inferSelect;
export type NewOrganizationUserAuditLogModel = typeof organizationUsersAuditLogs.$inferInsert;
