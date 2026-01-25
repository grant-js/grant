import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { resources } from './resources.schema';
import { tags } from './tags.schema';

export const resourceTags = pgTable(
  'resource_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceId: uuid('resource_id')
      .references(() => resources.id, { onDelete: 'cascade' })
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
    uniqueIndex('resource_tags_resource_id_tag_id_unique')
      .on(table.resourceId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('resource_tags_deleted_at_idx').on(table.deletedAt),
  ]
);

export const resourceTagsRelations = relations(resourceTags, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceTags.resourceId],
    references: [resources.id],
  }),
  tag: one(tags, {
    fields: [resourceTags.tagId],
    references: [tags.id],
  }),
}));

export const resourceTagAuditLogs = pgTable(
  'resource_tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceTagId: uuid('resource_tag_id')
      .references(() => resourceTags.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('resource_tag_audit_logs_resource_tag_id_idx').on(t.resourceTagId),
    index('resource_tag_audit_logs_action_idx').on(t.action),
  ]
);

export type ResourceTagModel = typeof resourceTags.$inferSelect;
export type ResourceTagInsert = typeof resourceTags.$inferInsert;
export type ResourceTagAuditLogModel = typeof resourceTagAuditLogs.$inferSelect;
export type NewResourceTagAuditLogModel = typeof resourceTagAuditLogs.$inferInsert;
