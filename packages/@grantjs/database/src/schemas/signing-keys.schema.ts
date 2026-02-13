import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  boolean,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * Signing keys by scope (system/session + per-project).
 * Multiple keys per scope allowed for rotation (one active, rest rotated); kid is globally unique.
 * System scope = (tenant: 'system', id: SYSTEM_USER_ID) for session tokens.
 */
export const signingKeys = pgTable(
  'signing_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scopeTenant: varchar('scope_tenant', { length: 50 }).notNull(),
    scopeId: varchar('scope_id', { length: 512 }).notNull(),
    kid: varchar('kid', { length: 255 }).notNull(),
    publicKeyPem: text('public_key_pem').notNull(),
    privateKeyPem: text('private_key_pem').notNull(),
    algorithm: varchar('algorithm', { length: 20 }).default('RS256').notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    rotatedAt: timestamp('rotated_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('signing_keys_scope_idx').on(table.scopeTenant, table.scopeId),
    uniqueIndex('signing_keys_kid_unique').on(table.kid),
  ]
);

export const signingKeyAuditLogs = pgTable(
  'signing_key_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    signingKeyId: uuid('signing_key_id')
      .references(() => signingKeys.id, { onDelete: 'cascade' })
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValues: varchar('old_values', { length: 1000 }),
    newValues: varchar('new_values', { length: 1000 }),
    metadata: varchar('metadata', { length: 1000 }),
    performedBy: uuid('performed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }),
    scopeId: varchar('scope_id', { length: 255 }),
  },
  (t) => [
    index('signing_key_audit_logs_signing_key_id_idx').on(t.signingKeyId),
    index('signing_key_audit_logs_action_idx').on(t.action),
    index('signing_key_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const signingKeyAuditLogsRelations = relations(signingKeyAuditLogs, ({ one }) => ({
  signingKey: one(signingKeys, {
    fields: [signingKeyAuditLogs.signingKeyId],
    references: [signingKeys.id],
  }),
  performedByUser: one(users, {
    fields: [signingKeyAuditLogs.performedBy],
    references: [users.id],
  }),
}));

export type SigningKeyModel = typeof signingKeys.$inferSelect;
export type NewSigningKeyModel = typeof signingKeys.$inferInsert;
