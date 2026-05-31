import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../..');

const PACKAGES = [
  'packages/@grantjs/schema',
  'packages/@grantjs/core',
  'packages/@grantjs/constants',
  'packages/@grantjs/env',
  'packages/@grantjs/i18n',
  'packages/@grantjs/logger',
  'packages/@grantjs/errors',
  'packages/@grantjs/cache',
  'packages/@grantjs/storage',
  'packages/@grantjs/email',
  'packages/@grantjs/jobs',
  'packages/@grantjs/analytics',
  'packages/@grantjs/telemetry',
  'packages/@grantjs/database',
];

function restorePackageExports(packageDir) {
  const pkgPath = join(ROOT, packageDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  const toSrc = (value) => {
    if (typeof value !== 'string' || !value.startsWith('./dist/')) {
      return value;
    }
    return value.replace(/^\.\/dist\//, './src/').replace(/\.js$/, '.ts');
  };

  if (typeof pkg.main === 'string' && pkg.main.startsWith('dist/')) {
    pkg.main = pkg.main.replace(/^dist\//, 'src/').replace(/\.js$/, '.ts');
  }

  if (pkg.exports && typeof pkg.exports === 'object') {
    for (const entry of Object.values(pkg.exports)) {
      if (entry && typeof entry === 'object' && entry.default) {
        entry.default = toSrc(entry.default);
      }
    }
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

for (const dir of PACKAGES) {
  restorePackageExports(dir);
}

console.log('[restore-workspace-exports] Restored workspace package.json entry points to src.');
