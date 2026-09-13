/**
 * Standalone `project-sync` entrypoint — the container half of ADR 0002's escape hatch.
 *
 *   GRANT_SYNC_JOB_ID=<uuid> GRANT_SYNC_JOB_SCOPE='{"tenant":"…","id":"…"}' \
 *     node dist/run-sync-job.js
 *
 * Exists because a 28,880-entity CDM import measures **62.3 minutes** and Lambda's
 * ceiling is 15, hard. The import runs in one transaction and cannot be split — a
 * partially-applied permission model is a security outcome — so the work moves rather
 * than being chunked. See ADR 0002 and
 * `plans/2026-09-09-aws-followups-closeout-measurements.md` § ADR 0002.
 *
 * **It calls `ProjectSyncJob.apply()`, deliberately not `execute()`.** `execute()` is
 * where the runtime is chosen; re-entering it here would read the same configuration,
 * dispatch again, and start a task per attempt without end. Calling the body directly
 * makes that impossible rather than merely unlikely.
 *
 * Takes its input from the environment because that is what an ECS container override
 * sets, and overrides are capped at 8 KiB in total — so this receives the *row id* and
 * reads the CDM document from the database, rather than being handed a payload that can
 * reach 17 MiB. It also keeps tenant data out of CloudTrail, which records `RunTask`
 * parameters.
 *
 * Exit codes: 0 when the job reached a terminal state, 1 otherwise — so a failed import
 * surfaces as a failed task rather than a task that merely stopped.
 */

import { closeDatabase, initializeDBConnection } from '@grantjs/database';
import type { Scope } from '@grantjs/schema';

import { config, validateConfig } from '@/config';
import ProjectSyncJob from '@/jobs/project-sync.job';
import { createAppContext } from '@/lib/app-context.lib';
import { CacheFactory } from '@/lib/cache';
import { logger, loggerFactory } from '@/lib/logger';
import { resolveDatabaseConnectionString } from '@/lib/secrets';

/**
 * The scope arrives as JSON in an environment variable, so it is parsed rather than
 * trusted. A malformed scope must fail here: it is the RLS context the whole execution
 * runs under, and a job that proceeds without it would read across tenants.
 */
function readScope(raw: string | undefined): Scope {
  if (!raw) {
    throw new Error("GRANT_SYNC_JOB_SCOPE is required; it is the job's RLS context.");
  }
  const parsed: unknown = JSON.parse(raw);
  if (
    parsed == null ||
    typeof parsed !== 'object' ||
    typeof (parsed as { tenant?: unknown }).tenant !== 'string' ||
    typeof (parsed as { id?: unknown }).id !== 'string'
  ) {
    throw new Error('GRANT_SYNC_JOB_SCOPE must be a JSON object with string `tenant` and `id`.');
  }
  return parsed as Scope;
}

async function runSyncJob(): Promise<void> {
  validateConfig();

  const { jobId: jobRecordId, scope: rawScope } = config.jobs.sync.execution;
  if (!jobRecordId) {
    throw new Error('GRANT_SYNC_JOB_ID is required; it names the project_sync_jobs row to apply.');
  }
  const scope = readScope(rawScope);

  const db = initializeDBConnection({
    connectionString: await resolveDatabaseConnectionString(),
    max: config.db.poolMax,
    idleTimeout: config.db.idleTimeout,
    connectTimeout: config.db.connectionTimeout,
    logger: loggerFactory.createLogger('DatabaseConnection'),
  });

  // Memory, not Redis. This process applies one job and exits; a shared cache would be
  // one more thing that has to be reachable for an import to run, and the import's own
  // cache invalidation runs through the services either way.
  const cache = CacheFactory.createEntityCache({ strategy: 'memory' }, loggerFactory);

  try {
    const appContext = createAppContext(db, cache);
    const job = new ProjectSyncJob(appContext);

    logger.info({ msg: 'Running project-sync in a container runtime', jobRecordId });
    const result = await job.apply(scope, jobRecordId);

    if (!result.success) {
      throw new Error(result.message ?? 'project-sync reported failure');
    }
    logger.info({ msg: 'project-sync complete', jobRecordId, message: result.message });
  } finally {
    await CacheFactory.disconnect(cache);
    await closeDatabase();
  }
}

runSyncJob()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    logger.fatal({ msg: 'project-sync failed in the container runtime', err: error });
    process.exit(1);
  });
