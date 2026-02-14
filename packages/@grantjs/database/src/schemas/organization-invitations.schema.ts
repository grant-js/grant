import { relations, sql } from 'drizzle-orm';
import {
  index,
  pgPolicy,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { organizations } from './organizations.schema';
import { roles } from './roles.schema';
import { users } from './users.schema';

export const organizationInvitations = pgTable(
  'organization_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    expiresAt: timestamp('expires_at').notNull(),
    invitedBy: uuid('invited_by')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    invitedAt: timestamp('invited_at').defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('organization_invitations_organization_id_idx').on(table.organizationId),
    index('organization_invitations_email_idx').on(table.email),
    index('organization_invitations_status_idx').on(table.status),
    index('organization_invitations_email_organization_id_idx').on(
      table.email,
      table.organizationId
    ),
    uniqueIndex('organization_invitations_token_unique').on(table.token),
    uniqueIndex('organization_invitations_deleted_at_idx').on(table.deletedAt),
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

export const organizationInvitationsRelations = relations(organizationInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvitations.organizationId],
    references: [organizations.id],
  }),
  role: one(roles, {
    fields: [organizationInvitations.roleId],
    references: [roles.id],
  }),
  inviter: one(users, {
    fields: [organizationInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const organizationInvitationsAuditLogs = pgTable(
  'organization_invitation_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationInvitationId: uuid('organization_invitation_id').references(
      () => organizationInvitations.id,
      { onDelete: 'set null' }
    ),
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
    index('organization_invitation_audit_logs_organization_invitation_id_idx').on(
      t.organizationInvitationId
    ),
    index('organization_invitation_audit_logs_action_idx').on(t.action),
    index('organization_invitation_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type OrganizationInvitationModel = typeof organizationInvitations.$inferSelect;
export type NewOrganizationInvitationModel = typeof organizationInvitations.$inferInsert;
export type OrganizationInvitationAuditLogModel =
  typeof organizationInvitationsAuditLogs.$inferSelect;
export type NewOrganizationInvitationAuditLogModel =
  typeof organizationInvitationsAuditLogs.$inferInsert;
