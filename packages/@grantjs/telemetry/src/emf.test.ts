import type { ILogger } from '@grantjs/core';
import { describe, expect, it, vi } from 'vitest';

import { EmfTelemetryAdapter, type EmfTelemetryConfig } from './emf';
import { TelemetryFactory } from './factory';

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as ILogger;

const DEFAULTS: EmfTelemetryConfig = {
  namespace: 'Grant/API',
  dimensions: ['method', 'statusCode'],
  metrics: { duration: 'Milliseconds' },
};

/** Captures written lines and parses them, mirroring what CloudWatch would ingest. */
function makeAdapter(config: EmfTelemetryConfig = DEFAULTS) {
  const lines: string[] = [];
  const adapter = new EmfTelemetryAdapter(config, logger, (line) => lines.push(line));
  return { adapter, lines, parsed: () => lines.map((l) => JSON.parse(l)) };
}

const entry = (fields: Record<string, unknown>) => ({
  message: 'Request completed',
  level: 'info',
  timestamp: '2026-08-26T12:00:00.000Z',
  requestId: 'req-1',
  fields,
});

const REQUEST = { method: 'GET', path: '/health', statusCode: 200, duration: 12 };

describe('EmfTelemetryAdapter', () => {
  it('emits one newline-terminated JSON object per call', async () => {
    const { adapter, lines } = makeAdapter();
    await adapter.sendLog(entry(REQUEST));
    expect(lines).toHaveLength(1);
    expect(lines[0].endsWith('\n')).toBe(true);
    expect(lines[0].trimEnd()).not.toContain('\n');
    expect(() => JSON.parse(lines[0])).not.toThrow();
  });

  it('declares the configured namespace, dimensions and metrics', async () => {
    const { adapter, parsed } = makeAdapter();
    await adapter.sendLog(entry(REQUEST));
    const [doc] = parsed();
    expect(doc._aws.Timestamp).toBe(Date.parse('2026-08-26T12:00:00.000Z'));
    expect(doc._aws.CloudWatchMetrics).toEqual([
      {
        Namespace: 'Grant/API',
        Dimensions: [['method', 'statusCode']],
        Metrics: [{ Name: 'duration', Unit: 'Milliseconds' }],
      },
    ]);
    expect(doc.duration).toBe(12);
  });

  it('keeps path as a property but never as a dimension', async () => {
    // The cardinality guard. Request paths embed resource IDs, so promoting path
    // to a dimension would create an unbounded number of billable metrics.
    const { adapter, parsed } = makeAdapter();
    await adapter.sendLog(
      entry({ ...REQUEST, path: '/api/projects/3f7c1b9e-0000-4000-8000-000000000001/sync' })
    );
    const [doc] = parsed();
    expect(doc._aws.CloudWatchMetrics[0].Dimensions[0]).not.toContain('path');
    expect(doc.path).toBe('/api/projects/3f7c1b9e-0000-4000-8000-000000000001/sync');
  });

  it('coerces dimension values to strings', async () => {
    // statusCode arrives as a number; CloudWatch rejects non-string dimension values.
    const { adapter, parsed } = makeAdapter();
    await adapter.sendLog(entry(REQUEST));
    expect(parsed()[0].statusCode).toBe('200');
  });

  it('skips a dimension whose value is absent or empty', async () => {
    const { adapter, parsed } = makeAdapter();
    await adapter.sendLog(entry({ statusCode: 200, duration: 5, method: '' }));
    expect(parsed()[0]._aws.CloudWatchMetrics[0].Dimensions[0]).toEqual(['statusCode']);
  });

  it('skips a non-numeric metric rather than poisoning the whole document', async () => {
    const { adapter, parsed } = makeAdapter({
      ...DEFAULTS,
      metrics: { duration: 'Milliseconds', bogus: 'Count' },
    });
    await adapter.sendLog(entry({ ...REQUEST, bogus: 'not-a-number' }));
    const names = parsed()[0]._aws.CloudWatchMetrics[0].Metrics.map(
      (m: { Name: string }) => m.Name
    );
    expect(names).toEqual(['duration']);
  });

  it('omits _aws entirely when no metric value is present', async () => {
    // A document declaring zero metrics is invalid EMF and would be rejected,
    // taking the log line with it. Degrade to a plain structured log instead.
    const { adapter, parsed } = makeAdapter();
    await adapter.sendLog(entry({ method: 'GET', path: '/health', statusCode: 200 }));
    const [doc] = parsed();
    expect(doc._aws).toBeUndefined();
    expect(doc.message).toBe('Request completed');
    expect(doc.statusCode).toBe('200');
  });

  it('omits _aws when the timestamp is unparseable', async () => {
    const { adapter, parsed } = makeAdapter();
    await adapter.sendLog({ ...entry(REQUEST), timestamp: 'not-a-date' });
    expect(parsed()[0]._aws).toBeUndefined();
  });

  it('carries message, level and requestId as properties', async () => {
    const { adapter, parsed } = makeAdapter();
    await adapter.sendLog(entry(REQUEST));
    const [doc] = parsed();
    expect(doc.message).toBe('Request completed');
    expect(doc.level).toBe('info');
    expect(doc.requestId).toBe('req-1');
  });

  it('never throws and never rejects when writing fails', async () => {
    // Same contract as the other adapters: telemetry must not break the request.
    const adapter = new EmfTelemetryAdapter(DEFAULTS, logger, () => {
      throw new Error('stdout closed');
    });
    await expect(adapter.sendLog(entry(REQUEST))).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it('caps dimensions and metrics at the CloudWatch document limits', async () => {
    const many = (n: number, p: string) => Array.from({ length: n }, (_, i) => `${p}${i}`);
    const { adapter, parsed } = makeAdapter({
      namespace: 'N',
      dimensions: many(40, 'd'),
      metrics: Object.fromEntries(many(120, 'm').map((k) => [k, 'Count'])),
    });
    const fields: Record<string, unknown> = {};
    for (const d of many(40, 'd')) fields[d] = 'v';
    for (const m of many(120, 'm')) fields[m] = 1;
    await adapter.sendLog(entry(fields));
    const cw = parsed()[0]._aws.CloudWatchMetrics[0];
    expect(cw.Dimensions[0]).toHaveLength(30);
    expect(cw.Metrics).toHaveLength(100);
  });

  it('is selected by the factory and works on defaults alone', async () => {
    // `TELEMETRY_PROVIDER=emf` with no other configuration must produce a working
    // adapter, and its default dimensions must not include path.
    const adapter = TelemetryFactory.create({ provider: 'emf' });
    const original = process.stdout.write.bind(process.stdout);
    let captured = '';
    process.stdout.write = ((chunk: string) => {
      captured += chunk;
      return true;
    }) as typeof process.stdout.write;
    try {
      await adapter.sendLog(entry(REQUEST));
    } finally {
      process.stdout.write = original;
    }
    const doc = JSON.parse(captured);
    expect(doc._aws.CloudWatchMetrics[0].Namespace).toBe('Grant/API');
    expect(doc._aws.CloudWatchMetrics[0].Dimensions[0]).toEqual(['method', 'statusCode']);
    expect(doc._aws.CloudWatchMetrics[0].Metrics).toEqual([
      { Name: 'duration', Unit: 'Milliseconds' },
    ]);
  });
});
