/**
 * The oracle for `SCHEDULED_JOBS`.
 *
 * The brief's criterion is that EventBridge rules come from "the same job id/schedule
 * source the API reads — no hand-maintained parallel list", because a drifted cron
 * list fails silently and surfaces hours later as "a sweep stopped running". A CDK app
 * cannot import `apps/api`'s configuration graph at synth time, so the table is a copy
 * and this file is what makes it a *checked* copy — the same answer gate 1 gave for
 * routing, applied to schedules.
 *
 * Three sources are read, all as text:
 *
 *   - `apps/api/src/jobs/*.job.ts`   which jobs exist and which carry a schedule
 *   - `apps/api/src/config/env.config.ts`   which env key backs each job's schedule
 *   - `packages/@grantjs/env/src/schema.ts`   that key's default
 *
 * A job added, renamed, made enqueue-only, or repointed at a different key fails here
 * rather than at 03:00 on a Tuesday.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SCHEDULED_JOBS } from './scheduled-jobs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (relativePath: string) => readFileSync(`${repoRoot}${relativePath}`, 'utf8');

const JOBS_DIR = 'apps/api/src/jobs';
const CONSTANTS_DIR = 'apps/api/src/constants';

/** Extracts the balanced `{ … }` block that starts at or after `from`. */
function braceBlock(source: string, from: number): string {
  const start = source.indexOf('{', from);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unbalanced braces from index ${from}`);
}

/** `export const WEBHOOK_DELIVERY_JOB_ID = 'webhook-delivery';` across the constants. */
function jobIdConstants(): Map<string, string> {
  const constants = new Map<string, string>();
  for (const file of readdirSync(`${repoRoot}${CONSTANTS_DIR}`)) {
    if (!file.endsWith('.ts')) continue;
    const source = read(`${CONSTANTS_DIR}/${file}`);
    for (const match of source.matchAll(/export const (\w+)\s*=\s*'([^']+)'/g)) {
      constants.set(match[1] as string, match[2] as string);
    }
  }
  return constants;
}

interface ParsedJob {
  readonly file: string;
  readonly id: string;
  /** The expression assigned to `schedule:`, verbatim. `''` marks enqueue-only. */
  readonly scheduleExpression: string;
  readonly enabledExpression: string;
}

/** Every `ScheduledJob` literal declared under `apps/api/src/jobs`. */
function parseJobs(): ParsedJob[] {
  const constants = jobIdConstants();
  const jobs: ParsedJob[] = [];

  for (const file of readdirSync(`${repoRoot}${JOBS_DIR}`)) {
    if (!file.endsWith('.job.ts')) continue;

    const source = read(`${JOBS_DIR}/${file}`);
    const configIndex = source.indexOf('readonly config: ScheduledJob');
    expect(configIndex, `${file} declares a ScheduledJob config`).toBeGreaterThan(-1);

    const block = braceBlock(source, configIndex);
    const idMatch = /\bid:\s*(?:'([^']+)'|(\w+))/.exec(block);
    const scheduleMatch = /\bschedule:\s*([^,\n]+)/.exec(block);
    const enabledMatch = /\benabled:\s*([^,\n]+)/.exec(block);

    expect(idMatch, `${file} declares an id`).not.toBeNull();
    expect(scheduleMatch, `${file} declares a schedule`).not.toBeNull();
    expect(enabledMatch, `${file} declares an enabled flag`).not.toBeNull();

    const literal = (idMatch as RegExpExecArray)[1];
    const symbol = (idMatch as RegExpExecArray)[2];
    const id = literal ?? constants.get(symbol as string);
    expect(id, `${file}: job id ${symbol} resolves to a literal`).toBeDefined();

    jobs.push({
      file,
      id: id as string,
      scheduleExpression: (scheduleMatch as RegExpExecArray)[1]!.trim(),
      enabledExpression: (enabledMatch as RegExpExecArray)[1]!.trim(),
    });
  }

  return jobs;
}

/**
 * Resolves `config.jobs.webhookDelivery.schedule` to `JOBS_WEBHOOK_DELIVERY_SCHEDULE`.
 *
 * Walks the same two hops the application does: `config`'s top-level key names a
 * `*_CONFIG` object, and the property inside it is assigned from `env.SOME_KEY`.
 */
function resolveEnvKey(configPath: string): string | undefined {
  const source = read('apps/api/src/config/env.config.ts');
  const segments = configPath.split('.');
  if (segments[0] !== 'config') return undefined;

  const exported = braceBlock(source, source.indexOf('export const config ='));
  const topMatch = new RegExp(`\\b${segments[1]}:\\s*(\\w+)`).exec(exported);
  if (!topMatch) return undefined;

  let block = braceBlock(source, source.indexOf(`const ${topMatch[1]} =`));

  // Three segments means a nested group (`jobs.webhookDelivery.schedule`); two means
  // the property sits directly on the config object (`demoMode.dbRefreshSchedule`).
  const property = segments[segments.length - 1] as string;
  if (segments.length === 4) {
    const groupIndex = block.search(new RegExp(`\\b${segments[2]}:\\s*\\{`));
    if (groupIndex === -1) return undefined;
    block = braceBlock(block, groupIndex);
  }

  return new RegExp(`\\b${property}:\\s*env\\.(\\w+)`).exec(block)?.[1];
}

/** `JOBS_DATA_RETENTION_SCHEDULE: optionalString('0 2 * * *')` and its boolean twin. */
function envDefaults(): Map<string, string> {
  const source = read('packages/@grantjs/env/src/schema.ts');
  const defaults = new Map<string, string>();
  for (const match of source.matchAll(/(\w+):\s*optionalString\('([^']*)'\)/g)) {
    defaults.set(match[1] as string, match[2] as string);
  }
  for (const match of source.matchAll(/(\w+):\s*optionalBoolean\((true|false)\)/g)) {
    defaults.set(match[1] as string, match[2] as string);
  }
  return defaults;
}

describe('SCHEDULED_JOBS', () => {
  const parsed = parseJobs();
  const defaults = envDefaults();

  it('parses the API job sources it is checked against', () => {
    // A parser that silently stops matching would make every assertion below vacuous.
    // A floor rather than an exact count, so adding a job is not a test change.
    expect(parsed.length).toBeGreaterThanOrEqual(8);
    expect(parsed.every((job) => job.id.length > 0)).toBe(true);
  });

  it('declares exactly the jobs that carry a schedule', () => {
    const scheduled = parsed
      .filter((job) => job.scheduleExpression !== "''")
      .map((job) => job.id)
      .sort();

    expect(scheduled).toEqual([...SCHEDULED_JOBS].map((job) => job.id).sort());
  });

  it('is six rules — five production plus one demo-gated', () => {
    // The count the acceptance criterion names. Asserted here as well as against the
    // template so a table edit fails before a synth is read.
    expect(SCHEDULED_JOBS).toHaveLength(6);
    expect(SCHEDULED_JOBS.filter((job) => job.enabledEnvKey === 'DEMO_MODE_ENABLED')).toHaveLength(
      1
    );
  });

  it('names no enqueue-only job', () => {
    // `event-relay` and `project-sync` have no recurrence to provision. A rule for
    // either would fire work that is supposed to arrive with a tenant scope attached.
    const enqueueOnly = parsed
      .filter((job) => job.scheduleExpression === "''")
      .map((job) => job.id);

    expect(enqueueOnly.length).toBeGreaterThan(0);
    for (const id of enqueueOnly) {
      expect(SCHEDULED_JOBS.map((job) => job.id)).not.toContain(id);
    }
  });

  it.each([...SCHEDULED_JOBS])('$id reads the schedule key this table names', (job) => {
    const declared = parsed.find((entry) => entry.id === job.id) as ParsedJob;
    expect(resolveEnvKey(declared.scheduleExpression)).toBe(job.scheduleEnvKey);
  });

  it.each([...SCHEDULED_JOBS])('$id reads the enabled key this table names', (job) => {
    const declared = parsed.find((entry) => entry.id === job.id) as ParsedJob;
    expect(resolveEnvKey(declared.enabledExpression)).toBe(job.enabledEnvKey);
  });

  it.each([...SCHEDULED_JOBS])('$id quotes the current defaults for both keys', (job) => {
    // The rule is provisioned from these when a deployment overrides nothing, so a
    // drifted default is a rule that fires on a schedule the application does not
    // believe it has.
    expect(defaults.get(job.scheduleEnvKey)).toBe(job.defaultSchedule);
    expect(defaults.get(job.enabledEnvKey)).toBe(String(job.enabledByDefault));
  });
});
