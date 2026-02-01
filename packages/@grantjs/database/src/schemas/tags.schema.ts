import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const tagAuditLogs = pgTable(
  'tag_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tagId: uuid('tag_id')
      .references(() => tags.id)
      .notNull(),
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
    index('tag_audit_logs_tag_id_idx').on(t.tagId),
    index('tag_audit_logs_action_idx').on(t.action),
    index('tag_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export type TagModel = typeof tags.$inferSelect;
export type NewTagModel = typeof tags.$inferInsert;
export type TagAuditLogModel = typeof tagAuditLogs.$inferSelect;
export type NewTagAuditLogModel = typeof tagAuditLogs.$inferInsert;
