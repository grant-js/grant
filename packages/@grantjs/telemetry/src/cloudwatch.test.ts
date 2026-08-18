import type { ILogger } from '@grantjs/core';
import { ConfigurationError } from '@grantjs/core';
import { describe, expect, it, vi } from 'vitest';

import { CloudWatchTelemetryAdapter } from './cloudwatch';

/**
 * Coverage for the adapter found broken in pass 6 slice 2 (`require()` inside a
 * `"type": "module"` package, so every sendLog threw `ReferenceError`).
 *
 * **This file cannot be the regression test for that defect, and pretending
 * otherwise would be worse than having no test.** Vitest runs sources through
 * vite's transform, which supplies CJS interop: `typeof require` is `'function'`
 * inside a test, where it is `undefined` in the ESM output Node actually runs.
 * Reverting the fix to `require()` and re-running this suite leaves it green —
 * verified, not assumed.
 *
 * What guards the defect instead:
 *   1. `@typescript-eslint/no-require-imports`, which now runs on this package
 *      for the first time (slice 2 added the missing lint script) and errors on
 *      exactly this construct.
 *   2. `pnpm build` + executing `dist/` — the only runtime reproduction. Done
 *      manually in slice 2; see the stack plan's C3 and C4.
 *
 * The tests below cover what a unit test legitimately can: config validation,
 * the timestamp guard, and that the dynamic import resolves at all.
 */

interface Recorded {
  msg?: string;
  err?: unknown;
}

const recordingLogger = (sink: Recorded[]): ILogger => {
  const logger: ILogger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn((o: unknown) => sink.push(o as Recorded)),
    error: vi.fn((o: unknown) => sink.push(o as Recorded)),
    fatal: vi.fn(),
    child: () => logger,
  } as unknown as ILogger;
  return logger;
};

const entry = () => ({
  message: 'hello',
  level: 'info',
  timestamp: new Date().toISOString(),
});

describe('constructor', () => {
  it('rejects a config without region', () => {
    expect(
      () => new CloudWatchTelemetryAdapter({ region: '', logGroupName: 'g' }, recordingLogger([]))
    ).toThrow(ConfigurationError);
  });

  it('rejects a config without logGroupName', () => {
    expect(
      () =>
        new CloudWatchTelemetryAdapter(
          { region: 'us-east-1', logGroupName: '' },
          recordingLogger([])
        )
    ).toThrow(ConfigurationError);
  });
});

describe('vitest cannot reproduce the production module system', () => {
  /**
   * Pinned deliberately. If this ever asserts `'undefined'`, vitest has started
   * running sources as true ESM and a real regression test for C3 becomes
   * possible — at which point write it and delete this.
   */
  it('has require() available, which production ESM does not', () => {
    expect(typeof require).toBe('function');
  });
});

describe('sendLog', () => {
  it('swallows delivery failures rather than throwing', async () => {
    const sink: Recorded[] = [];
    const adapter = new CloudWatchTelemetryAdapter(
      { region: 'us-east-1', logGroupName: 'probe' },
      recordingLogger(sink)
    );

    await expect(adapter.sendLog(entry())).resolves.toBeUndefined();
  });

  it('loads the AWS SDK rather than reporting it missing', async () => {
    const sink: Recorded[] = [];
    const adapter = new CloudWatchTelemetryAdapter(
      { region: 'us-east-1', logGroupName: 'probe' },
      recordingLogger(sink)
    );

    await adapter.sendLog(entry());

    // The "client not available" message is only emitted when the dynamic
    // import itself fails. Reaching AWS and failing on credentials/network is
    // fine here; failing to load the module is the regression.
    expect(sink.map((r) => r.msg)).not.toContain(
      'CloudWatch Logs client not available; install @aws-sdk/client-cloudwatch-logs'
    );
  });

  it('rejects an invalid timestamp before touching the network', async () => {
    const sink: Recorded[] = [];
    const adapter = new CloudWatchTelemetryAdapter(
      { region: 'us-east-1', logGroupName: 'probe' },
      recordingLogger(sink)
    );

    await adapter.sendLog({ message: 'x', level: 'info', timestamp: 'not-a-date' });

    expect(sink.map((r) => r.msg)).toContain('Telemetry: invalid timestamp');
  });
});
