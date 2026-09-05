/**
 * End-to-end smoke test against a deployed distribution.
 *
 *   pnpm --filter grant-aws-deploy smoke https://grant.example.com
 *
 * The routing table has no CI coverage anywhere past synthesis: slice 1's oracle
 * proves the three declarations agree, and `toCloudFrontBehaviours()` proves the
 * distribution is generated from the same table — but nothing proves a request for
 * `/graphql` reaches the API rather than the web app's 404. This is that proof, and
 * it is the only one the story gets.
 *
 * **Coverage is enforced, not curated.** The behaviour list comes from the library,
 * so a behaviour added without a check here fails the run rather than passing
 * silently. That is the whole reason this reads the table instead of hard-coding ten
 * paths: a hand-written list drifts the moment someone adds a route, and a smoke test
 * that quietly stops covering something is worse than no smoke test.
 *
 * Read-only by default. `--register <email>` additionally creates an account, which
 * is the one check that writes to the database.
 */

import { ASSET_BEHAVIOURS, toCloudFrontBehaviours } from '../lib/behaviours';

/** The default behaviour's pattern. CloudFront has no literal pattern for it. */
const DEFAULT_BEHAVIOUR = '*';

interface CheckResult {
  readonly ok: boolean;
  /** What was observed, for the results table — short enough to read in a row. */
  readonly detail: string;
}

interface Check {
  /**
   * The CloudFront path pattern this check exercises, verbatim.
   *
   * Matched against the generated behaviour list, so a typo here surfaces as an
   * uncovered behaviour rather than as a check that silently guards nothing.
   */
  readonly behaviour: string;
  readonly name: string;
  run(base: string): Promise<CheckResult>;
}

function pass(detail: string): CheckResult {
  return { ok: true, detail };
}

function fail(detail: string): CheckResult {
  return { ok: false, detail };
}

/**
 * `redirect: 'manual'` throughout: a check for a 302 that silently follows it is
 * asserting the wrong thing, and the trailing-slash function is exactly such a check.
 */
async function get(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { redirect: 'manual', ...init });
}

/** JSON, or a marker — an HTML body here means the request reached the wrong origin. */
async function readJson(response: Response): Promise<unknown | undefined> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Which origin answered, from headers rather than from the body.
 *
 * The widened `/org/*` and `/acc/*` behaviours are checked for *routing*, and the
 * only correct response to a project that does not exist is a 404 — from the API.
 * The body cannot carry that distinction: the API's 404 here has `content-length: 0`,
 * so "the body parses as JSON" fails on a correctly-routed request. These two headers
 * can: Express's request-logging middleware sets `x-request-id` on every API response,
 * and Next sets `x-powered-by` on its own.
 */
function whichAppAnswered(response: Response): CheckResult {
  if (response.headers.get('x-request-id')) {
    return pass(`${response.status} from the API`);
  }
  const poweredBy = response.headers.get('x-powered-by');
  return fail(
    `${response.status} from ${poweredBy ?? 'an unidentified origin'} — expected the API`
  );
}

