#!/usr/bin/env node
/**
 * Keep the root CHANGELOG.md (and root package.json version) aligned with the
 * fixed-group platform version after `changeset version`.
 *
 * Usage:
 *   node scripts/update-root-changelog.mjs [version]
 *   node scripts/update-root-changelog.mjs --backfill
 *
 * When version is omitted, uses apps/api/package.json.
 * --backfill adds any versions present in apps/api/CHANGELOG.md that are
 * missing from the root changelog (newest first).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const changelogPath = join(rootDir, 'CHANGELOG.md');
const apiPackagePath = join(rootDir, 'apps/api/package.json');
const apiChangelogPath = join(rootDir, 'apps/api/CHANGELOG.md');
const rootPackagePath = join(rootDir, 'package.json');
const extractScript = join(rootDir, 'scripts/extract-release-notes.sh');

const VERSION_RE = /^## (\d+\.\d+\.\d+)$/gm;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function listVersions(markdown) {
  return [...markdown.matchAll(VERSION_RE)].map((match) => match[1]);
}

function hasVersion(markdown, version) {
  return new RegExp(`^## ${version.replaceAll('.', '\\.')}$`, 'm').test(markdown);
}

function compareSemverDesc(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i];
  }
  return 0;
}

function extractHumanNotes(version) {
  const raw = execFileSync(extractScript, [version], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const lines = raw.split('\n');
  // Drop the platform banner line + following blank line from extract-release-notes.sh
  const start = lines[0]?.startsWith('Platform release') ? 2 : 0;
  return lines.slice(start).join('\n').trim();
}

function buildSection(version) {
  const notes = extractHumanNotes(version);
  const body =
    notes && notes !== 'No changeset summaries were recorded for this version.'
      ? notes
      : '_No changeset summaries were recorded for this version._';

  return `## ${version}

### Platform

**Docker images:** tagged \`:${version}\` and \`:latest\` after this release.

**npm packages:** \`@grantjs/schema\`, \`@grantjs/client\`, \`@grantjs/server\`, \`@grantjs/cli\` at **${version}** (fixed group with apps).

${body}
`;
}

function insertNewestFirst(changelog, section) {
  const trimmedSection = section.trimEnd();
  const match = changelog.match(/^([\s\S]*?\n)(##\s)/);
  if (!match) {
    return `${changelog.trimEnd()}\n\n${trimmedSection}\n`;
  }
  const header = match[1];
  const rest = changelog.slice(header.length);
  return `${header}${trimmedSection}\n\n${rest}`;
}

function syncRootPackageVersion(version) {
  const pkg = readJson(rootPackagePath);
  if (pkg.version === version) return false;
  pkg.version = version;
  writeJson(rootPackagePath, pkg);
  return true;
}

function ensureVersions(changelog, versions) {
  const missing = versions
    .filter((version) => !hasVersion(changelog, version))
    .sort(compareSemverDesc);
  if (missing.length === 0) {
    return { changelog, added: [] };
  }
  // Build newest-first as a single block so one prepend keeps order stable.
  const block = missing.map((version) => buildSection(version).trimEnd()).join('\n\n');
  return {
    changelog: insertNewestFirst(changelog, `${block}\n`),
    added: missing,
  };
}

function main() {
  const args = process.argv.slice(2);
  const backfill = args.includes('--backfill');
  const explicitVersion = args.find((arg) => !arg.startsWith('--'));
  const platformVersion = explicitVersion ?? readJson(apiPackagePath).version;

  let changelog = readFileSync(changelogPath, 'utf8');
  let added = [];

  if (backfill) {
    const apiVersions = listVersions(readFileSync(apiChangelogPath, 'utf8'));
    const result = ensureVersions(changelog, apiVersions);
    changelog = result.changelog;
    added = result.added;
  } else {
    const result = ensureVersions(changelog, [platformVersion]);
    changelog = result.changelog;
    added = result.added;
  }

  if (added.length > 0) {
    writeFileSync(changelogPath, changelog.endsWith('\n') ? changelog : `${changelog}\n`);
    console.log(`Updated CHANGELOG.md with: ${added.join(', ')}`);
  } else {
    console.log('CHANGELOG.md already up to date.');
  }

  if (syncRootPackageVersion(platformVersion)) {
    console.log(`Updated root package.json version to ${platformVersion}`);
  }
}

main();
