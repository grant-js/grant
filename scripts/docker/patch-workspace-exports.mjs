import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Point package.json entry points at compiled dist/*.js (Docker production only).
 */
export function patchWorkspaceExports(packageDir) {
  const pkgPath = join(packageDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  const toDist = (value) => {
    if (typeof value !== 'string') {
      return value;
    }
    if (value.startsWith('./src/')) {
      return value.replace(/^\.\/src\//, './dist/').replace(/\.ts$/, '.js');
    }
    if (value.startsWith('src/')) {
      return value.replace(/^src\//, 'dist/').replace(/\.ts$/, '.js');
    }
    return value;
  };

  // Runtime entry points only; keep `types` / exports.types on src for downstream tsc in this build.
  if (typeof pkg.main === 'string') {
    pkg.main = toDist(pkg.main.startsWith('./') ? pkg.main : `./${pkg.main}`);
  }

  if (pkg.exports && typeof pkg.exports === 'object') {
    for (const [key, entry] of Object.entries(pkg.exports)) {
      if (typeof entry === 'string') {
        pkg.exports[key] = toDist(entry);
        continue;
      }
      if (entry && typeof entry === 'object' && entry.default) {
        entry.default = toDist(entry.default);
      }
    }
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}
