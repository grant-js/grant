#!/usr/bin/env node
/**
 * Writes the synthesized CloudFormation template into `cdk.snapshot/`, and with
 * `--check`, fails if that leaves the working tree dirty.
 *
 * The stack plan requires the synth output be committed and reviewed — it is the
 * evidence that generation produced the intended resources and no others. `cdk.out/`
 * cannot be that artifact: it churns with asset hashes, a manifest and CDK metadata
 * that change without the template changing.
 *
 * `--check` uses `git status --porcelain`, not `git diff --exit-code`. A plain diff
 * only sees *tracked* files, so a newly added stack would produce an untracked
 * template that the check silently ignores — the drift most worth catching.
 *
 * Same shape as the repo's `codegen:check`: regenerate, then fail on any change.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(packageRoot, 'cdk.out');
const snapshotDir = join(packageRoot, 'cdk.snapshot');
const check = process.argv.includes('--check');

const templates = readdirSync(outDir).filter((name) => name.endsWith('.template.json'));
if (templates.length === 0) {
  console.error(`No templates in ${outDir}. Run \`cdk synth\` first.`);
  process.exit(1);
}

mkdirSync(snapshotDir, { recursive: true });
for (const name of templates) {
  // Reformat so a semantically identical template produces an identical file, and
  // so the committed artifact is readable in a diff.
  const template = JSON.parse(readFileSync(join(outDir, name), 'utf8'));
  writeFileSync(join(snapshotDir, name), `${JSON.stringify(template, null, 2)}\n`);
}

console.log(`Snapshotted ${templates.length} template(s) to cdk.snapshot/`);

if (!check) process.exit(0);

const status = execFileSync('git', ['status', '--porcelain', '--', 'cdk.snapshot'], {
  cwd: packageRoot,
  encoding: 'utf8',
});

/**
 * Porcelain reports two status columns: index, then worktree. Only some combinations
 * mean the committed template is stale:
 *
 *   `??`  untracked — a new stack whose template was never added. The drift most
 *         worth catching, and the one `git diff --exit-code` cannot see.
 *   `_M`  regenerating changed a tracked file.
 *   `AM`  staged, then regeneration changed it again.
 *   `A_`  staged and identical to what was just generated — this is a commit in
 *         progress, not drift, so it passes.
 */
const drifted = status
  .split('\n')
  .filter(Boolean)
  .filter((line) => line.startsWith('??') || line[1] !== ' ');

if (drifted.length > 0) {
  console.error(
    '\nCommitted CDK template is out of date. Run `pnpm --filter grant-aws-deploy synth`\n' +
      'and commit cdk.snapshot/:\n\n' +
      drifted.join('\n')
  );
  process.exit(1);
}

console.log('Committed CDK template is up to date.');
