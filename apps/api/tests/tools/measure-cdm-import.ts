/**
 * Measures how long a `project-sync` import actually takes, at every fixture scale.
 *
 *   DB_URL=postgres://… pnpm --filter grant-api measure:cdm-import
 *   DB_URL=postgres://… pnpm --filter grant-api measure:cdm-import -- department enterprise
 *   DB_URL=postgres://… pnpm --filter grant-api measure:cdm-import -- key-fanout
 *   DB_URL=postgres://… pnpm --filter grant-api measure:cdm-import -- --repeat key-fanout
 *   DB_URL=postgres://… pnpm --filter grant-api measure:cdm-import -- --replace key-fanout
 *   DB_URL=postgres://… pnpm --filter grant-api measure:cdm-import -- --repeat --replace key-fanout
 *
 * **This is the tool whose absence cost an account cycle.** ADR 0002 asks whether a
 * `project-sync` import fits inside Lambda's 15-minute ceiling. Phase C measured one
 * point (283 entities, 208.25 s) and warned that one point cannot separate fixed cost
 * from per-entity cost. Slice 4 deployed to get three and got none: every import died on
 * its first permission for a reason reproducible offline in one line
 * (`2026-09-09-aws-followups-closeout-measurements.md`, § ADR 0002).
 *
 * So this runs the import against a real PostgreSQL, offline and free, and reports the
 * fit. A deploy is still needed to calibrate the constant on Lambda's CPU and RDS's
 * latency — but it is no longer needed to discover that the import runs at all.
 *
 * Two things it measures that a payload-size tool cannot:
 *
 *   1. **The rollback snapshot is part of the job.** The worker exports the project's
 *      current state inside the same transaction before applying anything
 *      (`project-sync.job.ts`), so job duration is snapshot + import. The snapshot is a
 *      function of what is *already* there, not of the payload — which is why a repeat
 *      import costs more than a first one, and why a duration model built from payload
 *      size alone is wrong.
 *   2. **Merge repeat vs replace.** `--repeat` is merge-creates-again into the same
 *      project. `--replace` is a later pass of the same document with
 *      `mode.strategy = replace` + `confirmDestructive`. They are not interchangeable.
 *   3. **Worker-shaped hash-prep.** Each pass hashes BYOK secrets with
 *      `withHashedCdmApiKeySecrets` *before* the snapshot+import TX, then times
 *      post-commit cache invalidate. `--replace` also runs a one-thread
 *      (`hashSecret` / `hashSync`) bench of the same secrets so a multi-core
 *      `Promise.all` is not reported as the Lambda number.
 *
 * Requires a disposable database. It creates an account and a project per pass and
 * deletes them afterwards; point it at the e2e stack (`pnpm test:e2e:up`), never at
 * anything real.
 */

import { performance } from 'node:perf_hooks';

import { accountProjects, accounts, initializeDBConnection, projects } from '@grantjs/database';
import { CdmModeStrategy, type Scope, type SyncProjectResult, Tenant } from '@grantjs/schema';
import { eq } from 'drizzle-orm';

import { config } from '@/config';
import { createAppContext } from '@/lib/app-context.lib';
import { CacheFactory } from '@/lib/cache';
import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';
import {
  collectCdmDocumentApiKeySecrets,
  hashCdmApiKeySecretsSerially,
  withHashedCdmApiKeySecrets,
} from '@/lib/cdm/hash-cdm-api-key-secrets.lib';
import { scopeToRlsContext, setRlsContext } from '@/lib/rls';

import {
  CDM_SCALE_PROFILES,
  generateCdmAtScale,
  generateKeyFanoutCdm,
  KEY_FANOUT_CDM_SHAPE,
} from '../helpers/cdm-scale-fixtures';
import {
  inputForPass,
  type MeasurePass,
  measurePasses,
  parseMeasureArgs,
} from '../helpers/measure-cdm-import';

const MEASURE_PROFILES = [
  ...CDM_SCALE_PROFILES,
  {
    name: KEY_FANOUT_CDM_SHAPE.name,
    shape: KEY_FANOUT_CDM_SHAPE.shape,
  },
] as const;

/** Lambda's hard wall. The number every duration here is measured against. */
const LAMBDA_CEILING_SECONDS = 15 * 60;

