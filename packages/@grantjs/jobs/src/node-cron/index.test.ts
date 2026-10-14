import { NotFoundError } from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NodeCronJobAdapter } from './index';

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function adapterWith(handler: Parameters<NodeCronJobAdapter['schedule']>[1]) {
  const adapter = new NodeCronJobAdapter(logger as never);
  await adapter.schedule({ id: 'job-a', schedule: '', enabled: true, enqueueOnly: true }, handler);
  return adapter;
}

describe('NodeCronJobAdapter.enqueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves once the job is accepted, before a long-running handler has finished', async () => {
    const gate = deferred();
    const finished = vi.fn();
    const handler = vi.fn(async () => {
      await gate.promise;
      finished();
      return { success: true };
    });
    const adapter = await adapterWith(handler);

    await expect(adapter.enqueue('job-a')).resolves.toBeUndefined();
    expect(finished).not.toHaveBeenCalled();

    // The handler starts after the current tick, not inside enqueue().
    expect(handler).not.toHaveBeenCalled();
    await new Promise((resolve) => setImmediate(resolve));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(finished).not.toHaveBeenCalled();

    gate.resolve();
    await adapter.shutdown();
    expect(finished).toHaveBeenCalledTimes(1);
  });

  it('passes scope and payload to the handler', async () => {
    const handler = vi.fn(async () => ({ success: true }));
    const adapter = await adapterWith(handler);
    const scope = { tenant: 'accountProject', id: 'a:p' } as never;

    await adapter.enqueue('job-a', { scope, payload: { jobRecordId: 'rec-1' } });
    await adapter.shutdown();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-a', scope, payload: { jobRecordId: 'rec-1' } })
    );
  });

  it('logs a failing handler with the job id (no payload) and does not throw', async () => {
    const failure = new Error('import blew up');
    const adapter = await adapterWith(async () => {
      throw failure;
    });

    await expect(
      adapter.enqueue('job-a', { payload: { secret: 'do-not-log' } })
    ).resolves.toBeUndefined();
    await adapter.shutdown();

    expect(logger.error).toHaveBeenCalledWith(
      { jobId: 'job-a', err: failure },
      'Enqueued job failed'
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('do-not-log');
  });

  it('rejects an unknown job id at enqueue time', async () => {
    const adapter = await adapterWith(async () => ({ success: true }));
    await expect(adapter.enqueue('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('shutdown waits for an accepted job that is still running', async () => {
    const gate = deferred();
    const finished = vi.fn();
    const adapter = await adapterWith(async () => {
      await gate.promise;
      finished();
      return { success: true };
    });
    await adapter.enqueue('job-a');
    await new Promise((resolve) => setImmediate(resolve));

    const shuttingDown = adapter.shutdown();
    await Promise.resolve();
    expect(finished).not.toHaveBeenCalled();

    gate.resolve();
    await shuttingDown;
    expect(finished).toHaveBeenCalledTimes(1);
  });
});

describe('NodeCronJobAdapter.trigger', () => {
  it('still runs the handler and returns its result', async () => {
    const adapter = await adapterWith(async () => ({ success: true, message: 'done' }));
    await expect(adapter.trigger('job-a')).resolves.toEqual({ success: true, message: 'done' });
  });
});
