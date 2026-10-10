export type OutputFormat = 'json' | 'text';

export function defaultOutputFormat(): OutputFormat {
  return process.stdout.isTTY ? 'text' : 'json';
}

export function parseOutputFormat(value: string | undefined): OutputFormat {
  if (!value) return defaultOutputFormat();
  const normalized = value.trim().toLowerCase();
  if (normalized === 'json' || normalized === 'text') return normalized;
  if (normalized === 'table') return 'text';
  throw new Error(`Unknown --output format "${value}". Use json or text.`);
}

export function printOutput(data: unknown, format: OutputFormat): void {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (typeof data === 'string') {
    console.log(data);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}
