import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { patchWorkspaceExports } from './patch-workspace-exports.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

// TypeScript 7's `tsc` lives on `@typescript/native`. The `typescript` package
// is the 6.x API wrapper and only ships `tsc6`. Spawn the bin directly (it is
// not safe to run as `node bin/tsc` across TS 7 layouts).
const require = createRequire(import.meta.url);
const TSC = join(dirname(require.resolve('@typescript/native/package.json')), 'bin/tsc');
const RESOLVE_API_ALIASES = join(ROOT, 'scripts/docker/resolve-api-path-aliases.mjs');
const RESOLVE_ESM_EXTENSIONS = join(ROOT, 'scripts/docker/resolve-esm-extensions.mjs');

/** Topological build order for the grant-api workspace subgraph. */
const WORKSPACE_PACKAGES = [
  { dir: 'packages/@grantjs/schema', assets: ['src/schema'] },
  { dir: 'packages/@grantjs/core' },
  { dir: 'packages/@grantjs/webhooks' },
  { dir: 'packages/@grantjs/constants' },
  { dir: 'packages/@grantjs/env' },
  { dir: 'packages/@grantjs/i18n' },
  { dir: 'packages/@grantjs/logger' },
  { dir: 'packages/@grantjs/errors' },
  { dir: 'packages/@grantjs/cache' },
  { dir: 'packages/@grantjs/storage' },
  { dir: 'packages/@grantjs/email' },
  { dir: 'packages/@grantjs/jobs' },
  { dir: 'packages/@grantjs/analytics' },
  { dir: 'packages/@grantjs/telemetry' },
  { dir: 'packages/@grantjs/secrets' },
  { dir: 'packages/@grantjs/database', assets: ['src/migrations'] },
];

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyAssets(packageDir, assetDirs) {
  for (const rel of assetDirs) {
    const src = join(packageDir, rel);
    if (!existsSync(src)) {
      throw new Error(`Missing asset directory: ${src}`);
    }
    const dest = join(packageDir, rel.replace(/^src\//, 'dist/'));
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
}

function buildPackage(relDir, assets = []) {
  const absDir = join(ROOT, relDir);
  const tsconfig = join(absDir, 'tsconfig.build.json');
  if (!existsSync(tsconfig)) {
    throw new Error(`Missing tsconfig.build.json for ${relDir}`);
  }

  console.log(`\n[build-api] Compiling ${relDir}...`);

  const tsbuildInfo = join(absDir, 'tsconfig.build.tsbuildinfo');
  if (existsSync(tsbuildInfo)) {
    unlinkSync(tsbuildInfo);
  }

  run(TSC, ['-p', tsconfig, '--pretty', 'false']);

  const distDir = join(absDir, 'dist');
  if (!existsSync(distDir)) {
    throw new Error(
      `Compile produced no dist output for ${relDir}. Remove stale tsbuildinfo or fix tsconfig.build.json.`
    );
  }

  run(process.execPath, [RESOLVE_ESM_EXTENSIONS, distDir]);

  if (assets.length > 0) {
    copyAssets(absDir, assets);
  }
}

function main() {
  if (!existsSync(TSC)) {
    throw new Error(
      'TypeScript 7 native compiler not installed. Run pnpm install from the repo root.'
    );
  }

  for (const pkg of WORKSPACE_PACKAGES) {
    buildPackage(pkg.dir, pkg.assets ?? []);
  }

  console.log('\n[build-api] Compiling apps/api...');
  run(TSC, ['-p', join(ROOT, 'apps/api/tsconfig.build.json'), '--pretty', 'false']);
  run(process.execPath, [RESOLVE_API_ALIASES]);
  run(process.execPath, [RESOLVE_ESM_EXTENSIONS, join(ROOT, 'apps/api/dist')]);

  console.log('\n[build-api] Pointing workspace packages at dist for Node runtime...');
  for (const pkg of WORKSPACE_PACKAGES) {
    patchWorkspaceExports(join(ROOT, pkg.dir));
  }

  console.log('\n[build-api] Production compile finished.');
}

main();
