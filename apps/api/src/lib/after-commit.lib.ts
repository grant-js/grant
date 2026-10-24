import type { ILogger } from '@grantjs/core';
import type { Response } from 'express';

export type AfterCommitCallback = () => void | Promise<void>;

/**
 * Queue work until the request transaction has committed. `label` names the work in logs
 * when it is still pending at the timeout: a job id or job name, never a payload.
 */
export type ScheduleAfterCommit = (fn: AfterCommitCallback, label?: string) => void;

export interface AfterCommitOptions {
  /** Longest the response waits for the callbacks. They keep running after it. */
  timeoutMs: number;
}

const UNLABELLED = 'unlabelled callback';

/**
 * Tracks callbacks so the response can wait for them, for at most `timeoutMs`.
 *
 * Each callback logs its own failure, so one that fails after the wait was given up is still
 * visible, and a failure never stops the others: the work they follow is already committed.
 */
function createTracker(logger: ILogger, { timeoutMs }: AfterCommitOptions) {
  const pending = new Map<Promise<void>, string>();

  return {
    start(fn: AfterCommitCallback, label = UNLABELLED): void {
      const tracked: Promise<void> = Promise.resolve()
        .then(fn)
        .catch((err: unknown) => {
          logger.error({ err, label }, 'scheduleAfterCommit callback failed');
        })
        .finally(() => {
          pending.delete(tracked);
        });
      pending.set(tracked, label);
    },
    async settled(): Promise<void> {
      if (pending.size === 0) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = await Promise.race([
        Promise.all([...pending.keys()]).then(() => false),
        new Promise<boolean>((resolve) => {
          timer = setTimeout(() => resolve(true), timeoutMs);
        }),
      ]);
      clearTimeout(timer);
      if (timedOut) {
        logger.warn(
          { pending: [...pending.values()], timeoutMs },
          'scheduleAfterCommit callbacks still pending at the timeout; sending the response anyway'
        );
      }
    },
  };
}

/**
 * Callbacks queued with `scheduleAfterCommit`, run once the request transaction has committed.
 *
 * `run()` starts every callback and waits for them (bounded by `timeoutMs`); it never rejects.
 * Nothing runs unless `run()` is called, so a rolled-back transaction enqueues nothing.
 */
export function createAfterCommitQueue(logger: ILogger, options: AfterCommitOptions) {
  const tracker = createTracker(logger, options);
  const callbacks: Array<{ fn: AfterCommitCallback; label?: string }> = [];

  return {
    schedule(fn: AfterCommitCallback, label?: string): void {
      callbacks.push({ fn, label });
    },
    async run(): Promise<void> {
      for (const { fn, label } of callbacks.splice(0)) {
        tracker.start(fn, label);
      }
      await tracker.settled();
    },
  };
}

/**
 * For requests with no transaction: runs each callback immediately and tracks it, so the
 * response can wait for it (`settled()`, bounded by `timeoutMs`) instead of leaving it in flight.
 */
export function createImmediateAfterCommit(logger: ILogger, options: AfterCommitOptions) {
  const tracker = createTracker(logger, options);

  return {
    schedule(fn: AfterCommitCallback, label?: string): void {
      tracker.start(fn, label);
    },
    settled: () => tracker.settled(),
  };
}

type EndArgs = unknown[];

export interface ResponseHold {
  /** Drop a held response and restore `res.end`, so an error handler can answer instead. */
  abandon(): void;
}

/**
 * Resolve the request transaction so Drizzle COMMITs and returns the client, then run
 * after-commit. After-commit must not start until `transactionSettled` resolves (client
 * already back in the pool). If COMMIT fails the promise rejects and after-commit does not run.
 */
export async function releaseTransactionThenAfterCommit(
  releaseTransaction: () => void,
  transactionSettled: Promise<unknown>,
  afterCommit: { run(): Promise<void> }
): Promise<void> {
  releaseTransaction();
  await transactionSettled;
  await afterCommit.run();
}

/**
 * Hold the first `res.end()` until `gate()` has settled, then flush the response.
 *
 * Why: on AWS Lambda (Lambda Web Adapter) the execution environment is frozen as soon as the
 * response is returned, cutting off anything still in flight, e.g. an SQS `SendMessage` that was
 * fired after the response. Work that must outlive the request has to finish before the
 * response is flushed.
 *
 * `gate` should not reject. If it does, the held response is flushed as is so the request
 * cannot hang; callers that want to replace the response with an error call `abandon()` first.
 */
export function holdResponseEndUntil(res: Response, gate: () => Promise<void>): ResponseHold {
  const originalEnd = res.end as (...args: EndArgs) => Response;
  let held = false;
  let abandoned = false;

  const restore = () => {
    res.end = originalEnd as Response['end'];
  };

  res.end = function holdingEnd(this: Response, ...args: EndArgs): Response {
    if (abandoned) {
      return originalEnd.apply(this, args);
    }
    if (held) {
      // A second end() while the first is held must not flush: it would send the response
      // before the gate, the exact hole this guards. The first call's arguments win.
      return this;
    }
    held = true;
    const flush = () => {
      if (abandoned) return;
      restore();
      originalEnd.apply(res, args);
    };
    gate().then(flush, flush);
    return this;
  } as Response['end'];

  return {
    abandon() {
      abandoned = true;
      restore();
    },
  };
}