interface PassResult {
  profile: string;
  entities: number;
  pass: MeasurePass;
  secretCount: number;
  hashPrepSeconds: number;
  snapshotSeconds: number;
  applySeconds: number;
  postCommitSeconds: number;
  envelopedSeconds: number;
  totalSeconds: number;
  applied: number;
  counters: Record<string, number>;
}

function entityCount(cdm: CdmDocumentInput): number {
  return (
    (cdm.roles?.length ?? 0) +
    (cdm.users?.length ?? 0) +
    (cdm.resources?.length ?? 0) +
    (cdm.permissions?.length ?? 0) +
    (cdm.groups?.length ?? 0) +
    (cdm.tags?.length ?? 0)
  );
}

/**
 * Every `*Created`/`*Linked`/`*Ensured`/`*Assigned` counter the result carries, summed.
 *
 * This is the guard against a vacuous measurement. An import that silently applies
 * nothing is extremely fast, and a duration table built from one would say the ceiling
 * is comfortable when what is comfortable is doing no work. `main` refuses to report a
 * pass whose counters are all zero.
 */
function appliedCount(result: SyncProjectResult): number {
  return Object.entries(result).reduce<number>(
    (total, [key, value]) =>
      typeof value === 'number' &&
      /Created$|Linked$|Ensured$|Assigned$|Unchanged$|Rotated$|Deleted$/.test(key)
        ? total + value
        : total,
    0
  );
}

function numericCounters(result: SyncProjectResult): Record<string, number> {
  return Object.fromEntries(
    Object.entries(result).filter(([, value]) => typeof value === 'number')
  ) as Record<string, number>;
}

function documentFor(profileName: string): CdmDocumentInput {
  if (profileName === KEY_FANOUT_CDM_SHAPE.name) {
    return generateKeyFanoutCdm();
  }
  return generateCdmAtScale(CDM_SCALE_PROFILES.find((profile) => profile.name === profileName)!);
}

/**
 * Least squares on two candidate models, because the first measurements showed the
 * naive one is wrong.
 *
 * ADR 0002's decision turns on an extrapolation to 28,880 entities, and the model
 * chosen decides the answer. A **linear** fit assumes each entity costs the same as the
 * last; a **power law** (`t = a·n^b`) allows per-entity cost to grow with what is
 * already there, which is what per-entity lookups against growing tables produce. The
 * measured per-entity cost rose from 23 ms at 124 entities to 53 ms at 3,650, so the
 * linear model is reported to be *dismissed*, not relied on — and the report says which
 * model the residuals prefer rather than leaving a reader to assume.
 */
