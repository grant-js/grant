import type { ILogger, ITelemetryAdapter, TelemetryLogEntry } from '@grantjs/core';

/** CloudWatch rejects a document declaring more than these. */
const MAX_DIMENSIONS = 30;
const MAX_METRICS = 100;

export interface EmfTelemetryConfig {
  /** CloudWatch custom metric namespace, e.g. `Grant/API`. */
  namespace: string;
  /**
   * Fields promoted to metric dimensions, mapped to their unit-less string values.
   *
   * Every distinct combination of dimension values creates a separate billable
   * CloudWatch metric, so this list must stay low-cardinality. `method` and
   * `statusCode` are bounded; `path` is **not** — request paths embed resource
   * IDs, so using it here would create an unbounded number of metrics. Unbounded
   * fields still belong in the document as properties, where they remain
   * queryable in Logs Insights without creating metric series.
   */
  dimensions: string[];
  /** Field name to CloudWatch unit, e.g. `{ duration: 'Milliseconds' }`. */
  metrics: Record<string, string>;
}

/**
 * Writes CloudWatch Embedded Metric Format documents to stdout.
 *
 * EMF is a log *format*, not a separate API: the runtime ships the line and
 * CloudWatch extracts the declared metrics from it. That matters on Lambda,
 * where the CloudWatch adapter's shape does not work — it issues `PutLogEvents`
 * per entry and threads an upload sequence token across calls, and that token is
 * meaningless across frozen containers.
 *
 * Emitting to stdout means no SDK, no sequence token, and nothing to flush
 * before a freeze.
 */
export class EmfTelemetryAdapter implements ITelemetryAdapter {
  constructor(
    private readonly config: EmfTelemetryConfig,
    private readonly logger: ILogger,
    /**
     * Injectable purely so tests can capture output. Defaults to stdout.
     *
     * Writing directly rather than through `ILogger` is deliberate and is the
     * one place this package does so. An EMF document must reach CloudWatch as a
     * bare single-line JSON object; routing it through the structured logger
     * would subject it to level filtering and, with `LOG_PRETTY_PRINT` enabled,
     * to a formatter that destroys the JSON the metric extractor needs.
     */
    private readonly write: (line: string) => void = (line) => {
      process.stdout.write(line);
    }
  ) {}

  sendLog(entry: TelemetryLogEntry): Promise<void> {
    try {
      this.write(`${JSON.stringify(this.buildDocument(entry))}\n`);
    } catch (err) {
      // Same contract as the other adapters: never throw at the call site.
      this.logger.error({ msg: 'EMF sendLog failed', err });
    }
    return Promise.resolve();
  }

  private buildDocument(entry: TelemetryLogEntry): Record<string, unknown> {
    const fields = entry.fields ?? {};

    const timestamp = new Date(entry.timestamp).getTime();
    const document: Record<string, unknown> = {
      ...fields,
      message: entry.message,
      level: entry.level,
      ...(entry.requestId ? { requestId: entry.requestId } : {}),
    };

    // Dimension values must be strings, and CloudWatch drops a document whose
    // dimension value is empty. statusCode arrives as a number, so coerce.
    const dimensions: string[] = [];
    for (const name of this.config.dimensions) {
      const value = fields[name];
      if (value === undefined || value === null || value === '') continue;
      document[name] = String(value);
      dimensions.push(name);
      if (dimensions.length === MAX_DIMENSIONS) break;
    }

    const metrics: Array<{ Name: string; Unit: string }> = [];
    for (const [name, unit] of Object.entries(this.config.metrics)) {
      // A non-numeric value would make CloudWatch reject the whole document,
      // taking the log line with it. Skip rather than poison the record.
      if (typeof fields[name] !== 'number' || !Number.isFinite(fields[name])) continue;
      metrics.push({ Name: name, Unit: unit });
      if (metrics.length === MAX_METRICS) break;
    }

    // A document declaring zero metrics is invalid EMF. Emitting it without the
    // `_aws` block keeps the line as an ordinary structured log, which is still
    // useful in Logs Insights, instead of losing it to a rejected record.
    if (metrics.length === 0 || !Number.isFinite(timestamp) || timestamp <= 0) {
      return document;
    }

    document._aws = {
      Timestamp: timestamp,
      CloudWatchMetrics: [
        {
          Namespace: this.config.namespace,
          Dimensions: [dimensions],
          Metrics: metrics,
        },
      ],
    };

    return document;
  }
}
