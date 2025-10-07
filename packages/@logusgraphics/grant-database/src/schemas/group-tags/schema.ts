import { relations } from 'drizzle-orm';
import { pgTable, varchar, timestamp, uuid, index, boolean } from 'drizzle-orm/pg-core';

import { groups } from '../groups/schema';
import { tags } from '../tags/schema';

export const groupTags = pgTable('group_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const groupTagsRelations = relations(groupTags, ({ one }) => ({
  group: one(groups, {
    fields: [groupTags.groupId],
    references: [groups.id],
  }),
  tag: one(tags, {
    fields: [groupTags.tagId],
    references: [tags.id],
  }),
}));

export const groupTagsAuditLogs = pgTable(
  'group_tags_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupTagId: uuid('group_tag_id')
      .notNull()
      .references(() => groupTags.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('group_tags_audit_logs_group_tag_id_idx').on(t.groupTagId),
    index('group_tags_audit_logs_action_idx').on(t.action),
  ]
);

export type GroupTag = typeof groupTags.$inferSelect;
export type NewGroupTag = typeof groupTags.$inferInsert;
export type GroupTagAuditLog = typeof groupTagsAuditLogs.$inferSelect;
export type NewGroupTagAuditLog = typeof groupTagsAuditLogs.$inferInsert;
