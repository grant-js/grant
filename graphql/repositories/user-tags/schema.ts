import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  uniqueIndex,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

import { tags } from '../tags/schema';
import { users } from '../users/schema';

export const userTags = pgTable(
  'user_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
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
    uniqueIndex('user_tags_user_id_tag_id_unique')
      .on(table.userId, table.tagId)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex('user_tags_deleted_at_idx').on(table.deletedAt),
  ]
);

export const userTagsRelations = relations(userTags, ({ one }) => ({
  user: one(users, {
    fields: [userTags.userId],
    references: [users.id],
  }),
  tag: one(tags, {
    fields: [userTags.tagId],
    references: [tags.id],
  }),
}));

export const userTagsAuditLogs = pgTable(
  'user_tags_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userTagId: uuid('user_tag_id')
      .references(() => userTags.id, { onDelete: 'cascade' })
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('user_tags_audit_logs_user_tag_id_idx').on(t.userTagId),
    index('user_tags_audit_logs_action_idx').on(t.action),
  ]
);

export type UserTagModel = typeof userTags.$inferSelect;
export type NewUserTagModel = typeof userTags.$inferInsert;
export type UserTagAuditLogModel = typeof userTagsAuditLogs.$inferSelect;
export type NewUserTagAuditLogModel = typeof userTagsAuditLogs.$inferInsert;

export const UserTagAuditAction = {
  CREATE: 'CREATE',
  DELETE: 'DELETE',
} as const;

export type UserTagAuditActionType = (typeof UserTagAuditAction)[keyof typeof UserTagAuditAction];
