/**
 * Measures how long a `project-sync` import actually takes, at every fixture scale.
 *
 *   DB_URL=postgres://… pnpm --filter grant-api measure:cdm-import
 *   DB_URL=postgres://… pnpm --filter grant-api measure:cdm-import -- department enterprise
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
 *   2. **Both passes.** `--repeat` runs each profile twice into the same project: once
 *      into an empty one, once into a full one. The second is the case an adopter
 *      re-importing a corrected export actually hits.
 *
 * Requires a disposable database. It creates an account and a project per pass and
 * deletes them afterwards; point it at the e2e stack (`pnpm test:e2e:up`), never at
 * anything real.
 */

import { performance } from 'node:perf_hooks';

import { accountProjects, accounts, initializeDBConnection, projects } from '@grantjs/database';
import { type Scope, type SyncProjectInput, type SyncProjectResult, Tenant } from '@grantjs/schema';
import { eq } from 'drizzle-orm';

import { config } from '@/config';
import { createAppContext } from '@/lib/app-context.lib';
import { CacheFactory } from '@/lib/cache';
import { scopeToRlsContext, setRlsContext } from '@/lib/rls';

import { CDM_SCALE_PROFILES, generateCdmAtScale } from '../helpers/cdm-scale-fixtures';

/** Lambda's hard wall. The number every duration here is measured against. */
const LAMBDA_CEILING_SECONDS = 15 * 60;

interface PassResult {
  profile: string;
  entities: number;
  pass: 'first' | 'repeat';
  snapshotSeconds: number;
  importSeconds: number;
  totalSeconds: number;
  applied: number;
}

function entityCount(cdm: SyncProjectInput): number {
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
      typeof value === 'number' && /Created$|Linked$|Ensured$|Assigned$/.test(key)
        ? total + value
        : total,
    0
  );
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
  const requested = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
  const withRepeat = process.argv.includes('--repeat');
  const profiles = CDM_SCALE_PROFILES.filter(
    (profile) => requested.length === 0 || requested.includes(profile.name)
  );

  if (profiles.length === 0) {
    throw new Error(
      `No profile matched. Known: ${CDM_SCALE_PROFILES.map((p) => p.name).join(', ')}`
    );
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

  for (const profile of profiles) {
    const cdm = generateCdmAtScale(profile);
    const entities = entityCount(cdm);

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

    const passes: Array<'first' | 'repeat'> = withRepeat ? ['first', 'repeat'] : ['first'];

    for (const pass of passes) {
      // One transaction for snapshot plus import, exactly as the worker does it: the
      // snapshot must commit if and only if the import does. Timing them separately
      // inside it is the only way to see which one grows.
      const timings = await db.transaction(async (tx) => {
        await setRlsContext(tx, scopeToRlsContext(scope));

        const snapshotStart = performance.now();
        await projectExport.exportProjectCdm(
          { projectId: project.id, scope, version: cdm.version },
          tx
        );
        const snapshotEnd = performance.now();

        const importResult = await projectImport.importProjectCdm(
          { projectId: project.id, scope, input: cdm },
          tx
        );
        const importEnd = performance.now();

        return {
          snapshotSeconds: (snapshotEnd - snapshotStart) / 1000,
          importSeconds: (importEnd - snapshotEnd) / 1000,
          totalSeconds: (importEnd - snapshotStart) / 1000,
          applied: appliedCount(importResult),
        };
      });

      if (timings.applied === 0) {
        throw new Error(
          `${profile.name} (${pass}): the import reported zero entities applied. A duration ` +
            'measured from an import that did nothing is not a measurement — refusing to report it.'
        );
      }

      results.push({ profile: profile.name, entities, pass, ...timings });
      process.stderr.write(
        `${profile.name} (${entities} entities, ${pass}): ` +
          `${timings.totalSeconds.toFixed(2)} s ` +
          `(snapshot ${timings.snapshotSeconds.toFixed(2)} s, ` +
          `import ${timings.importSeconds.toFixed(2)} s)\n`
      );
    }

    await db.delete(accounts).where(eq(accounts.id, account.id));
  }

  report(results);
  await db.$client.end();
  await CacheFactory.disconnect(cache);
}

function report(results: ReadonlyArray<PassResult>): void {
  const lines: string[] = [];

  lines.push('## Measured import durations', '');
  lines.push(
    '| Profile | Entities | Pass | Snapshot | Import | Total | Applied | ms/entity | vs 15 min |'
  );
  lines.push('| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const row of results) {
    const headroom = ((row.totalSeconds / LAMBDA_CEILING_SECONDS) * 100).toFixed(1);
    // Per-entity cost in the table because it is where superlinearity is visible without
    // any model at all: if this column climbs, no linear extrapolation is safe.
    const perEntity = ((row.totalSeconds / row.entities) * 1000).toFixed(1);
    lines.push(
      `| \`${row.profile}\` | ${row.entities.toLocaleString()} | ${row.pass} | ` +
        `${row.snapshotSeconds.toFixed(2)} s | ${row.importSeconds.toFixed(2)} s | ` +
        `**${row.totalSeconds.toFixed(2)} s** | ${row.applied.toLocaleString()} | ` +
        `${perEntity} | ${headroom}% |`
    );
  }

  const firstPasses = results.filter((row) => row.pass === 'first');
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
    `Ceiling ${LAMBDA_CEILING_SECONDS} s. Durations are snapshot + import inside one`,
    'transaction, matching `project-sync.job.ts`. They exclude queue latency and the',
    'job-row writes that bracket them.'
  );

  process.stdout.write(lines.join('\n') + '\n');
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