const CHECKS: readonly Check[] = [
  {
    behaviour: DEFAULT_BEHAVIOUR,
    name: 'Web app at the root',
    async run(base) {
      // next-intl redirects the bare root to the negotiated locale, so a 200 here
      // would mean the middleware did not run.
      const response = await get(base);
      const location = response.headers.get('location') ?? '';
      if (response.status === 307 || response.status === 302) {
        return /^\/(en|de)/.test(location)
          ? pass(`${response.status} → ${location}`)
          : fail(`${response.status} → ${location} (not a locale)`);
      }
      return fail(`${response.status}, expected a locale redirect`);
    },
  },
  {
    behaviour: DEFAULT_BEHAVIOUR,
    name: 'Web app renders a page',
    async run(base) {
      const response = await get(`${base}/en/auth/login`);
      const body = await response.text();
      if (response.status !== 200) return fail(`${response.status}`);
      // Server-rendered markup, not the shell: proves the function ran rather than
      // that something returned 200.
      return body.includes('<!DOCTYPE html>') && body.includes('_next')
        ? pass(`200, ${body.length} bytes of HTML`)
        : fail('200 but the body is not a rendered Next page');
    },
  },
  {
    behaviour: '/_next/static/*',
    name: 'Static assets, cached immutable',
    async run(base) {
      // Discovered from the rendered page rather than guessed: Next randomises its
      // build ID per build, so a hard-coded asset path would test the previous deploy.
      const page = await get(`${base}/en/auth/login`);
      const html = await page.text();
      const match = html.match(/\/_next\/static\/[^"']+\.js/);
      if (!match) return fail('no /_next/static asset referenced in the page');

      const response = await get(`${base}${match[0]}`);
      const cacheControl = response.headers.get('cache-control') ?? '';
      if (response.status !== 200) return fail(`${response.status} for ${match[0]}`);
      return cacheControl.includes('immutable')
        ? pass(`200, ${cacheControl}`)
        : fail(`200 but cache-control is "${cacheControl}"`);
    },
  },
  {
    behaviour: '/health*',
    name: 'API liveness',
    async run(base) {
      const response = await get(`${base}/health`);
      const body = (await readJson(response)) as { status?: string } | undefined;
      return response.status === 200 && body?.status === 'ok'
        ? pass(`200, status=ok`)
        : fail(`${response.status}, body=${JSON.stringify(body)?.slice(0, 60)}`);
    },
  },
  {
    behaviour: '/api/*',
    name: 'REST router',
    async run(base) {
      const response = await get(`${base}/api/config`);
      const body = await readJson(response);
      if (response.status !== 200) return fail(`${response.status}`);
      return body !== undefined
        ? pass('200, JSON config document')
        : fail('200 but the body is not JSON — wrong origin?');
    },
  },
  {
    behaviour: '/graphql*',
    name: 'GraphQL endpoint',
    async run(base) {
      const response = await get(`${base}/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      const body = (await readJson(response)) as { data?: { __typename?: string } } | undefined;
      return response.status === 200 && body?.data?.__typename === 'Query'
        ? pass('200, __typename=Query')
        : fail(`${response.status}, body=${JSON.stringify(body)?.slice(0, 80)}`);
    },
  },
  {
    behaviour: '/api-docs*',
    name: 'OpenAPI document',
    async run(base) {
      // The prefix widening is the point: `/api-docs.json` is covered by
      // `/api-docs*` the same way nginx's `location /api-docs` covers it.
      const response = await get(`${base}/api-docs.json`);
      const body = (await readJson(response)) as
        { openapi?: string; paths?: Record<string, unknown> } | undefined;
      if (response.status !== 200) return fail(`${response.status}`);
      const paths = Object.keys(body?.paths ?? {}).length;
      return body?.openapi !== undefined && paths > 0
        ? pass(`200, openapi ${body.openapi}, ${paths} paths`)
        : fail('200 but not an OpenAPI document');
    },
  },
  {
    behaviour: '/.well-known/*',
    name: 'Platform JWKS',
    async run(base) {
      const response = await get(`${base}/.well-known/jwks.json`);
      const body = (await readJson(response)) as { keys?: unknown[] } | undefined;
      return response.status === 200 && Array.isArray(body?.keys) && body.keys.length > 0
        ? pass(`200, ${body.keys.length} key(s)`)
        : fail(`${response.status}, body=${JSON.stringify(body)?.slice(0, 60)}`);
    },
  },
  {
    behaviour: '/org/*',
    name: 'Organization-addressed well-known reaches the API',
    async run(base) {
      // A project that does not exist. The assertion is *which app answers*, not
      // that the project resolves: the widened `/org/*` pattern must not fall
      // through to the web catch-all.
      return whichAppAnswered(
        await get(
          `${base}/org/00000000-0000-0000-0000-000000000000/prj/00000000-0000-0000-0000-000000000000/.well-known/jwks.json`
        )
      );
    },
  },
  {
    behaviour: '/acc/*',
    name: 'Account-addressed well-known reaches the API',
    async run(base) {
      return whichAppAnswered(
        await get(
          `${base}/acc/00000000-0000-0000-0000-000000000000/prj/00000000-0000-0000-0000-000000000000/.well-known/jwks.json`
        )
      );
    },
  },
  {
    behaviour: '/docs/*',
    name: 'Documentation index',
    async run(base) {
      // Also the index-rewrite function: the S3 origin under OAC resolves no
      // directory index, so a bare `/docs/` 404s without it.
      const response = await get(`${base}/docs/`);
      const body = await response.text();
      if (response.status !== 200) return fail(`${response.status}`);
      return body.includes('<!DOCTYPE html>')
        ? pass(`200, ${body.length} bytes, index rewritten`)
        : fail('200 but not an HTML document');
    },
  },
  {
    behaviour: DEFAULT_BEHAVIOUR,
    name: 'Trailing-slash redirect for /docs',
    async run(base) {
      // The bare path does not match `/docs/*`, so only the catch-all sees it —
      // which is why this check is attached to the default behaviour.
      const response = await get(`${base}/docs`);
      const location = response.headers.get('location');
      return response.status === 302 && location === '/docs/'
        ? pass(`302 → ${location}`)
        : fail(`${response.status} → ${location ?? '(none)'}`);
    },
  },
  {
    behaviour: DEFAULT_BEHAVIOUR,
    name: 'Trailing-slash redirect for /api',
    async run(base) {
      const response = await get(`${base}/api`);
      const location = response.headers.get('location');
      return response.status === 302 && location === '/api/'
        ? pass(`302 → ${location}`)
        : fail(`${response.status} → ${location ?? '(none)'}`);
    },
  },
];

/**
 * Every generated behaviour needs a check. Reported as a failure rather than a
 * warning: a smoke test with a hole in it is the failure mode this file exists to
 * prevent.
 */
function uncoveredBehaviours(): string[] {
  const covered = new Set(CHECKS.map((check) => check.behaviour));
  const declared = [
    DEFAULT_BEHAVIOUR,
    ...toCloudFrontBehaviours().map((behaviour) => behaviour.pathPattern),
    ...ASSET_BEHAVIOURS.map((behaviour) => behaviour.pathPattern),
  ];
  return declared.filter((pattern) => !covered.has(pattern));
}

/** Checks referring to a pattern the distribution does not have — a stale check. */
function unknownBehaviours(): string[] {
  const declared = new Set([
    DEFAULT_BEHAVIOUR,
    ...toCloudFrontBehaviours().map((behaviour) => behaviour.pathPattern),
    ...ASSET_BEHAVIOURS.map((behaviour) => behaviour.pathPattern),
  ]);
  return [...new Set(CHECKS.map((check) => check.behaviour))].filter(
    (pattern) => !declared.has(pattern)
  );
}

/**
 * Account creation — the one check that writes.
 *
 * Opt-in because it is not idempotent: a second run with the same address gets a
 * conflict, which is a correct response to an incorrect test.
 *
 * The password comes from `SMOKE_REGISTER_PASSWORD` and is **required**. An earlier
 * version generated one and printed it, so the created account was usable — but a
 * smoke test that writes a credential to stdout puts it in CI logs and scrollback,
 * and the guard that stopped it printing an operator-supplied value was invisible to
 * static analysis (CodeQL, correctly, could not see it). Requiring the caller to
 * supply a password they already know removes the output entirely rather than
 * guarding it.
 *
 * This creates a **real, persistent account**. Do not point it at a deployment you
 * care about; nothing here cleans it up.
 */
async function registerAccount(base: string, email: string): Promise<CheckResult> {
  const password = process.env.SMOKE_REGISTER_PASSWORD;
  if (!password) {
    return fail('set SMOKE_REGISTER_PASSWORD to use --register; it is never generated or printed');
  }

  const response = await get(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Test',
      type: 'personal',
      provider: 'email',
      providerId: email,
      providerData: { password },
    }),
  });
  const body = (await readJson(response)) as
    { data?: { account?: { id?: string }; user?: { id?: string } } } | undefined;

  if (response.status !== 201) {
    return fail(`${response.status}, body=${JSON.stringify(body)?.slice(0, 200)}`);
  }
  return pass(`201, account=${body?.data?.account?.id ?? 'unknown'}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const base = args.find((arg) => arg.startsWith('http'))?.replace(/\/$/, '');
  if (!base) {
    console.error('usage: smoke.ts <https://host> [--register <email>]');
    process.exit(2);
  }

  const registerIndex = args.indexOf('--register');
  const registerEmail = registerIndex === -1 ? undefined : args[registerIndex + 1];

  const uncovered = uncoveredBehaviours();
  const unknown = unknownBehaviours();

  console.log(`\nSmoke test — ${base}\n`);

  const results: { name: string; behaviour: string; result: CheckResult }[] = [];
  for (const check of CHECKS) {
    let result: CheckResult;
    try {
      result = await check.run(base);
    } catch (error) {
      result = fail(`threw: ${(error as Error).message}`);
    }
    results.push({ name: check.name, behaviour: check.behaviour, result });
    console.log(
      `${result.ok ? '  ok  ' : ' FAIL '} ${check.behaviour.padEnd(17)} ${check.name} — ${result.detail}`
    );
  }

  if (registerEmail) {
    const result = await registerAccount(base, registerEmail);
    results.push({ name: 'Account registration', behaviour: '/api/*', result });
    console.log(
      `${result.ok ? '  ok  ' : ' FAIL '} ${'/api/*'.padEnd(17)} Account registration — ${result.detail}`
    );
  }

  console.log('');
  if (uncovered.length > 0) {
    console.error(`Behaviours with no check: ${uncovered.join(', ')}`);
  }
  if (unknown.length > 0) {
    console.error(`Checks for behaviours that do not exist: ${unknown.join(', ')}`);
  }

  const failed = results.filter((entry) => !entry.result.ok).length;
  const behaviourCount =
    toCloudFrontBehaviours().length + ASSET_BEHAVIOURS.length + 1; /* default */
  console.log(
    `${results.length - failed}/${results.length} checks passed, ` +
      `covering ${behaviourCount - uncovered.length}/${behaviourCount} behaviours\n`
  );

  process.exit(failed > 0 || uncovered.length > 0 || unknown.length > 0 ? 1 : 0);
}

await main();
