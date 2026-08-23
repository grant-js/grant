import {
  CreateQueueCommand,
  DeleteQueueCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import type { ILogger, JobExecutionContext, ScheduledJob } from '@grantjs/core';
import { noopLogger } from '@grantjs/core';
import { type Scope, Tenant } from '@grantjs/schema';
import { afterAll, describe, expect, it } from 'vitest';

import { AwsJobAdapter, parseJobMessage } from './index';

// Backed by the e2e stack's LocalStack. Started by scripts/e2e.sh, or directly:
//   docker compose -f docker-compose.e2e.yml --env-file .env.test -p grant-e2e \
//     up -d redis localstack
const ENDPOINT = process.env.E2E_LOCALSTACK_ENDPOINT ?? 'http://localhost:4567';
const REGION = process.env.E2E_AWS_REGION ?? 'us-east-1';
const CREDENTIALS = { accessKeyId: 'test', secretAccessKey: 'test' };

/** One LocalStack serves every run on the shared runner, so names must be unique. */
const QUEUE_NAME = `grant-jobs-conformance-${process.pid}-${Date.now()}`;

const admin = new SQSClient({ region: REGION, endpoint: ENDPOINT, credentials: CREDENTIALS });

/** No skip path: invoking the integration lane asserts the stack is up. */
async function createQueue(): Promise<string> {
  try {
    const { QueueUrl } = await admin.send(new CreateQueueCommand({ QueueName: QUEUE_NAME }));
    if (!QueueUrl) throw new Error('CreateQueue returned no QueueUrl');
    return QueueUrl;
  } catch (error) {
    throw new Error(
      `No SQS at ${ENDPOINT} for the adapter integration lane. Start it with: ` +
        'docker compose -f docker-compose.e2e.yml --env-file .env.test -p grant-e2e ' +
        'up -d redis localstack',
      { cause: error }
    );
  }
}

const queueUrl = await createQueue();

afterAll(async () => {
  await admin.send(new DeleteQueueCommand({ QueueUrl: queueUrl })).catch(() => {
    // Best effort; LocalStack is ephemeral per stack lifecycle.
  });
  admin.destroy();
});

const makeAdapter = () =>
  new AwsJobAdapter(
    { region: REGION, queueUrl, endpoint: ENDPOINT, ...CREDENTIALS },
    noopLogger as ILogger
  );

const recurring: ScheduledJob = { id: 'sweep', schedule: '* * * * *', enabled: true };
const onDemand: ScheduledJob = { id: 'relay', schedule: '', enabled: true, enqueueOnly: true };

async function receiveOne(): Promise<string> {
  const { Messages } = await admin.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 5,
    })
  );
  const body = Messages?.[0]?.Body;
  if (!body) throw new Error('no message received within the wait window');
  return body;
}

describe('AwsJobAdapter', () => {
  it('registers handlers without creating any schedule', async () => {
    const adapter = makeAdapter();
    await adapter.schedule(recurring, async () => ({ success: true }));

    // Registration is all schedule() does here — recurrence belongs to an
    // EventBridge rule this process neither creates nor can see.
    expect(await adapter.isScheduled('sweep')).toBe(true);
    expect(await adapter.getScheduledJobs()).toEqual([recurring]);

    await adapter.shutdown();
  });

  it('skips registration for a disabled job', async () => {
    const adapter = makeAdapter();
    await adapter.schedule({ ...recurring, enabled: false }, async () => ({ success: true }));

    expect(await adapter.isScheduled('sweep')).toBe(false);
    await adapter.shutdown();
  });

  it('rejects a duplicate registration', async () => {
    const adapter = makeAdapter();
    await adapter.schedule(recurring, async () => ({ success: true }));

    await expect(adapter.schedule(recurring, async () => ({ success: true }))).rejects.toThrow(
      /already scheduled/
    );
    await adapter.shutdown();
  });

  it('runs a registered job via trigger(), the external-trigger entry point', async () => {
    const adapter = makeAdapter();
    let seen: JobExecutionContext | undefined;
    await adapter.schedule(recurring, async (context) => {
      seen = context;
      return { success: true, message: 'done' };
    });

    const result = await adapter.trigger('sweep');

    expect(result).toEqual({ success: true, message: 'done' });
    expect(seen?.jobId).toBe('sweep');
    expect(seen?.scope).toBeUndefined();
    await adapter.shutdown();
  });

  it('refuses to trigger or enqueue an unregistered job', async () => {
    const adapter = makeAdapter();

    await expect(adapter.trigger('nope')).rejects.toThrow(/not found/i);
    // Caught here rather than becoming an unroutable message in a dead-letter queue.
    await expect(adapter.enqueue('nope')).rejects.toThrow(/not found/i);
    await adapter.shutdown();
  });

  it('carries tenant scope and payload across the queue, enqueue to execution', async () => {
    // The contract that spans two processes: one enqueues, another consumes and
    // triggers. Scope must survive intact — a job that loses it either fails
    // validateTenantJobContext or, worse, acts without a tenant.
    const producer = makeAdapter();
    await producer.schedule(onDemand, async () => ({ success: true }));

    const scope: Scope = { tenant: Tenant.Organization, id: 'org-42' };
    await producer.enqueue('relay', { scope, payload: { attempt: 3 } });

    const { jobId, data } = parseJobMessage(await receiveOne());

    expect(jobId).toBe('relay');
    expect(data.scope).toEqual(scope);
    expect(data.payload).toEqual({ attempt: 3 });

    // The consumer half, in a fresh adapter as it would be a fresh process.
    const consumer = makeAdapter();
    let seen: JobExecutionContext | undefined;
    await consumer.schedule(onDemand, async (context) => {
      seen = context;
      return { success: true };
    });

    await consumer.trigger(jobId, data);

    expect(seen?.scope).toEqual(scope);
    expect(seen?.payload).toEqual({ attempt: 3 });

    await producer.shutdown();
    await consumer.shutdown();
  }, 30_000);

  it('cancel() unregisters the handler and says the external schedule survives', async () => {
    const adapter = makeAdapter();
    await adapter.schedule(recurring, async () => ({ success: true }));

    await adapter.cancel('sweep');

    expect(await adapter.isScheduled('sweep')).toBe(false);
    await expect(adapter.trigger('sweep')).rejects.toThrow(/not found/i);
    await adapter.shutdown();
  });
});
