import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const playwrightCli = join(dirname(require.resolve('playwright/package.json')), 'cli.js');
const withHostDeps = process.env.GITHUB_ACTIONS === 'true';
const args = withHostDeps ? ['install', '--with-deps', 'firefox'] : ['install', 'firefox'];
const result = spawnSync(process.execPath, [playwrightCli, ...args], { stdio: 'inherit' });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
