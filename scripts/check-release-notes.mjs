#!/usr/bin/env node
/**
 * Guard the generated root CHANGELOG.md.
 *
 * `pnpm run version` writes CHANGELOG.md from the fixed-group package changelogs
 * (`update-root-changelog.mjs` → `extract-release-notes.sh`), and CI's
 * `format:check` then gates that file. Nothing verified the step in between, so a
 * generator that emitted markdown Prettier rejects could only be discovered on an
 * open version PR — which is how a stray blank line before a second `###` heading
 * survived 23 releases: no release until 1.6.0 had both a Minor and a Patch
 * section, so the offending branch had never executed.
 *
 * This runs the real generators over a fixture tree shaped like the repo and
 * asserts the properties the release process depends on.
 *
 * Usage: node scripts/check-release-notes.mjs
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = '9.9.9';

const ROOT_HEADER = `# Changelog

All notable platform releases are documented here.

## 9.9.8

### Patch Changes

- 0000000: A previous release.
`;

/**
 * Two packages recording the same changeset, with the shared entry appearing last
 * in one section and mid-section in the other — the position asymmetry that broke
 * dedup. Also covers both heading levels in one release, a multi-paragraph body,
 * and the dependency bullets that must be dropped.
 */
const FIXTURES = {
  'apps/api/CHANGELOG.md': `# grant-api

## ${VERSION}

### Minor Changes

- aaaaaaa: Add a thing.

  A second paragraph, indented, which must survive intact.

- bbbbbbb: Shared entry recorded by two packages.

### Patch Changes

- ccccccc: Fix another thing.
`,
  'apps/web/CHANGELOG.md': `# grant-web

## ${VERSION}

### Patch Changes

- bbbbbbb: Shared entry recorded by two packages.
- Updated dependencies [aaaaaaa]
  - @grantjs/schema@${VERSION}
`,
  'packages/@grantjs/schema/CHANGELOG.md': `# @grantjs/schema

## ${VERSION}

### Patch Changes

- @grantjs/core@1.0.0
`,
};

function buildFixtureTree() {
  const dir = mkdtempSync(join(tmpdir(), 'grant-release-notes-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  for (const script of ['extract-release-notes.sh', 'update-root-changelog.mjs']) {
    cpSync(join(rootDir, 'scripts', script), join(dir, 'scripts', script));
  }
  for (const [path, contents] of Object.entries(FIXTURES)) {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    writeFileSync(join(dir, path), contents);
  }
  writeFileSync(join(dir, 'CHANGELOG.md'), ROOT_HEADER);
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ version: '0.0.0' }, null, 2)}\n`);
  writeFileSync(
    join(dir, 'apps/api/package.json'),
    `${JSON.stringify({ version: VERSION }, null, 2)}\n`
  );
  return dir;
}

function sectionFor(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line === `## ${version}`);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

const failures = [];
function check(description, condition) {
  if (!condition) failures.push(description);
}

async function main() {
  const dir = buildFixtureTree();
  try {
    execFileSync(process.execPath, [join(dir, 'scripts/update-root-changelog.mjs')], {
      cwd: dir,
      stdio: 'pipe',
    });

    const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf8');
    const section = sectionFor(changelog, VERSION);
    const bullets = section.split('\n').filter((line) => line.startsWith('- '));

    // The gate this exists to protect: format:check runs over the committed file.
    const options = await prettier.resolveConfig(join(rootDir, 'CHANGELOG.md'));
    check(
      'generated CHANGELOG.md is Prettier-formatted',
      await prettier.check(changelog, { ...options, parser: 'markdown' })
    );

    check(`a section for ${VERSION} was written`, section.trim() !== '');
    check('the previous release is preserved', changelog.includes('## 9.9.8'));

    check(
      'each heading appears once',
      (section.match(/^### Minor Changes$/gm) ?? []).length === 1 &&
        (section.match(/^### Patch Changes$/gm) ?? []).length === 1
    );

    check('entries are deduped across packages', new Set(bullets).size === bullets.length);

    check(
      'dependency-only bullets are dropped',
      !section.includes('Updated dependencies') && !section.includes('@grantjs/core@')
    );

    check(
      'multi-paragraph bodies survive',
      section.includes('A second paragraph, indented, which must survive intact.')
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error('Release-notes generation check failed:');
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exit(1);
  }
  console.log('Release-notes generation check passed.');
}

await main();
