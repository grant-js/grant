import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { patchWorkspaceExports } from './patch-workspace-exports.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const TSC = join(ROOT, 'node_modules/typescript/bin/tsc');
const RESOLVE_API_ALIASES = join(ROOT, 'scripts/docker/resolve-api-path-aliases.mjs');
const RESOLVE_ESM_EXTENSIONS = join(ROOT, 'scripts/docker/resolve-esm-extensions.mjs');

/** Topological build order for the grant-api workspace subgraph. */
const WORKSPACE_PACKAGES = [
  { dir: 'packages/@grantjs/schema', assets: ['src/schema'] },
  { dir: 'packages/@grantjs/core' },
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
  run(process.execPath, [TSC, '-p', tsconfig, '--pretty', 'false']);
  run(process.execPath, [RESOLVE_ESM_EXTENSIONS, join(absDir, 'dist')]);

  if (assets.length > 0) {
    copyAssets(absDir, assets);
  }
}

function main() {
  if (!existsSync(TSC)) {
    throw new Error('TypeScript not installed. Run pnpm install from the repo root.');
  }

  for (const pkg of WORKSPACE_PACKAGES) {
    buildPackage(pkg.dir, pkg.assets ?? []);
  }

  console.log('\n[build-api] Compiling apps/api...');
  run(process.execPath, [TSC, '-p', join(ROOT, 'apps/api/tsconfig.build.json'), '--pretty', 'false']);
  run(process.execPath, [RESOLVE_API_ALIASES]);
  run(process.execPath, [RESOLVE_ESM_EXTENSIONS, join(ROOT, 'apps/api/dist')]);

  console.log('\n[build-api] Pointing workspace packages at dist for Node runtime...');
  for (const pkg of WORKSPACE_PACKAGES) {
    patchWorkspaceExports(join(ROOT, pkg.dir));
  }

  console.log('\n[build-api] Production compile finished.');
}

main();
