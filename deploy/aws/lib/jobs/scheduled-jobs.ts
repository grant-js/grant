/**
 * The scheduled jobs this target provisions rules for.
 *
 * `apps/api` decides *what* a job does and when it runs; this table says which jobs
 * carry a schedule and which `@grantjs/env` key holds it. It is the third copy of a
 * fact that already exists twice — in `apps/api/src/jobs/*.job.ts` and in
 * `@grantjs/env`'s defaults — and it is a copy on purpose, for the same reason
 * `lib/routing.ts` is: the alternative is a CDK app that imports the API's
 * configuration graph at synth time.
 *
 * **What keeps it honest is `scheduled-jobs.test.ts`**, which parses both of those
 * sources and fails if this table names a job they do not, misses one they do, or
 * quotes a default schedule that has drifted. A hand-maintained list nobody checks is
 * what the brief's acceptance criterion rules out; a checked one is the gate 1
 * decision applied a second time.
 *
 * Enqueue-only jobs (`event-relay`, `project-sync`, both `schedule: ''`) are absent
 * by construction — they have no recurrence to provision. They arrive over the queue
 * instead.
 */

export interface ScheduledJobDeclaration {
  /** `ScheduledJob.id` in `apps/api`. The rule sends exactly this to the dispatcher. */
  readonly id: string;

  /** Key holding the cron expression, in `@grantjs/env` syntax (5-field, UTC). */
  readonly scheduleEnvKey: string;

  /** That key's default, so a deploy that sets nothing still gets the right rule. */
  readonly defaultSchedule: string;

  /** Key that turns the job on. A rule for a disabled job is created but not enabled. */
  readonly enabledEnvKey: string;

  /** That key's default in `@grantjs/env`. */
  readonly enabledByDefault: boolean;

  /** For the reader of a template: why this rule exists. */
  readonly description: string;
}

/**
 * Six entries — five production plus one demo-gated — and the count is the acceptance
 * criterion, asserted against the synthesized template rather than trusted here.
 */
export const SCHEDULED_JOBS: readonly ScheduledJobDeclaration[] = [
  {
    id: 'data-retention-cleanup',
    scheduleEnvKey: 'JOBS_DATA_RETENTION_SCHEDULE',
    defaultSchedule: '0 2 * * *',
    enabledEnvKey: 'JOBS_DATA_RETENTION_ENABLED',
    enabledByDefault: true,
    description: 'Deletes accounts and backups past their retention window.',
  },
  {
    id: 'system-signing-key-rotation',
    scheduleEnvKey: 'JOBS_SYSTEM_SIGNING_KEY_ROTATION_SCHEDULE',
    defaultSchedule: '0 0 1 * *',
    enabledEnvKey: 'JOBS_SYSTEM_SIGNING_KEY_ROTATION_ENABLED',
    enabledByDefault: false,
    description: 'Rotates the platform session-signing key and invalidates its cache.',
  },
  {
    id: 'event-relay-sweep',
    scheduleEnvKey: 'JOBS_EVENT_RELAY_SWEEP_SCHEDULE',
    defaultSchedule: '* * * * *',
    enabledEnvKey: 'JOBS_EVENT_RELAY_ENABLED',
    enabledByDefault: true,
    description: 'Durability sweep for the domain-event outbox; the delivery guarantee.',
  },
  {
    id: 'webhook-delivery',
    scheduleEnvKey: 'JOBS_WEBHOOK_DELIVERY_SCHEDULE',
    defaultSchedule: '* * * * *',
    enabledEnvKey: 'JOBS_WEBHOOK_DELIVERY_ENABLED',
    enabledByDefault: true,
    description: 'Signs and POSTs due webhook deliveries, applying retry and DLQ state.',
  },
  {
    id: 'notification-delivery',
    scheduleEnvKey: 'JOBS_NOTIFICATION_DELIVERY_SCHEDULE',
    defaultSchedule: '* * * * *',
    enabledEnvKey: 'JOBS_NOTIFICATION_DELIVERY_ENABLED',
    enabledByDefault: true,
    description: 'Sends due email-channel notifications, applying retry and DLQ state.',
  },
  {
    // The demo-gated one. Its rule is synthesized either way so the count is a
    // constant six; `DEMO_MODE_ENABLED` decides whether it is armed.
    id: 'demo-db-refresh',
    scheduleEnvKey: 'DEMO_MODE_DB_REFRESH_SCHEDULE',
    defaultSchedule: '0 0 */2 * *',
    enabledEnvKey: 'DEMO_MODE_ENABLED',
    enabledByDefault: false,
    description: 'Resets the demonstration database. Inert unless DEMO_MODE_ENABLED.',
  },
];
