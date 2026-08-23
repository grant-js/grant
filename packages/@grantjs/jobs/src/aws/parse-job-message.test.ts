import { describe, expect, it } from 'vitest';

import { parseJobMessage } from './index';

/**
 * Pure parsing of the queue wire format — no infrastructure, so it belongs in the
 * unit lane even though its counterpart `enqueue()` needs a real queue.
 *
 * This is the contract between two processes: one enqueues, another consumes.
 * A malformed body must fail loudly rather than produce a partial execution
 * context, because a job that runs with a missing scope either trips
 * validateTenantJobContext or acts without a tenant.
 */
describe('parseJobMessage', () => {
  it('rejects malformed bodies rather than producing a partial context', () => {
    expect(() => parseJobMessage('not json')).toThrow(/not valid JSON/);
    expect(() => parseJobMessage('[]')).toThrow(/must include a non-empty jobId/);
    expect(() => parseJobMessage('{"jobId":""}')).toThrow(/non-empty jobId/);
    expect(() => parseJobMessage('{"payload":1}')).toThrow(/non-empty jobId/);
  });

  it('omits absent optional fields instead of setting them undefined', () => {
    expect(parseJobMessage('{"jobId":"a"}')).toEqual({ jobId: 'a', data: {} });
  });
});
