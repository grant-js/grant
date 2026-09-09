#!/usr/bin/env node
/**
 * Synthesizes every supported topology and writes the CloudFormation templates into
 * `cdk.snapshot/`; with `--check`, fails if that leaves the working tree dirty.
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
 *
 * The synths live here rather than in `package.json` because there are now three of
 * them sharing one set of scalars. Restating those scalars per script is how the
 * green-field synth would eventually drift from the bring-your-own ones on some axis
 * that has nothing to do with the database — and the whole value of the second
 * snapshot is that it can be diffed against the first.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

/**
 * Resolved rather than taken from PATH so this runs the same CDK whether it is
 * invoked through `pnpm synth` or as a bare `node scripts/snapshot-template.mjs`.
 */
const CDK = join(packageRoot, 'node_modules/.bin/cdk');

/**
 * The scalars every topology shares. The account and region are placeholders, seeded
 * in `cdk.json` with an availability-zone list so the committed template is
 * reproducible and CI needs no credentials. `.env.example` is read rather than a local
 * `.env` so the template cannot depend on an untracked file — `env-file.test.ts`
 * asserts that file sets nothing.
 */
const COMMON_CONTEXT = {
  appUrl: 'https://grant.example.com',
  zoneName: 'example.com',
  hostedZoneId: 'ZREFERENCE00000',
  account: '000000000000',
  region: 'eu-central-1',
  envFile: '.env.example',
};

/**
 * Placeholder identifiers for the brought infrastructure. Well-formed but owned by
 * nobody: nothing here is looked up, so they only have to be shaped like the values an
 * adopter would paste in. They are what makes the imported VPC, its subnets and the
 * ingress rule against a security group this stack does not own readable in the diff.
 */
const BROUGHT = {
  dbUrlSecretArn: 'arn:aws:secretsmanager:eu-central-1:000000000000:secret:grant/db-url-AbCdEf',
  vpcId: 'vpc-0a1b2c3d4e5f60718',
  vpcAzs: 'eu-central-1a,eu-central-1b',
  vpcPrivateSubnetIds: 'subnet-0a1b2c3d4e5f60718,subnet-0a1b2c3d4e5f60719',
  dbSecurityGroupId: 'sg-0a1b2c3d4e5f60718',
};

/**
 * One entry per topology the deployment guide claims, because a claim without a
 * committed template is an assertion about a graph nobody has looked at.
 *
 * Green-field is first and is the one governed by the story's acceptance criterion:
 * it must stay byte-identical. The two bring-your-own snapshots are the inventory
 * evidence — B carries an imported VPC, the ingress rule on a group this stack does
 * not own and the Fargate migration; C carries no VPC at all, which is what removes
 * the NAT gateway and is therefore the topology whose cost story needs proving.
 *
 * Each writes into its own `cdk.out/` subdirectory rather than overwriting the
 * previous one, so a failed synth cannot leave a half-written snapshot looking like
 * drift. Subdirectories are invisible to the `.template.json` scan below.
 */
const TOPOLOGIES = [
  { name: 'green-field', outDir: 'cdk.out', snapshotDir: 'cdk.snapshot', context: {} },
  {
    name: 'brought database, in the adopter VPC',
    outDir: 'cdk.out/byo-vpc',
    snapshotDir: 'cdk.snapshot/byo/vpc',
    context: BROUGHT,
  },
  {
    name: 'brought database, no VPC',
    outDir: 'cdk.out/byo-vpcless',
    snapshotDir: 'cdk.snapshot/byo/vpcless',
    context: { dbUrlSecretArn: BROUGHT.dbUrlSecretArn },
  },
];

/**
 * CDK bakes a content hash into every asset's S3 key. The docs site is an asset, so
 * editing a single documentation page changes the template and would fail
 * `synth:check` — measured, not assumed: adding one file to `docs/.vitepress/dist`
 * changes the hash set.
 *
 * The snapshot exists as evidence about *structure* — which resources exist, how
 * they are wired, what the routing plan is. Content hashes are not structure, so
 * they are normalized away. A **new** asset still shows up as a new `S3Key` entry,
 * so this hides churn without hiding additions.
 */
const ASSET_HASH = /\b[0-9a-f]{64}\b/g;

/**
 * A Lambda `AWS::Lambda::Version` logical ID ends in a 32-hex digest of the function's
 * configuration, so it moves whenever that configuration does. The migrate trigger
 * carries `IMAGE_IDENTIFIER`, which is the image asset hash, which is a function of the
 * whole build context — so an unrelated file anywhere in the workspace changes this ID
 * and `synth:check` reports drift on a template that is structurally identical.
 *
 * Normalized for the same reason asset hashes are: this file is evidence about
 * *structure* — which resources exist and how they reference each other — not about
 * which bytes happened to be on disk during a given synth.
 */
const VERSION_LOGICAL_ID = /(CurrentVersion[0-9A-Fa-f]{8})[0-9a-f]{32}\b/g;

function synth({ outDir, context }) {
  const args = ['synth', '--quiet', '--output', outDir];
  for (const [key, value] of Object.entries({ ...COMMON_CONTEXT, ...context })) {
    args.push('-c', `${key}=${value}`);
  }
  execFileSync(CDK, args, { cwd: packageRoot, stdio: 'inherit' });
}

function snapshot({ outDir, snapshotDir }) {
  const from = join(packageRoot, outDir);
  const into = join(packageRoot, snapshotDir);

  const templates = readdirSync(from).filter((name) => name.endsWith('.template.json'));
  if (templates.length === 0) {
    console.error(`No templates in ${from}. Run \`cdk synth\` first.`);
    process.exit(1);
  }

  mkdirSync(into, { recursive: true });
  for (const name of templates) {
    // Reformat so a semantically identical template produces an identical file, and
    // so the committed artifact is readable in a diff.
    const template = JSON.parse(readFileSync(join(from, name), 'utf8'));
    const normalized = JSON.stringify(template, null, 2)
      .replace(ASSET_HASH, '<asset-hash>')
      .replace(VERSION_LOGICAL_ID, '$1<version-hash>');
    writeFileSync(join(into, name), `${normalized}\n`);
  }

  return templates.length;
}

for (const topology of TOPOLOGIES) {
  synth(topology);
  const count = snapshot(topology);
  console.log(`Snapshotted ${count} template(s) to ${topology.snapshotDir}/ (${topology.name})`);
}

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

console.log('Committed CDK templates are up to date.');
