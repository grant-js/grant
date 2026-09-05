import express, { type Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mocked rather than mutated: the real `config` is readonly, and the route reads only
 * these three values.
 */
const mockConfig = {
  jobs: { eventDispatch: { enabled: true, path: '/events' } },
  app: { jsonBodyLimitBytes: 1_000_000 },
};
vi.mock('@/config', () => ({ config: mockConfig }));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

const getJobAdapter = vi.fn();
vi.mock('@/lib/jobs', () => ({ getJobAdapter }));

const { createEventDispatchRouter } = await import('@/rest/routes/event-dispatch.routes');

function app(): Express {
  const instance = express();
  instance.use(createEventDispatchRouter());
  return instance;
}

/** Only `trigger` is exercised; the route resolves everything else through it. */
function adapterWith(trigger: ReturnType<typeof vi.fn>) {
  getJobAdapter.mockReturnValue({ trigger });
  return trigger;
}

const queueMessage = (jobId: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ jobId, ...extra });

describe('scheduled events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers the job an EventBridge rule names', async () => {
    // The rule sends its constant input and nothing else: a scheduled run carries no
    // tenant scope, which is why these jobs run as the connection owner.
    const trigger = adapterWith(vi.fn().mockResolvedValue({ success: true, data: { swept: 3 } }));

    const response = await request(app()).post('/events').send({ jobId: 'webhook-delivery' });

    expect(response.status).toBe(200);
    expect(trigger).toHaveBeenCalledWith('webhook-delivery', undefined);
    expect(response.body).toMatchObject({ jobId: 'webhook-delivery' });
  });

  it('answers 500 when the job throws, naming the id', async () => {
    // A rule naming a job this process never registered is a deployment fault — the
    // rules and the handlers come from one declaration, so they have drifted.
    adapterWith(vi.fn().mockRejectedValue(new Error('not found')));

    const response = await request(app()).post('/events').send({ jobId: 'ghost' });

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ jobId: 'ghost' });
  });

  it('refuses a payload that is neither shape', async () => {
    const trigger = adapterWith(vi.fn());

    const response = await request(app()).post('/events').send({ nothing: 'useful' });

    expect(response.status).toBe(400);
    expect(trigger).not.toHaveBeenCalled();
  });

  it('answers 503 before the adapter is registered', async () => {
    // `server.ts` initializes jobs after the port opens, and the adapter's readiness
    // signal *is* the open port — so an event can arrive in between. 503 asks the
    // caller back rather than reporting a job that never ran as delivered.
    getJobAdapter.mockReturnValue(null);

    const response = await request(app()).post('/events').send({ jobId: 'webhook-delivery' });

    expect(response.status).toBe(503);
  });
});

describe('queued messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carries tenant scope from the message into the execution context', async () => {
    // The property that spans two processes: the API enqueues with the authenticated
    // scope, this consumes it. A job that loses scope acts without a tenant.
    const scope = { tenant: 'ORGANIZATION', id: 'org-42' };
    const trigger = adapterWith(vi.fn().mockResolvedValue({ success: true }));

    await request(app())
      .post('/events')
      .send({
        Records: [
          { messageId: 'm-1', body: queueMessage('project-sync', { scope, payload: { a: 1 } }) },
        ],
      });

    expect(trigger).toHaveBeenCalledWith('project-sync', { scope, payload: { a: 1 } });
  });

  it('reports only the failed message back for redelivery', async () => {
    // Failing the whole invocation would redeliver the successful messages too, and
    // every job here mutates the database.
    const trigger = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ success: true });
    adapterWith(trigger);

    const response = await request(app())
      .post('/events')
      .send({
        Records: [
          { messageId: 'm-1', body: queueMessage('event-relay') },
          { messageId: 'm-2', body: queueMessage('event-relay') },
          { messageId: 'm-3', body: queueMessage('event-relay') },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ batchItemFailures: [{ itemIdentifier: 'm-2' }] });
    expect(trigger).toHaveBeenCalledTimes(3);
  });

  it('parks a malformed body rather than dropping it silently', async () => {
    adapterWith(vi.fn());

    const response = await request(app())
      .post('/events')
      .send({ Records: [{ messageId: 'm-1', body: 'not json' }] });

    expect(response.body).toEqual({ batchItemFailures: [{ itemIdentifier: 'm-1' }] });
  });
});