function fit(points: ReadonlyArray<{ x: number; y: number }>) {
  const n = points.length;
  const sumX = points.reduce((total, p) => total + p.x, 0);
  const sumY = points.reduce((total, p) => total + p.y, 0);
  const sumXY = points.reduce((total, p) => total + p.x * p.y, 0);
  const sumXX = points.reduce((total, p) => total + p.x * p.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const totalSumSquares = points.reduce((total, p) => total + (p.y - meanY) ** 2, 0);
  const residualSumSquares = points.reduce(
    (total, p) => total + (p.y - (intercept + slope * p.x)) ** 2,
    0
  );
  const rSquared = totalSumSquares === 0 ? 1 : 1 - residualSumSquares / totalSumSquares;
  // Residual standard error, and the worst single residual — the honest error bar for
  // five points is "how far off was the worst one", not a t-interval pretending to more.
  const standardError = n > 2 ? Math.sqrt(residualSumSquares / (n - 2)) : NaN;
  const worstResidual = points.reduce(
    (worst, p) => Math.max(worst, Math.abs(p.y - (intercept + slope * p.x))),
    0
  );

  return { slope, intercept, rSquared, standardError, worstResidual };
}

/**
 * `t = a·n^b`, fitted as a straight line through `(ln n, ln t)`.
 *
 * `b` is the number that matters: 1.0 means each entity costs what the last one did,
 * and anything above it means the import gets slower the more it has already applied.
 * Reported with its own R² so the two models can be compared on the same points.
 */
function fitPowerLaw(points: ReadonlyArray<{ x: number; y: number }>) {
  const logFit = fit(points.map((p) => ({ x: Math.log(p.x), y: Math.log(p.y) })));
  const exponent = logFit.slope;
  const coefficient = Math.exp(logFit.intercept);
  const predict = (n: number) => coefficient * n ** exponent;

  // R² in the original units, not in log space: a good log-space fit can still be a
  // poor predictor of seconds, and seconds are what the ceiling is measured in.
  const meanY = points.reduce((total, p) => total + p.y, 0) / points.length;
  const totalSumSquares = points.reduce((total, p) => total + (p.y - meanY) ** 2, 0);
  const residualSumSquares = points.reduce((total, p) => total + (p.y - predict(p.x)) ** 2, 0);
  const rSquared = totalSumSquares === 0 ? 1 : 1 - residualSumSquares / totalSumSquares;

  /** Entity count at which the model reaches `seconds`. */
  const solveFor = (seconds: number) => (seconds / coefficient) ** (1 / exponent);

  return { exponent, coefficient, rSquared, predict, solveFor };
}

async function main(): Promise<void> {
  const flags = parseMeasureArgs(process.argv.slice(2));
  const profiles = MEASURE_PROFILES.filter(
    (profile) => flags.requested.length === 0 || flags.requested.includes(profile.name)
  );

  if (profiles.length === 0) {
    throw new Error(`No profile matched. Known: ${MEASURE_PROFILES.map((p) => p.name).join(', ')}`);
  }

  const connectionString = process.env.DB_URL;
  if (!connectionString) {
    throw new Error('DB_URL must point at a disposable PostgreSQL (see the header).');
  }

  const db = initializeDBConnection({ connectionString, max: config.db.poolMax });
  const cache = CacheFactory.createEntityCache({ strategy: 'memory' });
  const context = createAppContext(db, cache);
  const { projectImport, projectExport } = context.services;

  const results: PassResult[] = [];
  const serialBenches: Array<{
    profile: string;
    secretCount: number;
    hashPrepSeconds: number;
  }> = [];

  for (const profile of profiles) {
    const cdm = documentFor(profile.name);
    const entities = entityCount(cdm);
    const secrets = collectCdmDocumentApiKeySecrets(cdm);

    if (flags.withHashPrepSerial && secrets.length > 0) {
      const serial = hashCdmApiKeySecretsSerially(secrets);
      serialBenches.push({ profile: profile.name, ...serial });
      process.stderr.write(
        `${profile.name} (hash-prep serial, ${serial.secretCount} secrets): ` +
          `${serial.hashPrepSeconds.toFixed(2)} s\n`
      );
    }

    const [account] = await db
      .insert(accounts)
      .values({ type: 'personal', ownerId: config.system.systemUserId })
      .returning({ id: accounts.id });
    const [project] = await db
      .insert(projects)
      .values({ name: `measure-${profile.name}`, slug: `measure-${profile.name}-${Date.now()}` })
      .returning({ id: projects.id });
    await db.insert(accountProjects).values({ accountId: account.id, projectId: project.id });

    const scope: Scope = {
      tenant: Tenant.AccountProject,
      id: `${account.id}:${project.id}`,
    };

    for (const pass of measurePasses(flags)) {
      const input = inputForPass(cdm, pass);
      let hashPrepSeconds = 0;
      let secretCount = 0;

      const existing =
        input.mode?.strategy === CdmModeStrategy.Replace
          ? await projectImport.listCdmProjectUserApiKeysForReplace(project.id)
          : undefined;
      const enveloped = await withHashedCdmApiKeySecrets(
        input,
        async () =>
          db.transaction(async (tx) => {
            await setRlsContext(tx, scopeToRlsContext(scope));

            const snapshotStart = performance.now();
            await projectExport.exportProjectCdm(
              { projectId: project.id, scope, version: input.version },
              tx
            );
            const snapshotEnd = performance.now();

            const importResult = await projectImport.importProjectCdm(
              { projectId: project.id, scope, input },
              tx
            );
            const applyEnd = performance.now();

            return {
              snapshotSeconds: (snapshotEnd - snapshotStart) / 1000,
              applySeconds: (applyEnd - snapshotEnd) / 1000,
              envelopedSeconds: (applyEnd - snapshotStart) / 1000,
              applied: appliedCount(importResult),
              counters: numericCounters(importResult),
            };
          }),
        (prep) => {
          secretCount = prep.secretCount;
          hashPrepSeconds = prep.hashPrepSeconds;
        },
        {
          strategy: input.mode?.strategy,
          existing,
        }
      );

      const postCommitStart = performance.now();
      await projectImport.invalidateCachesForImportResult({ scope, userIds: [] });
      const postCommitSeconds = (performance.now() - postCommitStart) / 1000;

      if (enveloped.applied === 0) {
        throw new Error(
          `${profile.name} (${pass}): the import reported zero entities applied. A duration ` +
            'measured from an import that did nothing is not a measurement — refusing to report it.'
        );
      }

      const timings: PassResult = {
        profile: profile.name,
        entities,
        pass,
        secretCount,
        hashPrepSeconds,
        snapshotSeconds: enveloped.snapshotSeconds,
        applySeconds: enveloped.applySeconds,
        postCommitSeconds,
        envelopedSeconds: enveloped.envelopedSeconds,
        totalSeconds: hashPrepSeconds + enveloped.envelopedSeconds + postCommitSeconds,
        applied: enveloped.applied,
        counters: enveloped.counters,
      };

      results.push(timings);
      process.stderr.write(
        `${profile.name} (${entities} entities, ${pass}): ` +
          `${timings.totalSeconds.toFixed(2)} s ` +
          `(hash-prep ${timings.hashPrepSeconds.toFixed(2)} s, ` +
          `snapshot ${timings.snapshotSeconds.toFixed(2)} s, ` +
          `apply ${timings.applySeconds.toFixed(2)} s, ` +
          `post-commit ${timings.postCommitSeconds.toFixed(2)} s)\n`
      );
    }

    await db.delete(accounts).where(eq(accounts.id, account.id));
  }

  report(results, serialBenches);
  await db.$client.end();
  await CacheFactory.disconnect(cache);
}

function report(
  results: ReadonlyArray<PassResult>,
  serialBenches: ReadonlyArray<{
    profile: string;
    secretCount: number;
    hashPrepSeconds: number;
  }>
): void {
  const lines: string[] = [];

  if (serialBenches.length > 0) {
    lines.push('## One-thread hash-prep (`hashSecret` / bcrypt-10)', '');
    lines.push('| Profile | Secrets | Hash-prep | ms/secret |');
    lines.push('| --- | ---: | ---: | ---: |');
    for (const row of serialBenches) {
      const perSecret =
        row.secretCount === 0 ? '0.0' : ((row.hashPrepSeconds / row.secretCount) * 1000).toFixed(1);
      lines.push(
        `| \`${row.profile}\` | ${row.secretCount.toLocaleString()} | ` +
          `**${row.hashPrepSeconds.toFixed(2)} s** | ${perSecret} |`
      );
    }
    lines.push('');
  }

  lines.push('## Measured import durations', '');
  lines.push(
    '| Profile | Entities | Pass | Secrets | Hash-prep | Snapshot | Apply | Post-commit | Total | Applied | vs 15 min |'
  );
  lines.push('| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const row of results) {
    const headroom = ((row.totalSeconds / LAMBDA_CEILING_SECONDS) * 100).toFixed(1);
    lines.push(
      `| \`${row.profile}\` | ${row.entities.toLocaleString()} | ${row.pass} | ` +
        `${row.secretCount.toLocaleString()} | ${row.hashPrepSeconds.toFixed(2)} s | ` +
        `${row.snapshotSeconds.toFixed(2)} s | ${row.applySeconds.toFixed(2)} s | ` +
        `${row.postCommitSeconds.toFixed(2)} s | **${row.totalSeconds.toFixed(2)} s** | ` +
        `${row.applied.toLocaleString()} | ${headroom}% |`
    );
  }

  const counterKeys = [...new Set(results.flatMap((row) => Object.keys(row.counters)))].sort();
  if (counterKeys.length > 0) {
    lines.push('', '## SyncProjectResult counters', '');
    lines.push(`| Profile | Pass | ${counterKeys.map((key) => `\`${key}\``).join(' | ')} |`);
    lines.push(`| --- | --- | ${counterKeys.map(() => '---:').join(' | ')} |`);
    for (const row of results) {
      lines.push(
        `| \`${row.profile}\` | ${row.pass} | ` +
          `${counterKeys.map((key) => (row.counters[key] ?? 0).toLocaleString()).join(' | ')} |`
      );
    }
  }

  // key-fanout is a different shape (few entities, huge key + listing fan-out). Mixing
  // it into the 28,880-entity scale fit would pretend those points share a model.
  const firstPasses = results.filter(
    (row) => row.pass === 'first' && row.profile !== KEY_FANOUT_CDM_SHAPE.name
  );
  if (firstPasses.length >= 2) {
    const model = fit(firstPasses.map((row) => ({ x: row.entities, y: row.totalSeconds })));
    const perThousand = model.slope * 1000;
    const at28880 = model.intercept + model.slope * 28_880;
    const crossing = model.slope > 0 ? (LAMBDA_CEILING_SECONDS - model.intercept) / model.slope : 0;

    const power = fitPowerLaw(firstPasses.map((row) => ({ x: row.entities, y: row.totalSeconds })));
    const powerAt28880 = power.predict(28_880);
    const powerCrossing = power.solveFor(LAMBDA_CEILING_SECONDS);

    lines.push('', '## The fit', '');
    lines.push(
      `Two models over ${firstPasses.length} measured points. **Compare the R² values before`,
      'reading either extrapolation** — they disagree by design, and the one that fits is the',
      'one the decision rests on.',
      ''
    );

    lines.push('### Linear — `t = c + m·n`', '');
    lines.push(
      `- Fixed cost **${model.intercept.toFixed(2)} s**, per-entity **${(model.slope * 1000).toFixed(2)} ms** (${perThousand.toFixed(1)} s per 1,000).`
    );
    lines.push(`- R² **${model.rSquared.toFixed(4)}**.`);
    if (Number.isFinite(model.standardError)) {
      lines.push(
        `- Residual standard error **${model.standardError.toFixed(2)} s**;` +
          ` worst single residual **${model.worstResidual.toFixed(2)} s**.`
      );
    }
    lines.push(
      `- At 28,880 entities: **${at28880.toFixed(0)} s** (${(at28880 / 60).toFixed(1)} min),` +
        ` **${((at28880 / LAMBDA_CEILING_SECONDS) * 100).toFixed(0)}%** of the ceiling.`
    );
    lines.push(`- Crosses 15 min at **${Math.round(crossing).toLocaleString()} entities**.`, '');

    lines.push('### Power law — `t = a·n^b`', '');
    lines.push(
      `- Exponent **b = ${power.exponent.toFixed(3)}**, coefficient a = ${power.coefficient.toExponential(3)}.`
    );
    lines.push(`- R² **${power.rSquared.toFixed(4)}**.`);
    lines.push(
      `- At 28,880 entities: **${powerAt28880.toFixed(0)} s** (${(powerAt28880 / 60).toFixed(1)} min),` +
        ` **${((powerAt28880 / LAMBDA_CEILING_SECONDS) * 100).toFixed(0)}%** of the ceiling.`
    );
    lines.push(
      `- Crosses 15 min at **${Math.round(powerCrossing).toLocaleString()} entities**.`,
      ''
    );

    const preferred = power.rSquared > model.rSquared ? 'power law' : 'linear';
    lines.push(
      `**The ${preferred} fits these points better.**` +
        (power.exponent > 1.1
          ? ` b = ${power.exponent.toFixed(2)} means per-entity cost grows with what has` +
            ' already been applied, so a linear extrapolation understates every scale above' +
            ' the largest one measured.'
          : ' Per-entity cost is roughly constant across the measured range.')
    );
  }

  lines.push(
    '',
    `Ceiling ${LAMBDA_CEILING_SECONDS} s. Worker-shaped path: hash-prep`,
    '(`withHashedCdmApiKeySecrets`) then snapshot + apply in one transaction, then',
    'post-commit `invalidateCachesForImportResult`. Totals include those three',
    'phases. They exclude queue latency and job-row writes (`markCompleted`).',
    '`--repeat` is merge; `--replace` is replace. One-thread hash-prep uses',
    '`hashSecret` (sync bcrypt) so a multi-core `Promise.all` is not the Lambda number.'
  );

  process.stdout.write(lines.join('\n') + '\n');
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
