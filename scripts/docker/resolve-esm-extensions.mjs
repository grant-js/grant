import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const RELATIVE_IMPORT_RE =
  /(from\s+['"]|import\s+['"]|import\s*\(\s*['"]|export\s+\*?\s*from\s+['"])(\.\.?\/[^'"]+)(['"])/g;

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

function resolveRelativeSpecifier(fromFile, specifier) {
  if (specifier === '.' || specifier === './') {
    return './index.js';
  }

  if (specifier.endsWith('.js') || specifier.endsWith('.json')) {
    return specifier;
  }

  const fromDir = dirname(fromFile);
  const base = resolve(fromDir, specifier);
  const candidates = [`${base}.js`, join(base, 'index.js')];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    return `${specifier}.js`;
  }

  let rel = relative(fromDir, match).replace(/\\/g, '/');
  if (!rel.startsWith('.')) {
    rel = `./${rel}`;
  }
  return rel;
}

function rewriteFile(file) {
  const original = readFileSync(file, 'utf8');
  const updated = original.replace(
    RELATIVE_IMPORT_RE,
    (match, prefix, specifier, suffix) => `${prefix}${resolveRelativeSpecifier(file, specifier)}${suffix}`,
  );

  if (updated !== original) {
    writeFileSync(file, updated);
  }
}

const targetDir = process.argv[2];
if (!targetDir) {
  throw new Error('Usage: node resolve-esm-extensions.mjs <dist-directory>');
}

const absDir = resolve(targetDir);
if (!existsSync(absDir)) {
  throw new Error(`Directory not found: ${absDir}`);
}

for (const file of walkJsFiles(absDir)) {
  rewriteFile(file);
}
