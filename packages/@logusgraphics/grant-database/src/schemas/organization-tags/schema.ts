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

import { organizations } from '../organizations/schema';
import { tags } from '../tags/schema';

export const organizationTags = pgTable(
  'organization_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
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
    uniqueIndex('organization_tags_organization_id_tag_id_unique')
      .on(table.organizationId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('organization_tags_deleted_at_idx').on(table.deletedAt),
  ]
);

export const organizationTagsRelations = relations(organizationTags, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationTags.organizationId],
    references: [organizations.id],
  }),
  tag: one(tags, {
    fields: [organizationTags.tagId],
    references: [tags.id],
  }),
}));

export const organizationTagAuditLogs = pgTable(
  'organization_tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationTagId: uuid('organization_tag_id')
      .references(() => organizationTags.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('organization_tag_audit_logs_organization_tag_id_idx').on(t.organizationTagId),
    index('organization_tag_audit_logs_action_idx').on(t.action),
  ]
);

export type OrganizationTagModel = typeof organizationTags.$inferSelect;
export type OrganizationTagInsert = typeof organizationTags.$inferInsert;
export type OrganizationTagAuditLogModel = typeof organizationTagAuditLogs.$inferSelect;
export type NewOrganizationTagAuditLogModel = typeof organizationTagAuditLogs.$inferInsert;
