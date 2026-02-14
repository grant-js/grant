import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgPolicy,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { organizations } from './organizations.schema';
import { projects } from './projects.schema';
import { tags } from './tags.schema';

export const organizationProjectTags = pgTable(
  'organization_project_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
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
    uniqueIndex('organization_project_tags_organization_id_project_id_tag_id_unique')
      .on(table.organizationId, table.projectId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('organization_project_tags_deleted_at_idx').on(table.deletedAt),
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`
        NULLIF(current_setting('app.current_organization_id', true), '') IS NULL
        OR (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
            AND (NULLIF(current_setting('app.current_project_id', true), '') IS NULL
                 OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid))
      `,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

export const organizationProjectTagsRelations = relations(organizationProjectTags, ({ one }) => ({
  project: one(projects, {
    fields: [organizationProjectTags.projectId],
    references: [projects.id],
  }),
  organization: one(organizations, {
    fields: [organizationProjectTags.organizationId],
    references: [organizations.id],
  }),
  tag: one(tags, {
    fields: [organizationProjectTags.tagId],
    references: [tags.id],
  }),
}));

export const organizationProjectTagAuditLogs = pgTable(
  'organization_project_tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationProjectTagId: uuid('organization_project_tag_id').references(
      () => organizationProjectTags.id,
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
    index('organization_project_tag_audit_logs_organization_project_tag_id_idx').on(
      t.organizationProjectTagId
    ),
    index('organization_project_tag_audit_logs_action_idx').on(t.action),
    index('organization_project_tag_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type OrganizationProjectTagModel = typeof organizationProjectTags.$inferSelect;
export type OrganizationProjectTagInsert = typeof organizationProjectTags.$inferInsert;
export type OrganizationProjectTagAuditLogModel =
  typeof organizationProjectTagAuditLogs.$inferSelect;
export type NewOrganizationProjectTagAuditLogModel =
  typeof organizationProjectTagAuditLogs.$inferInsert;
