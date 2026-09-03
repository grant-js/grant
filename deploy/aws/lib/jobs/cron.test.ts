import { describe, expect, it } from 'vitest';

import { toEventBridgeCron } from './cron';
import { SCHEDULED_JOBS } from './scheduled-jobs';

describe('toEventBridgeCron', () => {
  it('appends the year field and unspecifies day-of-week', () => {
    expect(toEventBridgeCron('0 2 * * *', 'test')).toBe('cron(0 2 * * ? *)');
  });

  it('unspecifies day-of-month when day-of-week is constrained', () => {
    // Both fields wildcard is illegal in EventBridge, so exactly one has to yield.
    expect(toEventBridgeCron('30 3 * * 1', 'test')).toBe('cron(30 3 ? * 2 *)');
  });

  it('shifts numeric days by one, which is the whole reason this exists', () => {
    // Unix Sunday is 0, EventBridge Sunday is 1. Passing the field through unchanged
    // produces a rule that deploys, fires, and fires on the wrong day.
    expect(toEventBridgeCron('0 0 * * 0', 'test')).toBe('cron(0 0 ? * 1 *)');
    // node-cron treats 7 as Sunday too.
    expect(toEventBridgeCron('0 0 * * 7', 'test')).toBe('cron(0 0 ? * 1 *)');
    expect(toEventBridgeCron('0 0 * * 6', 'test')).toBe('cron(0 0 ? * 7 *)');
  });

  it('shifts every element of a list or a range', () => {
    expect(toEventBridgeCron('0 0 * * 1-5', 'test')).toBe('cron(0 0 ? * 2-6 *)');
    expect(toEventBridgeCron('0 0 * * 1,3,5', 'test')).toBe('cron(0 0 ? * 2,4,6 *)');
  });

  it('leaves a step interval alone', () => {
    // The number after the slash counts days, it does not name one. Shifting it would
    // turn "every second day" into "every third".
    expect(toEventBridgeCron('0 0 * * 0/2', 'test')).toBe('cron(0 0 ? * 1/2 *)');
    expect(toEventBridgeCron('0 0 */2 * *', 'test')).toBe('cron(0 0 */2 * ? *)');
  });

  it('passes day names through, since both syntaxes spell them the same', () => {
    expect(toEventBridgeCron('0 0 * * MON', 'test')).toBe('cron(0 0 ? * MON *)');
  });

  it('refuses a six-field expression rather than dropping the seconds', () => {
    expect(() => toEventBridgeCron('*/30 * * * * *', 'sweep')).toThrow(/once a minute/);
  });

  it('refuses an expression that constrains both day fields', () => {
    // EventBridge cannot express it, and silently dropping one would change the
    // schedule to something nobody configured.
    expect(() => toEventBridgeCron('0 0 1 * 1', 'sweep')).toThrow(/unspecified/);
  });

  it('names the job in every failure', () => {
    expect(() => toEventBridgeCron('nonsense', 'webhook-delivery')).toThrow(/webhook-delivery/);
  });

  it('refuses a day-of-week outside the Unix range', () => {
    expect(() => toEventBridgeCron('0 0 * * 9', 'sweep')).toThrow(/out of range/);
  });

  it.each([...SCHEDULED_JOBS])('translates $id’s default schedule', (job) => {
    // Every shipped default must survive translation, or a green-field deploy fails at
    // synth on configuration nobody touched.
    expect(toEventBridgeCron(job.defaultSchedule, job.id)).toMatch(/^cron\(.+\)$/);
  });
});
