import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { users } from './users.schema';

export const projectSyncJobOperations = ['import', 'export'] as const;
export type ProjectSyncJobOperation = (typeof projectSyncJobOperations)[number];

export const projectSyncJobModeStrategies = ['merge', 'replace'] as const;
export type ProjectSyncJobModeStrategy = (typeof projectSyncJobModeStrategies)[number];

/** Asynchronous CDM import/export jobs (`project_sync_jobs`). */
export const projectSyncJobs = pgTable(
  'project_sync_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    scopeTenant: varchar('scope_tenant', { length: 50 }).notNull(),
    scopeId: varchar('scope_id', { length: 255 }).notNull(),
    cdmVersion: integer('cdm_version').notNull(),
    jobName: text('job_name'),
    operation: varchar('operation', { length: 20 })
      .$type<ProjectSyncJobOperation>()
      .notNull()
      .default('import'),
    modeStrategy: varchar('mode_strategy', {
      length: 20,
    }).$type<ProjectSyncJobModeStrategy | null>(),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    /**
     * The CDM document, for an inline import and for an export's request. NULL for a
     * by-reference import, whose document is the object at `payloadPath` (ADR 0009); the
     * CHECK below makes sure exactly that case, and no other, leaves it empty.
     */
    payload: jsonb('payload'),
    /** Server-derived object key of a by-reference import. Unique: one upload, one job. */
    payloadPath: text('payload_path'),
    /** Size the store reported when the job was started. */
    payloadSizeBytes: integer('payload_size_bytes'),
    /** The client's own, untrusted entity count; the worker counts for itself. */
    entityCountHint: integer('entity_count_hint'),
    result: jsonb('result'),
    warnings: jsonb('warnings').default([]).notNull(),
    errorMessage: text('error_message'),
    errorDetails: jsonb('error_details'),
    cancelRequested: timestamp('cancel_requested_at'),
    enqueuedById: uuid('enqueued_by_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
    snapshot: jsonb('snapshot'),
    snapshotTakenAt: timestamp('snapshot_taken_at'),
    snapshotSizeBytes: integer('snapshot_size_bytes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    check('project_sync_jobs_operation_check', sql`("operation" IN ('import', 'export'))`),
    check(
      'project_sync_jobs_mode_strategy_check',
      sql`("mode_strategy" IS NULL OR "mode_strategy" IN ('merge', 'replace'))`
    ),
    check(
      'project_sync_jobs_payload_present_check',
      sql`("payload" IS NOT NULL OR "payload_path" IS NOT NULL)`
    ),
    index('project_sync_jobs_project_id_idx').on(table.projectId),
    index('project_sync_jobs_status_idx').on(table.status),
    index('project_sync_jobs_project_status_idx').on(table.projectId, table.status),
    // One upload, one job, except that a FAILED job releases it: the worker leaves the object in
    // place when the store itself failed, and a retry must be able to start from the same upload.
    // A job that failed over the document itself deleted its object, so a retry finds nothing.
    uniqueIndex('project_sync_jobs_payload_path_unique')
      .on(table.payloadPath)
      .where(sql`${table.payloadPath} IS NOT NULL AND ${table.status} <> 'failed'`),
    uniqueIndex('project_sync_jobs_project_operation_job_name_unique')
      .on(table.projectId, table.operation, table.jobName)
      .where(
        sql`${table.jobName} IS NOT NULL AND ${table.deletedAt} IS NULL AND ${table.status} IN ('pending', 'running')`
      ),
    pgPolicy('tenant_isolation_policy', {
      as: 'restrictive',
      for: 'select',
      using: sql`NULLIF(current_setting('app.current_project_id', true), '') IS NULL OR project_id = NULLIF(current_setting('app.current_project_id', true), '')::uuid`,
    }),
    pgPolicy('tenant_rls_allow', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
);

export const projectSyncJobsRelations = relations(projectSyncJobs, ({ one }) => ({
  project: one(projects, {
    fields: [projectSyncJobs.projectId],
    references: [projects.id],
  }),
  enqueuedBy: one(users, {
    fields: [projectSyncJobs.enqueuedById],
    references: [users.id],
  }),
}));

export const projectSyncJobAuditLogs = pgTable(
  'project_sync_job_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectSyncJobId: uuid('project_sync_job_id').references(() => projectSyncJobs.id, {
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
    index('project_sync_job_audit_logs_job_id_idx').on(t.projectSyncJobId),
    index('project_sync_job_audit_logs_action_idx').on(t.action),
    index('project_sync_job_audit_logs_scope_tenant_idx').on(t.scopeTenant),
  ]
);

export const projectSyncJobAuditLogsRelations = relations(projectSyncJobAuditLogs, ({ one }) => ({
  job: one(projectSyncJobs, {
    fields: [projectSyncJobAuditLogs.projectSyncJobId],
    references: [projectSyncJobs.id],
  }),
}));

export type ProjectSyncJobModel = typeof projectSyncJobs.$inferSelect;
export type NewProjectSyncJobModel = typeof projectSyncJobs.$inferInsert;
export type ProjectSyncJobAuditLogModel = typeof projectSyncJobAuditLogs.$inferSelect;
export type NewProjectSyncJobAuditLogModel = typeof projectSyncJobAuditLogs.$inferInsert;
