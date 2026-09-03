#!/usr/bin/env node
/**
 * Guard against changesets that name packages in `.changeset/config.json`'s
 * `ignore` list.
 *
 * Changesets/action treats any `.changeset/*.md` (except README) as "there is
 * work to version". Ignored packages are not versioned, so an ignored-only
 * changeset produces no git diff, the action force-pushes `changeset-release/main`
 * to the same SHA as `main`, and GitHub rejects the empty PR:
 * "No commits between main and changeset-release/main".
 *
 * Because that path is the "version" branch, publish never runs either — which
 * is how 1.6.0 sat on `main` without reaching npm.
 *
 * Usage:
 *   node scripts/check-ignored-changesets.mjs          # fail if any mention ignore
 *   node scripts/check-ignored-changesets.mjs --prune  # drop ignored-only files
 */

import { readFileSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const CHANGESET_DIR = join(ROOT, ".changeset");
const prune = process.argv.includes("--prune");

const config = JSON.parse(readFileSync(join(CHANGESET_DIR, "config.json"), "utf-8"));
const ignored = new Set(config.ignore ?? []);

function packagesFromChangeset(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [];
  const names = [];
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^['"]?([^'":\s]+)['"]?:\s*(patch|minor|major)\s*$/);
    if (m) names.push(m[1]);
  }
  return names;
}

const files = readdirSync(CHANGESET_DIR).filter((f) => f.endsWith(".md") && f !== "README.md");
const ignoredOnly = [];
const mixed = [];

for (const file of files) {
  const path = join(CHANGESET_DIR, file);
  const names = packagesFromChangeset(readFileSync(path, "utf-8"));
  const ignoredNames = names.filter((n) => ignored.has(n));
  if (ignoredNames.length === 0) continue;
  if (ignoredNames.length === names.length) {
    ignoredOnly.push({ file, names: ignoredNames });
  } else {
    mixed.push({ file, ignoredNames, names });
  }
}

if (mixed.length) {
  for (const { file, ignoredNames } of mixed) {
    console.error(
      `Changeset ${file} names ignored package(s): ${ignoredNames.join(", ")}. ` +
        "Remove them; ignored packages are not versioned or published."
    );
  }
  process.exit(1);
}

if (ignoredOnly.length === 0) {
  process.exit(0);
}

if (prune) {
  for (const { file, names } of ignoredOnly) {
    console.log(`Removing ignored-only changeset ${file} (${names.join(", ")})`);
    unlinkSync(join(CHANGESET_DIR, file));
  }
  process.exit(0);
}

for (const { file, names } of ignoredOnly) {
  console.error(
    `Changeset ${file} only names ignored package(s): ${names.join(", ")}. ` +
      "Do not add changesets for packages in `.changeset/config.json` ignore. " +
      "They block npm publish: changesets/action keeps taking the version-PR path."
  );
}
process.exit(1);
