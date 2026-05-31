import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DIST_ROOT = join(ROOT, 'apps/api/dist');

const IMPORT_PREFIX_RE = /(from\s+['"]|import\s+['"]|import\s*\(\s*['"])/;
const ALIAS_IMPORT_RE = /(from\s+['"]|import\s+['"]|import\s*\(\s*['"])@\/([^'"]+)(['"])/g;
const SRC_TREE_IMPORT_RE = /(from\s+['"]|import\s+['"]|import\s*\(\s*['"])((?:\.\.\/)+)src\/([^'"]+)(['"])/g;
const RELATIVE_IMPORT_RE = /(from\s+['"]|import\s+['"]|import\s*\(\s*['"])(\.\/[^'"]+)(['"])/g;
const WORKSPACE_SRC_IMPORT_RE =
  /(from\s+['"]|import\s+['"]|import\s*\(\s*['"])@grantjs\/([^/'"]+)\/src\/([^'"]+)(['"])/g;

function walkJsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsFiles(path));
    } else if (entry.name.endsWith('.js')) {
      files.push(path);
    }
  }
  return files;
}

function resolveDistModulePath(subpath) {
  const base = resolve(DIST_ROOT, subpath);
  const candidates = [
    base.endsWith('.js') ? base : `${base}.js`,
    join(base, 'index.js'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function toDistRelative(fromFile, subpath) {
  const withJs = resolveDistModulePath(subpath);
  let rel = relative(dirname(fromFile), withJs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) {
    rel = `./${rel}`;
  }
  return rel;
}

function ensureJsExtension(specifier) {
  if (specifier.endsWith('.js') || specifier.endsWith('.json')) {
    return specifier;
  }
  return `${specifier}.js`;
}

function rewriteWorkspaceSrcImports(code) {
  return code.replace(
    WORKSPACE_SRC_IMPORT_RE,
    (match, prefix, pkg, subpath, suffix) => {
      const withoutTs = subpath.replace(/\.ts$/, '');
      return `${prefix}@grantjs/${pkg}/dist/${withoutTs}.js${suffix}`;
    },
  );
}

function rewriteImports(code, file) {
  let updated = rewriteWorkspaceSrcImports(code);

  updated = updated.replace(ALIAS_IMPORT_RE, (match, prefix, subpath, suffix) => {
    return `${prefix}${toDistRelative(file, subpath)}${suffix}`;
  });

  updated = updated.replace(SRC_TREE_IMPORT_RE, (match, prefix, _ups, subpath, suffix) => {
    return `${prefix}${toDistRelative(file, subpath)}${suffix}`;
  });

  updated = updated.replace(RELATIVE_IMPORT_RE, (match, prefix, specifier, suffix) => {
    if (!IMPORT_PREFIX_RE.test(prefix)) {
      return match;
    }

    let resolved = ensureJsExtension(specifier);
    const fromDir = dirname(file);
    let absolute = resolve(fromDir, resolved);

    if (!existsSync(absolute) && absolute.endsWith('.js')) {
      const indexPath = `${absolute.slice(0, -3)}/index.js`;
      if (existsSync(indexPath)) {
        absolute = indexPath;
        resolved = relative(fromDir, indexPath).replace(/\\/g, '/');
        if (!resolved.startsWith('.')) {
          resolved = `./${resolved}`;
        }
      }
    }

    return `${prefix}${resolved}${suffix}`;
  });

  return updated;
}

function main() {
  for (const file of walkJsFiles(DIST_ROOT)) {
    const original = readFileSync(file, 'utf8');
    const updated = rewriteImports(original, file);
    if (updated !== original) {
      writeFileSync(file, updated);
    }
  }
}

main();
