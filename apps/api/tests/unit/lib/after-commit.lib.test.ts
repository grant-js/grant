import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import {
  createAfterCommitQueue,
  createImmediateAfterCommit,
  holdResponseEndUntil,
} from '@/lib/after-commit.lib';

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('createAfterCommitQueue', () => {
  it('runs nothing until run() is called, then awaits every callback', async () => {
    const gate = deferred();
    const done = vi.fn();
    const queue = createAfterCommitQueue(logger as never);

    queue.schedule(async () => {
      await gate.promise;
      done();
    });
    expect(done).not.toHaveBeenCalled();

    const running = queue.run();
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();

    gate.resolve();
    await running;
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('logs a failing callback without rejecting or skipping the others', async () => {
    const queue = createAfterCommitQueue(logger as never);
    const after = vi.fn();
    queue.schedule(() => Promise.reject(new Error('boom')));
    queue.schedule(after);

    await expect(queue.run()).resolves.toBeUndefined();

    expect(after).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.objectContaining({ message: 'boom' }) },
      'scheduleAfterCommit callback failed'
    );
  });
});

describe('createImmediateAfterCommit', () => {
  it('starts callbacks at once and settled() waits for them', async () => {
    const gate = deferred();
    const started = vi.fn();
    const finished = vi.fn();
    const after = createImmediateAfterCommit(logger as never);

    after.schedule(async () => {
      started();
      await gate.promise;
      finished();
    });
    await Promise.resolve();
    expect(started).toHaveBeenCalledTimes(1);

    const settled = after.settled();
    gate.resolve();
    await settled;
    expect(finished).toHaveBeenCalledTimes(1);
  });
});

describe('holdResponseEndUntil', () => {
  function fakeResponse() {
    const end = vi.fn();
    return { res: { end } as unknown as Response, end };
  }

  it('flushes the response only once the gate has settled', async () => {
    const gate = deferred();
    const { res, end } = fakeResponse();
    holdResponseEndUntil(res, () => gate.promise);

    res.end('body', 'utf8');
    await Promise.resolve();
    expect(end).not.toHaveBeenCalled();

    gate.resolve();
    await gate.promise;
    await Promise.resolve();
    expect(end).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledWith('body', 'utf8');
  });

  it('lets abandon() replace a held response', async () => {
    const gate = deferred();
    const { res, end } = fakeResponse();
    const hold = holdResponseEndUntil(res, () => gate.promise);

    res.end('first');
    hold.abandon();
    res.end('error body');
    gate.resolve();
    await gate.promise;
    await Promise.resolve();

    expect(end).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledWith('error body');
  });
});
