/**
 * Inbound dispatch for jobs whose schedule lives outside this process.
 *
 * `AwsJobAdapter.schedule()` registers a handler and creates no timer — recurrence is
 * an EventBridge rule, and one-off work arrives over SQS. Both then need a way *in*,
 * and `IJobAdapter.trigger()` had no caller anywhere. This router is that caller.
 *
 * Under the Lambda Web Adapter a non-HTTP event is POSTed to
 * `AWS_LWA_PASS_THROUGH_PATH` (default `/events`), so an EventBridge rule and an SQS
 * event-source mapping both arrive here as ordinary HTTP requests and the app stays a
 * plain listening server.
 *
 * **Mounted ahead of `originVerifyMiddleware`, and that is only safe because of where
 * it runs.** The middleware refuses anything without the secret CloudFront attaches,
 * which no AWS event source can send. Rather than exempt a path on the public origin —
 * the mistake slice 4c corrected for `/health` — this router exists only in a process
 * that has **no Function URL**, where `lambda:InvokeFunction` is the guard and AWS
 * enforces it before any code runs. `JOBS_EVENT_DISPATCH_ENABLED` defaults to false,
 * so the route is absent from the public API function and from every other target.
 *
 * Two payload shapes, because two event sources:
 *
 *   EventBridge rule (constant input)  {"jobId":"webhook-delivery"}
 *   SQS event-source mapping           {"Records":[{"messageId":"…","body":"{…}"}]}
 */

import { parseJobMessage } from '@grantjs/jobs';
import express, { Request, Response, Router } from 'express';
import { z } from 'zod';

import { config } from '@/config';
import { getJobAdapter } from '@/lib/jobs';
import { createLogger } from '@/lib/logger';

const logger = createLogger('EventDispatch');

/** A rule's constant input. `payload` carries anything the rule wants to pass on. */
const scheduledEventSchema = z.object({
  jobId: z.string().min(1),
  payload: z.unknown().optional(),
});

const sqsEventSchema = z.object({
  Records: z
    .array(
      z.object({
        messageId: z.string().min(1),
        body: z.string(),
      })
    )
    .min(1),
});

/**
 * Identifiers of the messages that must not be deleted.
 *
 * The queue's event-source mapping reports partial batch failures, so this is how a
 * failed message is retried. Failing the whole invocation instead would redeliver the
 * successful messages too, and every job here is a database-mutating sweep.
 */
interface BatchResponse {
  batchItemFailures: Array<{ itemIdentifier: string }>;
}

export function createEventDispatchRouter(): Router {
  const router = Router();
  const path = config.jobs.eventDispatch.path;

  // Parsed by this router rather than by the global `express.json()`, which is
  // registered after origin verification and so runs too late for a router mounted
  // ahead of it.
  //
  // `type: () => true` parses regardless of the request's content type. The adapter's
  // pass-through does not document what it sets, and the alternative failure is silent:
  // an unparsed body reaches the handler as `{}`, answers 400, and the event source
  // records a delivered event. Every caller of this route is an AWS event source
  // sending JSON, so widening the matcher costs nothing.
  const parseBody = express.json({ limit: config.app.jsonBodyLimitBytes, type: () => true });

  router.post(path, parseBody, async (req: Request, res: Response) => {
    const adapter = getJobAdapter();
    if (!adapter) {
      // `server.ts` calls `initializeJobs()` after `httpServer.listen()`, and the
      // adapter's readiness signal is the open port, so an event can arrive in the
      // window between the two. 503 rather than 404: the caller should come back.
      logger.warn({ msg: 'Job event arrived before the adapter was initialized' });
      res.status(503).json({ error: 'Job adapter is not ready' });
      return;
    }

    const sqs = sqsEventSchema.safeParse(req.body);
    if (sqs.success) {
      const response: BatchResponse = { batchItemFailures: [] };

      for (const record of sqs.data.Records) {
        try {
          const { jobId, data } = parseJobMessage(record.body);
          const result = await adapter.trigger(jobId, data);
          logger.info({ jobId, messageId: record.messageId, result, msg: 'Queued job executed' });
        } catch (error) {
          // Logged with the message id so a poison message is identifiable in the
          // dead-letter queue rather than only countable.
          logger.error({
            err: error,
            messageId: record.messageId,
            msg: 'Queued job failed; message will be retried',
          });
          response.batchItemFailures.push({ itemIdentifier: record.messageId });
        }
      }

      res.status(200).json(response);
      return;
    }

    const scheduled = scheduledEventSchema.safeParse(req.body);
    if (!scheduled.success) {
      logger.error({ msg: 'Unrecognized event payload', issues: scheduled.error.issues });
      res.status(400).json({ error: 'Unrecognized event payload' });
      return;
    }

    const { jobId, payload } = scheduled.data;
    try {
      const result = await adapter.trigger(jobId, payload === undefined ? undefined : { payload });
      logger.info({ jobId, result, msg: 'Scheduled job executed' });
      res.status(200).json({ jobId, result });
    } catch (error) {
      // A rule naming a job this process did not register is a deployment fault, not a
      // transient one: the rules and the handlers come from the same declaration, so
      // the two have drifted. Say which id failed.
      logger.error({ err: error, jobId, msg: 'Scheduled job failed' });
      res.status(500).json({ jobId, error: 'Job execution failed' });
    }
  });

  return router;
}
