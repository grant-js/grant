import type { ILogger } from '@grantjs/core';
import type { Response } from 'express';

export type AfterCommitCallback = () => void | Promise<void>;

/**
 * Callbacks queued with `scheduleAfterCommit`, run once the request transaction has committed.
 *
 * `run()` awaits every callback and never rejects: a failing callback is logged and does not
 * stop the others, because the work it follows is already committed.
 */
export function createAfterCommitQueue(logger: ILogger) {
  const callbacks: AfterCommitCallback[] = [];

  return {
    schedule(fn: AfterCommitCallback): void {
      callbacks.push(fn);
    },
    async run(): Promise<void> {
      const results = await Promise.allSettled(
        callbacks.splice(0).map(async (fn) => {
          await fn();
        })
      );
      for (const result of results) {
        if (result.status === 'rejected') {
          logger.error({ err: result.reason }, 'scheduleAfterCommit callback failed');
        }
      }
    },
  };
}

/**
 * For requests with no transaction: runs each callback immediately and tracks it, so the
 * response can wait for it (`settled()`) instead of leaving it in flight.
 */
export function createImmediateAfterCommit(logger: ILogger) {
  const pending = new Set<Promise<void>>();

  return {
    schedule(fn: AfterCommitCallback): void {
      const tracked: Promise<void> = Promise.resolve()
        .then(fn)
        .catch((err: unknown) => {
          logger.error({ err }, 'scheduleAfterCommit callback failed');
        })
        .finally(() => {
          pending.delete(tracked);
        });
      pending.add(tracked);
    },
    async settled(): Promise<void> {
      while (pending.size > 0) {
        await Promise.all([...pending]);
      }
    },
  };
}

type EndArgs = unknown[];

export interface ResponseHold {
  /** Drop a held response and restore `res.end`, so an error handler can answer instead. */
  abandon(): void;
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
    if (held || abandoned) {
      return originalEnd.apply(this, args);
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
