#!/usr/bin/env node
/**
 * Verifies that only the intended packages are publishable (not private).
 * Run before pushing release workflow changes.
 *
 * Usage: node scripts/check-publishable-packages.mjs
 * Exit 0 if only @grantjs/schema, @grantjs/client, @grantjs/server, @grantjs/cli are publishable.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const EXPECTED_PUBLISHABLE = new Set([
  "@grantjs/schema",
  "@grantjs/client",
  "@grantjs/server",
  "@grantjs/cli",
]);

// Match pnpm-workspace.yaml: apps/*, packages/@grantjs/*, .../examples/*, docs
function getWorkspacePackages() {
  const packages = [];
  // Directories that contain multiple packages (each subdir is a package)
  const multiDirs = [
    join(ROOT, "apps"),
    join(ROOT, "packages", "@grantjs"),
    join(ROOT, "packages", "@grantjs", "server", "examples"),
    join(ROOT, "packages", "@grantjs", "client", "examples"),
  ];
  for (const dir of multiDirs) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(dir, d.name));
    for (const sub of entries) {
      const pkgPath = join(sub, "package.json");
      if (!existsSync(pkgPath)) continue;
      try {
        const p = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (p.name) packages.push({ name: p.name, private: p.private === true });
      } catch {
        // ignore invalid
      }
    }
  }
  // docs is a single package (package.json inside docs/)
  const docsPkg = join(ROOT, "docs", "package.json");
  if (existsSync(docsPkg)) {
    try {
      const p = JSON.parse(readFileSync(docsPkg, "utf-8"));
      if (p.name) packages.push({ name: p.name, private: p.private === true });
    } catch {
      // ignore
    }
  }
  return packages;
}

const packages = getWorkspacePackages();
const publishable = packages.filter((p) => !p.private).map((p) => p.name);
const unexpected = publishable.filter((n) => !EXPECTED_PUBLISHABLE.has(n));
const missing = [...EXPECTED_PUBLISHABLE].filter((n) => !publishable.includes(n));

console.log("Publishable packages (non-private):", publishable.sort().join(", ") || "(none)");
if (unexpected.length) {
  console.error("Unexpected publishable (should be private):", unexpected.join(", "));
  process.exit(1);
}
if (missing.length) {
  console.error("Expected publishable but marked private:", missing.join(", "));
  process.exit(1);
}
console.log("OK: Only", [...EXPECTED_PUBLISHABLE].sort().join(", "), "are publishable.");
process.exit(0);
