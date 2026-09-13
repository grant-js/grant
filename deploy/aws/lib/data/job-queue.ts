/**
 * The queue that carries one-off jobs.
 *
 * `JOBS_PROVIDER=aws` splits job execution across two processes: the API enqueues,
 * something else consumes and calls `trigger()`. Under `node-cron` — what this target
 * ran until now — `enqueue()` executed the handler inline, inside the request's own
 * invocation and under its 30-second timeout. So this queue is not only what the AWS
 * adapter needs; it is what moves `startProjectSync` off the request path.
 *
 * Only two jobs use it, both declared `enqueueOnly` in `apps/api`: `project-sync` and
 * the on-demand half of `event-relay`. The scheduled sweeps never touch it.
 */

import { Duration } from 'aws-cdk-lib';
import { type IQueue, Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

/**
 * How many times a message may be received before it is parked.
 *
 * Three, because the consumer distinguishes a failure from a poison message only by
 * repetition: `parseJobMessage` rejects a malformed body identically every time, while
 * a transient database error usually does not survive two retries. Beyond that a
 * failing message is just billing invocations.
 */
const MAX_RECEIVE_COUNT = 3;

export interface JobQueueProps {
  /**
   * Existing queue to use. Omit to create one.
   *
   * Bring-your-own is the same shape as everywhere else in this library, but note the
   * consequence: nothing here can attach a dead-letter queue to a queue it does not
   * own, so an imported one keeps whatever redrive policy it already has.
   */
  readonly queue?: IQueue;

  /**
   * The consumer's timeout. The queue's visibility timeout is derived from it.
   *
   * Required rather than defaulted because getting it wrong is invisible: a visibility
   * timeout shorter than the consumer's timeout lets a second consumer receive a
   * message the first is still working on, and every job here mutates the database.
   */
  readonly consumerTimeout: Duration;
}

export class JobQueue extends Construct {
  public readonly queue: IQueue;

  /** Present only when this construct created the queue. */
  public readonly deadLetterQueue?: IQueue;

  /** True when this construct created the queue, so teardown removes it. */
  public readonly ownsQueue: boolean;

  constructor(scope: Construct, id: string, props: JobQueueProps) {
    super(scope, id);

    this.ownsQueue = props.queue === undefined;

    if (props.queue) {
      this.queue = props.queue;
      return;
    }

    this.deadLetterQueue = new Queue(this, 'DeadLetter', {
      // Two weeks, matching the function log groups: a message parked here and a log
      // line explaining why should not expire at different times, because reading one
      // without the other explains nothing.
      retentionPeriod: Duration.days(14),
      enforceSSL: true,
    });

    this.queue = new Queue(this, 'Queue', {
      // AWS's own guidance is six times the consumer's timeout, which leaves room for
      // the retries the event-source mapping performs inside one visibility window.
      //
      // **Phase C accepted this pending a measurement of real import durations, and the
      // measurement did not license shortening it.** Slice 12 timed `project-sync` at
      // four scales: 2.9 s at 124 entities, 62.3 minutes at 28,880
      // (`plans/2026-09-09-aws-followups-closeout-measurements.md` § ADR 0002). There is
      // no p99 to derive a window from — durations span four orders of magnitude and the
      // top of the range exceeds the consumer's own ceiling.
      //
      // Shortening it would be actively worse, and slice 13 established why: a window
      // shorter than a healthy job's runtime redelivers the message, the second attempt
      // is refused by `transitionToRunning` (the job is already RUNNING), and that
      // refusal *consumes a receive*. Three of those park a job in the dead-letter queue
      // while the first attempt is still working and may yet succeed. The 4.5 hours to
      // reach the DLQ is the price of a consumer that may legitimately run 15 minutes,
      // not a number nobody thought about.
      //
      // What *does* shorten it is `consumerTimeout`, which an adopter already controls
      // through `jobs.timeout`. Enabling ADR 0002's hatch (`sync: { enabled: true }`)
      // makes this consumer a dispatcher that returns in seconds rather than an importer,
      // and a deployment that has done so can lower the job timeout and get a fast DLQ
      // as a consequence. That is configuration reaching the right answer, which is why
      // this derivation is left alone.
      visibilityTimeout: Duration.seconds(props.consumerTimeout.toSeconds() * 6),
      enforceSSL: true,
      deadLetterQueue: { queue: this.deadLetterQueue, maxReceiveCount: MAX_RECEIVE_COUNT },
    });
  }
}
