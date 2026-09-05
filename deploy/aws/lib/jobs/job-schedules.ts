/**
 * Recurrence, as EventBridge rules.
 *
 * One rule per entry in `SCHEDULED_JOBS`, each invoking the jobs function with the
 * job's id as its constant input — the same id `apps/api` registered the handler
 * under, which is what makes an inbound event resolvable to a handler at all.
 *
 * **The rules are generated, and the count is the evidence.** Six of them, five
 * production plus one demo-gated, asserted against the synthesized template rather
 * than counted by hand. A drifted cron list is the failure this shape exists to
 * prevent: it fails silently and surfaces hours later as "a sweep stopped running".
 *
 * A rule is created for every declared job whether or not it is enabled, and the
 * config decides only whether it is *armed*. Making the rule conditional instead would
 * make the count a function of configuration, and the count is the acceptance
 * criterion — a template with five rules would have to be read carefully to tell a
 * disabled job from a lost one.
 */

import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import type { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

import type { GrantEnv } from '../config/props';
import { toEventBridgeCron } from './cron';
import { SCHEDULED_JOBS } from './scheduled-jobs';

export interface JobSchedulesProps {
  /** The dispatcher. Receives `{ jobId }` and resolves it through `IJobAdapter`. */
  readonly target: IFunction;

  /**
   * The resolved container environment.
   *
   * Read for the schedule and enabled keys, so a deployment that overrides
   * `JOBS_WEBHOOK_DELIVERY_SCHEDULE` moves the rule and the application's own view of
   * the schedule together. They come from one value, which is the point.
   */
  readonly env: GrantEnv;
}

/** True unless the value is one of `@grantjs/env`'s falsy spellings. */
function isEnabled(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return value !== 'false' && value !== '0';
}

export class JobSchedules extends Construct {
  /** In declaration order, so a test can assert on ids without re-deriving them. */
  public readonly rules: readonly Rule[];

  constructor(scope: Construct, id: string, props: JobSchedulesProps) {
    super(scope, id);

    this.rules = SCHEDULED_JOBS.map((job) => {
      const expression = props.env[job.scheduleEnvKey] || job.defaultSchedule;

      return new Rule(this, job.id, {
        // Translated rather than passed through: EventBridge is not Unix cron, and the
        // day-of-week numbering differs by one. See `cron.ts`.
        schedule: Schedule.expression(toEventBridgeCron(expression, job.id)),
        enabled: isEnabled(props.env[job.enabledEnvKey], job.enabledByDefault),
        description: job.description,
        targets: [
          new LambdaFunction(props.target, {
            // The whole payload. The dispatcher needs no envelope: a scheduled run
            // carries no tenant scope, which is why these jobs run as the connection
            // owner and see every tenant's rows.
            event: RuleTargetInput.fromObject({ jobId: job.id }),
          }),
        ],
      });
    });
  }
}
