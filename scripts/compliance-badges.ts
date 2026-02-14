/**
 * Compliance Badge Generator
 *
 * Reads the Vitest JSON report produced by `test:e2e:report`, categorises each
 * test into a compliance framework by matching describe-block prefixes, then
 * generates shields.io-style SVG badges using `badge-maker` and updates
 * README.md between marker comments.
 *
 * Usage:
 *   tsx scripts/compliance-badges.ts [path/to/compliance-report.json]
 *
 * Defaults to apps/api/tests/e2e/compliance-report.json.
 */

import { makeBadge } from 'badge-maker';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_REPORT = resolve(ROOT, 'apps/api/tests/e2e/compliance-report.json');
const BADGES_DIR = resolve(ROOT, 'badges');
const README_PATH = resolve(ROOT, 'README.md');

// ---------------------------------------------------------------------------
// Types (subset of Vitest JSON reporter output)
// ---------------------------------------------------------------------------

interface AssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: 'passed' | 'failed' | 'pending' | 'todo';
  title: string;
}

interface TestFileResult {
  assertionResults: AssertionResult[];
  name: string;
  status: string;
}

interface VitestJsonReport {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  testResults: TestFileResult[];
  success: boolean;
}

// ---------------------------------------------------------------------------
// Framework definitions
// ---------------------------------------------------------------------------

interface FrameworkDef {
  /** Human-readable label for the badge */
  label: string;
  /** Output SVG filename (without extension) */
  slug: string;
  /**
   * A test matches this framework if ANY of its ancestorTitles (joined with
   * " > ") starts with one of these prefixes. Matching is case-insensitive.
   */
  prefixes: string[];
}

const FRAMEWORKS: FrameworkDef[] = [
  {
    label: 'SOC 2 Type II',
    slug: 'soc2',
    prefixes: ['soc 2'],
  },
  {
    label: 'GDPR',
    slug: 'gdpr',
    prefixes: ['gdpr'],
  },
  {
    label: 'HIPAA',
    slug: 'hipaa',
    prefixes: ['hipaa'],
  },
  {
    label: 'ISO 27001',
    slug: 'iso27001',
    // ISO 27001 controls are tested by negative-rbac and multi-tenant scenarios
    prefixes: [
      'negative: cross-tenant',
      'negative: scope manipulation',
      'negative: privilege escalation',
      'multi-tenant',
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesFramework(assertion: AssertionResult, fw: FrameworkDef): boolean {
  const joined = assertion.ancestorTitles.join(' > ').toLowerCase();
  return fw.prefixes.some((p) => joined.startsWith(p));
}

function badgeColor(pct: number): string {
  if (pct >= 100) return 'brightgreen';
  if (pct >= 90) return 'green';
  if (pct >= 70) return 'yellow';
  if (pct >= 50) return 'orange';
  return 'red';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const reportPath = process.argv[2] ?? DEFAULT_REPORT;

  if (!existsSync(reportPath)) {
    console.error(`Report not found: ${reportPath}`);
    console.error('Run the E2E tests with JSON reporter first:');
    console.error('  ./scripts/e2e.sh --report');
    process.exit(1);
  }

  const report: VitestJsonReport = JSON.parse(readFileSync(reportPath, 'utf-8'));

  // Collect all assertions across all test files
  const allAssertions: AssertionResult[] = report.testResults.flatMap((tr) => tr.assertionResults);

  console.log(`Parsed ${allAssertions.length} tests from ${report.testResults.length} files.\n`);

  // Ensure badges/ directory exists
  mkdirSync(BADGES_DIR, { recursive: true });

  const START_MARKER = '<!-- compliance-badges:start -->';
  const END_MARKER = '<!-- compliance-badges:end -->';
  const badgeLines: string[] = [];

  // Per-framework badges
  for (const fw of FRAMEWORKS) {
    const matched = allAssertions.filter((a) => matchesFramework(a, fw));
    const passed = matched.filter((a) => a.status === 'passed').length;
    const total = matched.length;
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

    const message = total > 0 ? `${passed}/${total} passing` : 'no tests';
    const color = total > 0 ? badgeColor(pct) : 'lightgrey';

    const svg = makeBadge({
      label: fw.label,
      message,
      color,
      style: 'flat',
    });

    const svgPath = resolve(BADGES_DIR, `${fw.slug}.svg`);
    writeFileSync(svgPath, svg);
    badgeLines.push(`![${fw.label}](badges/${fw.slug}.svg)`);

    const statusIcon = pct === 100 ? 'PASS' : pct > 0 ? 'PARTIAL' : 'NONE';
    console.log(`  ${statusIcon}  ${fw.label.padEnd(16)} ${message.padEnd(18)} (${pct}%)`);
  }

  // Overall E2E badge
  const totalPassed = report.numPassedTests;
  const totalTests = report.numTotalTests;
  const totalPct = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  const totalSvg = makeBadge({
    label: 'E2E Tests',
    message: `${totalPassed}/${totalTests} passing`,
    color: badgeColor(totalPct),
    style: 'flat',
  });

  writeFileSync(resolve(BADGES_DIR, 'e2e-total.svg'), totalSvg);
  badgeLines.push('![E2E Tests](badges/e2e-total.svg)');

  console.log(
    `  ${''}  ${'E2E Total'.padEnd(16)} ${totalPassed}/${totalTests} passing  (${totalPct}%)\n`
  );

  // Update README.md
  if (!existsSync(README_PATH)) {
    console.warn('README.md not found -- skipping badge injection.');
    return;
  }

  const readme = readFileSync(README_PATH, 'utf-8');
  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    console.warn(
      'README.md does not contain compliance badge markers.\n' +
        `Add ${START_MARKER} and ${END_MARKER} to enable auto-update.`
    );
    return;
  }

  const before = readme.slice(0, startIdx + START_MARKER.length);
  const after = readme.slice(endIdx);
  const newReadme = `${before}\n${badgeLines.join('\n')}\n${after}`;

  writeFileSync(README_PATH, newReadme);
  console.log('README.md updated with compliance badges.');
}

main();
