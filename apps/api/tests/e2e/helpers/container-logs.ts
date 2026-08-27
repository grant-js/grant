/**
 * Reads the API container's stdout.
 *
 * Boot *ordering* is the part of `server.ts` that HTTP probing cannot see: whether
 * config was validated before anything connected, whether the database was
 * bootstrapped before the port opened, whether jobs were scheduled after it. Those
 * are exactly the invariants an entrypoint refactor can quietly invert, so the
 * oracle reads the log the boot sequence writes.
 *
 * Couples to `docker-compose.e2e.yml`'s container name, which is the supported way
 * to run this suite (`pnpm test:e2e`, AGENTS.md § Testing). Override with
 * `E2E_API_CONTAINER`.
 */

import { execFileSync } from 'node:child_process';

const CONTAINER = process.env.E2E_API_CONTAINER ?? 'grant-e2e-api';

/** True when container logs are readable, so the caller can explain a skip. */
export function containerLogsAvailable(): boolean {
  try {
    execFileSync('docker', ['inspect', '--format', '{{.Id}}', CONTAINER], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

export function containerName(): string {
  return CONTAINER;
}

/**
 * Full stdout+stderr of the API container since it started. The boot lines are
 * near the top and are never rotated away within a test run.
 */
export function readContainerLogs(): string {
  return execFileSync('docker', ['logs', CONTAINER], {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
    encoding: 'utf8',
  });
}

/**
 * Index of the first log line containing `needle`, or -1. Lines are Pino JSON in
 * the container, but substring matching keeps this readable and avoids depending
 * on the transport's shape.
 */
export function firstLineIndexOf(logs: string, needle: string): number {
  return logs.split('\n').findIndex((line) => line.includes(needle));
}

/**
 * Assert that `needles` appear in the log in the given order, each at least once.
 * Returns a human-readable report rather than throwing, so the test can attach it
 * to the failure message.
 */
export function checkLogOrder(
  logs: string,
  needles: readonly string[]
): { ordered: boolean; found: Array<{ needle: string; index: number }> } {
  const found = needles.map((needle) => ({ needle, index: firstLineIndexOf(logs, needle) }));
  const present = found.filter((f) => f.index >= 0);
  const ordered =
    present.length === needles.length &&
    present.every((f, i) => i === 0 || f.index > present[i - 1]!.index);
  return { ordered, found };
}
