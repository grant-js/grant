import { Job as BaseJob } from '@grantjs/jobs';

import { AppContext } from '@/types';

/**
 * API-specific job base class that extends the framework-agnostic Job
 * from @grantjs/jobs and adds the AppContext dependency needed by
 * application-level jobs.
 *
 * The logger is injected after construction via `setLogger()` in the
 * job initializer (see `initializeJobs()`), since the subclass `config`
 * property (which provides the job ID for the logger name) is only
 * available after field initialisers have run.
 */
export abstract class Job extends BaseJob {
  constructor(protected readonly appContext: AppContext) {
    super();
  }
}
