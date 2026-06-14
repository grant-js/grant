#!/usr/bin/env node
/**
 * Benchmark RBAC list GraphQL queries against a running Grant API instance.
 *
 * Usage:
 *   node scripts/benchmarks/rbac-list-queries.mjs [--credentials path] [--base-url url] [--runs 5]
 *
 * Env:
 *   GRANT_API_BASE_URL — default http://localhost:4000
 *   GRANT_BENCHMARK_CREDENTIALS — path to API key credentials JSON
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

function parseArgs(argv) {
  const args = { runs: 5, baseUrl: process.env.GRANT_API_BASE_URL ?? 'http://localhost:4000' };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--credentials') args.credentialsPath = argv[++i];
    else if (argv[i] === '--base-url') args.baseUrl = argv[++i];
    else if (argv[i] === '--runs') args.runs = Number(argv[++i]);
  }
  args.credentialsPath ??=
    process.env.GRANT_BENCHMARK_CREDENTIALS ??
    join(process.env.HOME ?? '', 'Downloads/api-key-credentials-eac11420-ce3e-43e1-91b5-bafcada6a8ed.json');
  return args;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
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

async function graphql(baseUrl, accessToken, operationName, query, variables) {
  const url = `${baseUrl.replace(/\/$/, '')}/graphql`;
  const start = performance.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ operationName, variables, query }),
  });
  const text = await res.text();
  const durationMs = performance.now() - start;
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { errors: [{ message: 'Invalid JSON response' }], raw: text.slice(0, 200) };
  }
  const errorCount = Array.isArray(json.errors) ? json.errors.length : 0;
  const firstErrorMessage =
    errorCount > 0 && json.errors[0]?.message ? String(json.errors[0].message) : null;
  return {
    durationMs,
    bytes: Buffer.byteLength(text, 'utf8'),
    errorCount,
    firstErrorMessage,
    ok: res.ok && errorCount === 0,
    status: res.status,
  };
}

const BENCHMARKS = [
  {
    name: 'GetRoles (nested groups.tags)',
    operationName: 'GetRoles',
    variables: (scope) => ({
      scope,
      page: 1,
      limit: 50,
      search: '',
      sort: { field: 'name', order: 'ASC' },
      tagIds: [],
    }),
    query: `query GetRoles($scope: Scope!, $page: Int, $limit: Int, $sort: RoleSortInput, $search: String, $tagIds: [ID!]) {
      roles(scope: $scope, page: $page, limit: $limit, sort: $sort, search: $search, tagIds: $tagIds) {
        roles { id name description groups { id name tags { id name color isPrimary } } tags { id name color isPrimary } }
        totalCount hasNextPage
      }
    }`,
  },
  {
    name: 'GetGroups (nested permissions.tags)',
    operationName: 'GetGroups',
    variables: (scope) => ({
      scope,
      page: 1,
      limit: 50,
      search: '',
      sort: { field: 'name', order: 'ASC' },
      tagIds: [],
    }),
    query: `query GetGroups($scope: Scope!, $page: Int, $limit: Int, $sort: GroupSortInput, $search: String, $tagIds: [ID!]) {
      groups(scope: $scope, page: $page, limit: $limit, sort: $sort, search: $search, tagIds: $tagIds) {
        groups { id name permissions { id name action tags { id name color isPrimary } } tags { id name color isPrimary } }
        totalCount hasNextPage
      }
    }`,
  },
  {
    name: 'GetUsers (nested roles.tags)',
    operationName: 'GetUsers',
    variables: (scope) => ({
      scope,
      page: 1,
      limit: 50,
      search: '',
      sort: { field: 'name', order: 'ASC' },
      tagIds: [],
    }),
    query: `query GetUsers($scope: Scope!, $page: Int, $limit: Int, $sort: UserSortInput, $search: String, $tagIds: [ID!]) {
      users(scope: $scope, page: $page, limit: $limit, sort: $sort, search: $search, tagIds: $tagIds) {
        users { id name roles { id name tags { id name color isPrimary } } tags { id name color isPrimary } }
        totalCount hasNextPage
      }
    }`,
  },
  {
    name: 'GetPermissions',
    operationName: 'GetPermissions',
    variables: (scope) => ({
      scope,
      page: 1,
      limit: 50,
      search: '',
      sort: { field: 'name', order: 'ASC' },
      tagIds: [],
    }),
    query: `query GetPermissions($scope: Scope!, $page: Int, $limit: Int, $sort: PermissionSortInput, $search: String, $tagIds: [ID!]) {
      permissions(scope: $scope, page: $page, limit: $limit, sort: $sort, search: $search, tagIds: $tagIds) {
        permissions { id name action resource { id name slug } tags { id name color isPrimary } }
        totalCount hasNextPage
      }
    }`,
  },
  {
    name: 'GetRolesList (slim)',
    operationName: 'GetRolesList',
    variables: (scope) => ({
      scope,
      page: 1,
      limit: 50,
      search: '',
      sort: { field: 'name', order: 'ASC' },
      tagIds: [],
    }),
    query: `query GetRolesList($scope: Scope!, $page: Int, $limit: Int, $sort: RoleSortInput, $search: String, $tagIds: [ID!]) {
      roles(scope: $scope, page: $page, limit: $limit, sort: $sort, search: $search, tagIds: $tagIds) {
        roles { id name description metadata createdAt updatedAt primaryTag { id name color isPrimary } groupCount }
        totalCount hasNextPage
      }
    }`,
  },
];

async function runBenchmark(baseUrl, accessToken, scope, bench, runs) {
  const durations = [];
  let lastSample = null;
  for (let i = 0; i < runs; i++) {
    const sample = await graphql(
      baseUrl,
      accessToken,
      bench.operationName,
      bench.query,
      bench.variables(scope)
    );
    durations.push(sample.durationMs);
    lastSample = sample;
  }
  durations.sort((a, b) => a - b);
  return {
    name: bench.name,
    operationName: bench.operationName,
    runs,
    p50Ms: Math.round(percentile(durations, 50)),
    p95Ms: Math.round(percentile(durations, 95)),
    minMs: Math.round(durations[0]),
    maxMs: Math.round(durations[durations.length - 1]),
    lastBytes: lastSample?.bytes ?? 0,
    lastErrorCount: lastSample?.errorCount ?? 0,
    lastErrorMessage: lastSample?.firstErrorMessage ?? null,
    lastOk: lastSample?.ok ?? false,
  };
}

function toMarkdown(results, meta) {
  const lines = [
    `# Alteos RBAC query benchmark`,
    '',
    `- Date: ${meta.date}`,
    `- Base URL: ${meta.baseUrl}`,
    `- Scope: \`${meta.scopeId}\` (${meta.scopeTenant})`,
    `- Runs per query: ${meta.runs}`,
    '',
    '| Query | p50 (ms) | p95 (ms) | min | max | bytes | errors | ok |',
    '|-------|----------|----------|-----|-----|-------|--------|-----|',
  ];
  for (const r of results) {
    lines.push(
      `| ${r.name} | ${r.p50Ms} | ${r.p95Ms} | ${r.minMs} | ${r.maxMs} | ${r.lastBytes} | ${r.lastErrorCount} | ${r.lastOk ? 'yes' : 'no'} |`
    );
  }
  const failed = results.filter((r) => !r.lastOk);
  if (failed.length > 0) {
    lines.push('', '## Errors (last run per query)', '');
    for (const r of failed) {
      lines.push(`- **${r.name}**: ${r.lastErrorMessage ?? '(no message)'}`);
    }
  }
  lines.push('', '## Targets (post Phase 2)', '', '- p95 < 500ms for list queries', '- zero GraphQL errors');
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const credentials = JSON.parse(readFileSync(args.credentialsPath, 'utf8'));
  const scope = credentials.scope;

  console.log(`Benchmarking ${args.baseUrl} (${args.runs} runs/query)...`);
  const accessToken = await exchangeToken(args.baseUrl, credentials);

  const results = [];
  for (const bench of BENCHMARKS) {
    process.stdout.write(`  ${bench.name}... `);
    const result = await runBenchmark(args.baseUrl, accessToken, scope, bench, args.runs);
    results.push(result);
    console.log(
      `p50=${result.p50Ms}ms p95=${result.p95Ms}ms errors=${result.lastErrorCount}${result.lastErrorMessage ? ` (${result.lastErrorMessage})` : ''}`
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const outDir = join(ROOT, 'docs/benchmarks');
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, `alteos-rbac-${date}.json`);
  const mdPath = join(outDir, `alteos-rbac-${date}.md`);
  const meta = {
    date: new Date().toISOString(),
    baseUrl: args.baseUrl,
    scopeId: scope.id,
    scopeTenant: scope.tenant,
    runs: args.runs,
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
