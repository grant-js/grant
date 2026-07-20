#!/usr/bin/env node
/**
 * Benchmark permission evaluation via POST /api/auth/is-authorized.
 *
 * Usage:
 *   node scripts/benchmarks/permission-evaluation.mjs [--credentials path] [--base-url url] [--runs 20]
 *
 * Env:
 *   GRANT_API_BASE_URL — default http://localhost:4000
 *   GRANT_BENCHMARK_CREDENTIALS — path to API key credentials JSON
 *
 * Credentials JSON may include an optional `checks` array:
 *   {
 *     "clientId": "...",
 *     "clientSecret": "...",
 *     "scope": { "tenant": "accountProject", "id": "..." },
 *     "checks": [
 *       {
 *         "name": "allow-project-query",
 *         "permission": { "resource": "Project", "action": "Query" },
 *         "expectAuthorized": true
 *       }
 *     ]
 *   }
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const DEFAULT_CHECKS = [
  {
    name: 'allow: Project.Query',
    permission: { resource: 'Project', action: 'Query' },
    expectAuthorized: true,
  },
  {
    name: 'allow: Permission.Query',
    permission: { resource: 'Permission', action: 'Query' },
    expectAuthorized: true,
  },
  {
    name: 'allow: Role.Query',
    permission: { resource: 'Role', action: 'Query' },
    expectAuthorized: true,
  },
  {
    name: 'deny: unknown resource',
    permission: { resource: 'nonexistent', action: 'read' },
    expectAuthorized: false,
  },
  {
    name: 'deny: CDM document.list (ungranted)',
    permission: { resource: 'document', action: 'documentlist' },
    expectAuthorized: false,
  },
];

function parseArgs(argv) {
  const args = {
    runs: 20,
    baseUrl: process.env.GRANT_API_BASE_URL ?? 'http://localhost:4000',
    throughput: 30,
    concurrency: 3,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--') continue;
    if (argv[i] === '--credentials') args.credentialsPath = argv[++i];
    else if (argv[i] === '--base-url') args.baseUrl = argv[++i];
    else if (argv[i] === '--runs') args.runs = Number(argv[++i]);
    else if (argv[i] === '--throughput') args.throughput = Number(argv[++i]);
    else if (argv[i] === '--concurrency') args.concurrency = Number(argv[++i]);
  }
  args.credentialsPath ??=
    process.env.GRANT_BENCHMARK_CREDENTIALS ??
    join(
      process.env.HOME ?? '',
      'Downloads/api-key-credentials-eac11420-ce3e-43e1-91b5-bafcada6a8ed.json'
    );
  return args;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function summarizeDurations(durations) {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    p50Ms: Math.round(percentile(sorted, 50)),
    p95Ms: Math.round(percentile(sorted, 95)),
    minMs: Math.round(sorted[0] ?? 0),
    maxMs: Math.round(sorted[sorted.length - 1] ?? 0),
    meanMs: Math.round(sorted.reduce((a, b) => a + b, 0) / Math.max(sorted.length, 1)),
  };
}

async function exchangeToken(baseUrl, credentials) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/auth/token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      scope: credentials.scope,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const body = JSON.parse(text);
  const accessToken = body.data?.accessToken ?? body.accessToken;
  if (!accessToken) throw new Error('No accessToken in token response');
  return accessToken;
}

async function isAuthorized(baseUrl, accessToken, permission, context, scope) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/auth/is-authorized`;
  const start = performance.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      permission,
      context,
      ...(scope ? { scope } : {}),
    }),
  });
  const text = await res.text();
  const durationMs = performance.now() - start;
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { errors: [{ message: 'Invalid JSON response' }] };
  }
  const data = json.data ?? json;
  const errorMessage =
    !res.ok || json.success === false
      ? String(json.message ?? json.errors?.[0]?.message ?? text.slice(0, 200))
      : null;
  return {
    durationMs,
    bytes: Buffer.byteLength(text, 'utf8'),
    ok: res.ok && json.success !== false && errorMessage == null,
    status: res.status,
    authorized: Boolean(data?.authorized),
    reason: data?.reason ?? null,
    errorMessage,
  };
}

async function runColdSeries(baseUrl, accessToken, check, runs, scope) {
  const durations = [];
  let last = null;
  for (let i = 0; i < runs; i++) {
    // Unique context.resource.id busts AuthHandler authorization cache → real evaluation.
    const sample = await isAuthorized(
      baseUrl,
      accessToken,
      check.permission,
      { resource: { id: `bench-cold-${check.name}-${i}-${Date.now()}` } },
      scope
    );
    durations.push(sample.durationMs);
    last = sample;
  }
  const stats = summarizeDurations(durations);
  const expectOk =
    check.expectAuthorized == null ? true : last?.authorized === check.expectAuthorized;
  return {
    name: check.name,
    mode: 'cold',
    permission: check.permission,
    expectAuthorized: check.expectAuthorized ?? null,
    runs,
    ...stats,
    lastAuthorized: last?.authorized ?? false,
    lastReason: last?.reason ?? null,
    lastBytes: last?.bytes ?? 0,
    lastOk: Boolean(last?.ok && expectOk),
    lastErrorMessage: last?.ok
      ? expectOk
        ? null
        : `expected authorized=${check.expectAuthorized}, got ${last?.authorized}`
      : (last?.errorMessage ?? null),
  };
}

async function runWarmSeries(baseUrl, accessToken, check, runs, scope) {
  const context = { resource: { id: `bench-warm-${check.name}` } };
  // Prime cache
  await isAuthorized(baseUrl, accessToken, check.permission, context, scope);

  const durations = [];
  let last = null;
  for (let i = 0; i < runs; i++) {
    const sample = await isAuthorized(
      baseUrl,
      accessToken,
      check.permission,
      context,
      scope
    );
    durations.push(sample.durationMs);
    last = sample;
  }
  const stats = summarizeDurations(durations);
  const expectOk =
    check.expectAuthorized == null ? true : last?.authorized === check.expectAuthorized;
  return {
    name: `${check.name} (cached)`,
    mode: 'warm',
    permission: check.permission,
    expectAuthorized: check.expectAuthorized ?? null,
    runs,
    ...stats,
    lastAuthorized: last?.authorized ?? false,
    lastReason: last?.reason ?? null,
    lastBytes: last?.bytes ?? 0,
    lastOk: Boolean(last?.ok && expectOk),
    lastErrorMessage: last?.ok
      ? expectOk
        ? null
        : `expected authorized=${check.expectAuthorized}, got ${last?.authorized}`
      : (last?.errorMessage ?? null),
  };
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function runThroughput(baseUrl, accessToken, check, total, scope, concurrency = 5) {
  const started = performance.now();
  const samples = await mapPool(Array.from({ length: total }, (_, i) => i), concurrency, (i) =>
    isAuthorized(
      baseUrl,
      accessToken,
      check.permission,
      { resource: { id: `bench-tp-${i}-${Date.now()}` } },
      scope
    )
  );
  const wallMs = performance.now() - started;
  const durations = samples.map((s) => s.durationMs);
  const stats = summarizeDurations(durations);
  const okCount = samples.filter((s) => s.ok).length;
  return {
    name: `throughput ×${total} (concurrency ${concurrency}): ${check.name}`,
    mode: 'throughput',
    permission: check.permission,
    concurrency,
    total,
    wallMs: Math.round(wallMs),
    checksPerSec: Math.round((total / wallMs) * 1000),
    ...stats,
    okCount,
    lastOk: okCount === total,
    lastAuthorized: samples[samples.length - 1]?.authorized ?? false,
    lastReason: samples[samples.length - 1]?.reason ?? null,
    lastBytes: samples[samples.length - 1]?.bytes ?? 0,
    lastErrorMessage:
      okCount === total ? null : `${total - okCount}/${total} requests failed`,
  };
}

function toMarkdown(results, meta) {
  const coldWarm = results.filter((r) => r.mode === 'cold' || r.mode === 'warm');
  const throughput = results.filter((r) => r.mode === 'throughput');
  const lines = [
    `# Permission evaluation benchmark`,
    '',
    `- Date: ${meta.date}`,
    `- Base URL: ${meta.baseUrl}`,
    `- Scope: \`${meta.scopeId}\` (${meta.scopeTenant})`,
    `- Runs per check: ${meta.runs}`,
    `- Endpoint: \`POST /api/auth/is-authorized\``,
    '',
    'Cold runs vary `context.resource.id` to bypass the authorization result cache. Warm runs reuse a fixed context after a prime request.',
    '',
    '| Check | mode | p50 | p95 | min | max | mean | authorized | reason | ok |',
    '|-------|------|-----|-----|-----|-----|------|------------|--------|-----|',
  ];
  for (const r of coldWarm) {
    lines.push(
      `| ${r.name} | ${r.mode} | ${r.p50Ms} | ${r.p95Ms} | ${r.minMs} | ${r.maxMs} | ${r.meanMs} | ${r.lastAuthorized} | ${r.lastReason ?? '—'} | ${r.lastOk ? 'yes' : 'no'} |`
    );
  }
  if (throughput.length > 0) {
    lines.push(
      '',
      '## Throughput (parallel cold checks)',
      '',
      '| Check | total | concurrency | wall (ms) | checks/s | p50 | p95 | ok |',
      '|-------|-------|-------------|-----------|----------|-----|-----|-----|'
    );
    for (const r of throughput) {
      lines.push(
        `| ${r.name} | ${r.total} | ${r.concurrency} | ${r.wallMs} | ${r.checksPerSec} | ${r.p50Ms} | ${r.p95Ms} | ${r.lastOk ? 'yes' : 'no'} |`
      );
    }
  }
  const failed = results.filter((r) => !r.lastOk);
  if (failed.length > 0) {
    lines.push('', '## Errors', '');
    for (const r of failed) {
      lines.push(`- **${r.name}**: ${r.lastErrorMessage ?? '(no message)'}`);
    }
  }
  lines.push(
    '',
    '## Targets',
    '',
    '- Cold evaluation p95 < 50ms',
    '- Warm (cached) p95 < 15ms',
    '- Expected allow/deny outcomes match',
    '- Zero HTTP errors'
  );
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const credentials = JSON.parse(readFileSync(args.credentialsPath, 'utf8'));
  const scope = credentials.scope;
  const checks = Array.isArray(credentials.checks) && credentials.checks.length > 0
    ? credentials.checks
    : DEFAULT_CHECKS;

  console.log(
    `Benchmarking ${args.baseUrl} is-authorized (${args.runs} runs/check, ${checks.length} checks)...`
  );
  const accessToken = await exchangeToken(args.baseUrl, credentials);

  const results = [];
  for (const check of checks) {
    process.stdout.write(`  cold  ${check.name}... `);
    const cold = await runColdSeries(args.baseUrl, accessToken, check, args.runs, scope);
    results.push(cold);
    console.log(
      `p50=${cold.p50Ms}ms p95=${cold.p95Ms}ms authorized=${cold.lastAuthorized} ${cold.lastReason ?? ''}`
    );

    process.stdout.write(`  warm  ${check.name}... `);
    const warm = await runWarmSeries(args.baseUrl, accessToken, check, args.runs, scope);
    results.push(warm);
    console.log(`p50=${warm.p50Ms}ms p95=${warm.p95Ms}ms`);
  }

  const throughputCheck = checks.find((c) => c.expectAuthorized === true) ?? checks[0];
  if (args.throughput > 0 && throughputCheck) {
    process.stdout.write(
      `  throughput ×${args.throughput} (concurrency ${args.concurrency})... `
    );
    const tp = await runThroughput(
      args.baseUrl,
      accessToken,
      throughputCheck,
      args.throughput,
      scope,
      args.concurrency
    );
    results.push(tp);
    console.log(`${tp.checksPerSec} checks/s (wall ${tp.wallMs}ms)`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const outDir = join(ROOT, 'docs/benchmarks');
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, `authz-${date}.json`);
  const mdPath = join(outDir, `authz-${date}.md`);
  const meta = {
    date: new Date().toISOString(),
    baseUrl: args.baseUrl,
    scopeId: scope.id,
    scopeTenant: scope.tenant,
    runs: args.runs,
    throughput: args.throughput,
    concurrency: args.concurrency,
    endpoint: 'POST /api/auth/is-authorized',
  };
  writeFileSync(jsonPath, JSON.stringify({ meta, results }, null, 2));
  writeFileSync(mdPath, toMarkdown(results, meta));
  console.log(`\nWrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
