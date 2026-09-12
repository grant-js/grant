/**
 * The runtime choice `ProjectSyncJob.execute()` makes, and what must survive it.
 *
 * ADR 0002 routes a CDM import off Lambda because it measures 62.3 minutes against a hard
 * 15-minute ceiling. The dispatch is three lines; the failure modes are the reason it has
 * a test file:
 *
 *   - a dispatcher that ran the import as well would pay the ceiling twice;
 *   - a dispatch failure that returned quietly would leave a job row nothing will ever
 *     move, and a client polling it forever;
 *   - `container` configured with no adapter must refuse, not fall back to the runtime
 *     that cannot finish.
 */
import { Tenant } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JOB_RECORD_ID = '9f1c2f5e-0000-4000-8000-000000000001';
const SCOPE = { tenant: Tenant.AccountProject, id: 'acc-1:prj-1' };

async function buildJob(options: {
  runtime: 'inprocess' | 'container';
  start?: () => Promise<{ reference: string }>;
  withAdapter?: boolean;
}) {
  vi.resetModules();

  // Registered here rather than hoisted to module scope. A hoisted `vi.mock` registers
  // once while `vi.resetModules()` clears the registry per case, so which of the two won
  // depended on where this file landed in the run — the test passed alone and failed in
  // the full suite.
  vi.doMock('@/lib/jobs', async () => {
    const actual = await vi.importActual<typeof import('@/lib/jobs')>('@/lib/jobs');
    return {
      ...actual,
      // Both read the database; neither is what this file is about.
      assertTenantActive: vi.fn(async () => undefined),
      validateTenantJobContext: vi.fn(() => undefined),
    };
  });

  const markFailed = vi.fn(async (_params: { jobId: string; errorMessage: string }) => undefined);
  const start = options.start ?? vi.fn(async () => ({ reference: 'arn:aws:ecs:::task/abc' }));

  vi.doMock('@/config', async () => {
    const actual = await vi.importActual<typeof import('@/config')>('@/config');
    return {
      ...actual,
      config: {
        ...actual.config,
        jobs: {
          ...actual.config.jobs,
          sync: { ...actual.config.jobs.sync, runtime: options.runtime },
        },
      },
    };
  });

  const { default: ProjectSyncJob } = await import('@/jobs/project-sync.job');

  const appContext = {
    db: {
      // `setRlsContext` issues a `SET LOCAL` through the transaction, so the fake needs
      // `execute` — the marking path is inside RLS exactly as the real one is.
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ execute: vi.fn(async () => undefined) })
      ),
    },
    services: { projectSyncJobs: { markFailed } },
    ...((options.withAdapter ?? true) ? { syncRuntime: { start } } : {}),
  } as unknown as ConstructorParameters<typeof ProjectSyncJob>[0];

  const job = new ProjectSyncJob(appContext);
  // `apply` is the import. Replaced so this file tests the routing decision and not the
  // 105-statements-per-entity machinery behind it.
  const apply = vi.spyOn(job, 'apply').mockResolvedValue({ success: true, message: 'applied' });

  return { job, apply, start, markFailed };
}

const context = { scope: SCOPE, payload: { jobRecordId: JOB_RECORD_ID } };

/**
 * Every case resets the module registry and re-imports `@/config`, whose graph is large.
 * Alone that is well inside the 5 s default; under `pnpm test`, with seventeen packages
 * building in parallel, it is not — the first version of this file passed standalone and
 * failed the full run as a timeout rather than an assertion.
 */
const MODULE_RELOAD_TIMEOUT_MS = 30_000;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the in-process runtime', () => {
  it(
    'runs the import here and dispatches nothing',
    async () => {
      const { job, apply, start } = await buildJob({ runtime: 'inprocess' });

      await job.execute(context as never);

      expect(apply).toHaveBeenCalledWith(SCOPE, JOB_RECORD_ID);
      expect(start).not.toHaveBeenCalled();
    },
    MODULE_RELOAD_TIMEOUT_MS
  );
});

describe('the container runtime', () => {
  it(
    'dispatches the row and does not also run the import',
    async () => {
      // The whole point. Doing both would mean paying the 15-minute ceiling in the
      // dispatcher for work already running somewhere without one.
      const { job, apply, start } = await buildJob({ runtime: 'container' });

      const result = await job.execute(context as never);

      expect(start).toHaveBeenCalledWith({ jobRecordId: JOB_RECORD_ID, scope: SCOPE });
      expect(apply).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    },
    MODULE_RELOAD_TIMEOUT_MS
  );

  it(
    'reports the runtime handle, so a dispatched job can be traced to a task',
    async () => {
      const { job } = await buildJob({
        runtime: 'container',
        start: vi.fn(async () => ({ reference: 'arn:aws:ecs:eu-central-1:1:task/xyz' })),
      });

      const result = await job.execute(context as never);

      expect(result.message).toContain('arn:aws:ecs:eu-central-1:1:task/xyz');
    },
    MODULE_RELOAD_TIMEOUT_MS
  );

  it(
    'marks the job failed when nothing started, rather than leaving it to poll forever',
    async () => {
      // The failure that matters. `RunTask` can be refused for capacity or placement, and a
      // dispatcher that swallowed that would leave a row no process will ever transition.
      const { job, markFailed } = await buildJob({
        runtime: 'container',
        start: vi.fn(async () => {
          throw new Error('Capacity is unavailable');
        }),
      });

      await expect(job.execute(context as never)).rejects.toThrow('Capacity is unavailable');

      expect(markFailed).toHaveBeenCalledTimes(1);
      expect(markFailed.mock.calls[0][0]).toMatchObject({
        jobId: JOB_RECORD_ID,
        errorMessage: expect.stringContaining('Could not start the sync runtime'),
      });
    },
    MODULE_RELOAD_TIMEOUT_MS
  );

  it(
    'rethrows after marking failed, so the queue sees a failed consume',
    async () => {
      const { job } = await buildJob({
        runtime: 'container',
        start: vi.fn(async () => {
          throw new Error('Capacity is unavailable');
        }),
      });

      await expect(job.execute(context as never)).rejects.toThrow();
    },
    MODULE_RELOAD_TIMEOUT_MS
  );

  it(
    'refuses when configured for a runtime that is not wired',
    async () => {
      // Falling back to in-process here would run a 62-minute import under a 15-minute
      // ceiling — the exact outcome the configuration was set to avoid.
      const { job, apply } = await buildJob({ runtime: 'container', withAdapter: false });

      // Asserted on the message, not the class: `vi.resetModules()` gives this file its own
      // module registry, so the `ConfigurationError` the job throws is a different class
      // object from one imported here.
      await expect(job.execute(context as never)).rejects.toThrow(
        /no sync runtime adapter is wired/i
      );
      expect(apply).not.toHaveBeenCalled();
    },
    MODULE_RELOAD_TIMEOUT_MS
  );
});
