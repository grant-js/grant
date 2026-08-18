# Code quality: the internal `@grantjs/*` packages

Pass 6. Audited 2026-08-16 against `main` @ `178dd710`.

- **Brief**: [`plans/2026-08-16-internal-packages-code-quality-brief.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-16-internal-packages-code-quality-brief.md)
- **Stack plan**: [`plans/2026-08-16-internal-packages-code-quality-stack.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-16-internal-packages-code-quality-stack.md) — including its [corrections log](https://github.com/grant-js/grant/blob/main/plans/2026-08-16-internal-packages-code-quality-stack.md#corrections)

## Summary

The first pass whose headline finding was that **nothing had ever run**. Nine of the twelve packages — the entire core-port adapter layer — had no `lint` script, so `turbo lint` skipped them silently. Three lenses that looked clean were clean because no tool had looked.

Underneath that sat a Tier 0 that had survived five code-quality passes: CloudWatch telemetry could never have worked.

|                                     | Before                           | After                         |
| ----------------------------------- | -------------------------------- | ----------------------------- |
| Packages in scope                   | 13                               | 12 (`platform` deleted)       |
| Hand-written `src`                  | 6,340                            | 6,286                         |
| Packages `turbo lint` actually runs | **3 of 12**                      | **12 of 12**                  |
| Repo-wide lint tasks                | 17                               | 23                            |
| ESLint DAG rules                    | 3 (`core`, `database`, `schema`) | 15                            |
| `dead-code:*` gates                 | 5                                | 6 (`:packages` covers all 12) |
| Tests                               | **0**                            | 54                            |
| Raw `throw new Error`               | 14                               | 1 (documented exemption)      |
| Domain-error throws                 | 43                               | 56                            |
| `noopLogger` declarations           | 8, in 7 packages                 | 1, in `core`                  |
| Exports with no external reference  | 89                               | 47                            |

## What holds {#what-holds}

| Lens                  | Result                                                                               | Evidence                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Layer integrity   | **Clean.** Every `@grantjs/*` import in all 12 respects the DAG                      | Only `core` (10 packages) and `schema` (`jobs` only). `env` and `i18n` import nothing. No adapter imports another adapter. Now enforced by 12 rules |
| 2 — Import discipline | **Clean.** No package imports `@grantjs/logger`; all take `ILoggerFactory` injection | The three apparent hits were **prose in doc comments saying they must not** — rule 2, checked before filing                                         |
| Logging discipline    | **Clean.** Zero `console.*` in runtime source                                        | —                                                                                                                                                   |

**But "clean" meant less than it looked.** See [Tier 1](#tier-1) — nine of these packages had never been linted, so a green result was the absence of a check, not the absence of a violation.

## Tier 0 — correctness defects found while auditing {#tier-0}

### CloudWatch telemetry could never have worked — **fixed** (slice 2)

`telemetry/src/cloudwatch.ts` called `require()` twice inside a package declaring `"type": "module"`. `require` is not defined in ESM, so **every** `sendLog` threw `ReferenceError: require is not defined`.

`TELEMETRY_PROVIDER=cloudwatch` is a validated enum value (`env/src/schema.ts:211`) wired through `apps/api/src/config/env.config.ts:517-525`, so the provider was selectable and non-functional. The `catch` reported `install @aws-sdk/client-cloudwatch-logs` — pointing operators at an already-declared peer whose installation would not have helped.

**Proven, not reasoned**: compiled the package with its own `tsconfig.build.json`, confirmed `require(...)` survives verbatim into ESM output, and executed both forms in the package's own resolution context. `require` throws; `await import` returns a working client.

**A second defect was hiding behind the first.** `require()` returns `any`, so the hand-rolled `{ send: (cmd: unknown) => … }` client type never had to match `CloudWatchLogsClient` — and does not. Fixing the import made the type real and `tsc` rejected it immediately. Now typed through a **type-only** import, erased at compile time so the optional peer stays optional at runtime.

**The single-style reading is the same fact twice**: `email/ses/index.ts:1` and `storage/s3/index.ts:1` load the same class of optional AWS peer with plain static imports. `telemetry` was the only package using `require()`, and the only one that had never been linted.

## Tier 1 — the guardrails did not reach these packages {#tier-1}

### Nine packages had no `lint` script at all — **resolved** (slice 2)

`pnpm run lint` is `turbo lint`, which runs each package's own script and **silently skips packages that do not define one**. `analytics`, `cache`, `email`, `errors`, `jobs`, `logger`, `storage`, `telemetry` and `webhooks` had none.

`turbo lint --dry-run` reported **17** tasks where 23 should run. Adding the twelve DAG rules alone would have produced nine rules that are syntactically valid, permanently green, and never executed.

This is pass 3's carried input — _a guardrail that passes is not a guardrail that works_ — displaced one level up. **Check that the runner runs the rule, not just that the rule is correct:**

```sh
turbo <task> --dry-run=json   # then filter on command !== '<NONEXISTENT>'
```

Enabling lint surfaced 14 errors immediately: 12 autofixable import-sort, plus the two `require()` calls that turned out to be the Tier 0 above.

### The DAG rules — **resolved** (slice 2)

Twelve per-package scopes in `eslint.config.mjs`, each allowed set derived from **that package's own `package.json`**:

| Allowed to import | Packages                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `core` only       | `analytics` `cache` `constants` `email` `errors` `logger` `storage` `telemetry` `webhooks` |
| `core` + `schema` | `jobs`                                                                                     |
| nothing           | `env` `i18n`                                                                               |

Expressed as **negated patterns** rather than path lists, for the reason schema's rule already records: a pattern covers a new workspace package the day it is created.

**All twelve proven to fire in both directions**, not assumed — a planted `@grantjs/database` import errors in all twelve, and `@grantjs/schema` is accepted in `jobs` while rejected in `cache`, confirming the allowlist is genuinely per-package rather than a blanket ban.

## Tier 2 — repetition {#tier-2}

### One `noopLogger`, not eight — **resolved** (slice 5)

An 11-line silent-logger block appeared at **8 declaration sites across 7 packages**. Now a single export beside `ILogger` in `core`'s logger port. Net −76 lines; every call site (`loggerFactory?.createLogger(name) ?? noopLogger`) is character-for-character unchanged. All seven packages already depended on `core`, so this added no edge to the DAG.

**The brief undercounted it, and the reason is rule 1 in its original form.** It said "6 sites across 5 packages, byte-identical including the comment." The grep matched `const noopLogger: ILogger`, which cannot see the two spelling the annotation `import('@grantjs/core').ILogger`. Three of the eight also differ in their comment. Grep finds instances; a second spelling hides the rest.

What caught it was writing the de-duplication script to **assert each block was present** rather than sweep with a loose regex. A sweep would have removed five, left three, and looked successful.

## Tier 3 — divergent styles {#tier-3}

### 3.1 Error vocabulary — **resolved** (slice 4)

14 raw `throw new Error` against 43 domain throws. The split was the evidence: `email` (0/25) and `storage` (0/11) were compliant while `jobs` was mixed **10-to-3 inside one package**.

13 converted — `NotFoundError`, `ConflictError`, `ValidationError` in `jobs`; `NotFoundError` in `constants`. Checked the catch sites first: nothing in `apps/api` matches on `.message` or absence of `.code`.

**`env` is exempt, and the exemption is structural.** `@grantjs/env` declares no workspace dependency at all — it parses the environment before the rest of the graph loads, and its own DAG rule forbids every `@grantjs/*` import. Complying would mean taking a dependency on `core` in the one package deliberately kept dependency-free. This is the rubric's **unfollowable rule** case: recorded against the rule (`AGENTS.md` § Error handling) rather than fixed in the code.

### 3.2 Factory style — **open, cheap**

Six adapters export `class XFactory` with static methods; `webhooks` alone exports `function createWebhookAdapters`. `AGENTS.md` describes adapters as receiving config "via constructor/factory params" without picking one. 6-vs-1 makes the cheaper direction obvious; not actioned.

### 3.3 Two `tsconfig.build.json` dialects — **recorded** (slice 7)

Of the **18** packages carrying one, **12 extend the shared `packages/@grantjs/tsconfig.build.json`** and **6 extend their own `./tsconfig.json`** (`client`, `cli`, `core`, `database`, `env`, `server`). This is why the `database` leak below could not be fixed in the shared parent. Converging them is its own story.

## Tier 4 — dead surface {#tier-4}

**`knip` cannot measure this, and its zero is not a result.** `knip.json` sets `entry: ["src/index.ts"]` for `packages/@grantjs/*`, so every barrel re-export counts as used **by construction**. Everything below came from cross-referencing consumers.

82 exports had no reference outside their own package. Counted by **the edit each implies** (rule 4), it is barely a deletion finding:

| Edit                                            | Count | Risk                                                    |
| ----------------------------------------------- | ----- | ------------------------------------------------------- |
| Used only in its declaring file → drop `export` | 28    | None — the export was the accident                      |
| Used across files in the same package           | 40    | Must stay exported; barrel surface is a policy question |
| No use anywhere                                 | 7     | Examined individually                                   |

### Both rule-7 ambiguities resolved to "not dead"

The brief flagged two as needing a human decision. The code answered both, and the answer was **a third option the brief did not enumerate**: used _inside_ the package, invisible to a cross-package reference count.

- **`@grantjs/errors`' 8 `Http*` subclasses are alive.** `mapDomainToHttp` constructs every one; they are the mapper's return vocabulary.
- **`constants`' account-tier roles are alive.** `ACCOUNT_ROLES` → `ACCOUNT_ROLE_DEFINITIONS` → `ROLES`, which has four external importers. There is no unbuilt tier.

### Five deleted, two deliberately kept

Deleted after confirming each was **superseded** rather than unwired: `isValidTagColor`, `isDisplayableTagColor`, `getTagBackgroundClasses` (`apps/api` validates via `z.enum(TAG_COLORS)` and a `.refine` on the same array — these were a second implementation of a live check), and `getRawPinoLogger` / `createContextLogger`, offered by their doc "for pino-http", which `apps/api` does not use.

Kept, per rule 7's rule that a validator with no callers is ambiguous evidence:

- **`isDefaultResourceAction`** — nothing validates resource actions anywhere, so this is the ambiguous case. But wiring it in would likely be **wrong**: the name says DEFAULT and custom actions appear legitimate. Open.
- **`TenantJobPayload`** — the documented payload shape for tenant-scoped jobs, no importer. Deleting a contract type in a package whose docs describe that contract wants a decision.

**Deletion cascaded twice and both rounds were followed**: `TAG_BACKGROUND_CLASSES` was orphaned by the three colour guards, then `backgroundAliases` by it. Its twin `TAG_BORDER_CLASSES` stays, still feeding `getTagBorderClasses`, which `apps/web` uses.

### `@grantjs/platform` deleted whole {#platform}

28 lines, 7 exports, **0 importers**, `private`, no `tsconfig.build.json`, absent from the production image's package list. Gate 1 considered relocating its literals into `@grantjs/constants` and rejected it:

- `OAUTH_PREFIX` and `EXAMPLE_PREFIX` matched **zero** hard-coded sites repo-wide.
- `WELL_KNOWN_PREFIX` is never composed from — all seven `/.well-known` sites use the full literal `/.well-known/jwks.json`.
- **It modelled the wrong contract.** The real `apps/api` ↔ `apps/web` routing coupling is `next.config.ts`'s rewrite table — **17 `source:` entries** including `/api-docs` and the swagger assets, which `platform` never declared.
- `constants` is domain vocabulary (permissions, roles, colours, time). Route prefixes are transport, and `constants/src/permissions/permissions.ts:1` imports `ComparisonOperator` from `core` as a **value**, so any consumer reaching for `/graphql` would inherit the core→schema chain.

## Tier 6 — coverage {#tier-6}

Zero tests before the pass; **54** after, all mutation-checked before being counted.

**Where the value is**: `webhooks/src/ssrf.ts` (the SSRF guard) and `signer.ts` had no tests at all. Two results worth keeping:

- **The classic bypass set does not work, and not because of the guard's logic.** `2130706433`, `0177.0.0.1`, `0x7f.0.0.1` and `127.1` are all normalised to `127.0.0.1` by the WHATWG `URL` parser before `isIP()` sees them. Pinned explicitly, because a refactor to `url.parse`, a regex, or a raw string would silently reopen all four. `delivery.ts` sets `redirect: 'error'`, closing the redirect vector.
- **IPv6 literals are never recognised as literal addresses** — see the open item below.

**Two limits on what lens 7 can detect here**, both discovered by trying:

1. **Vitest does not reproduce the production module system.** Vite's transform supplies CJS interop, so `typeof require` is `'function'` in a test where it is `undefined` in the ESM output Node runs. Reverting the Tier 0 fix leaves the suite **green** — verified by mutating and re-running. No ESM/CJS defect in these packages is detectable by unit test; the ESLint rule is the guard. A test pinning `typeof require === 'function'` is left behind so the day vitest changes, someone is told.
2. **A mutation that fails to apply looks exactly like a passing test.** One early mutation silently did not match and reported green. Every mutation now asserts it changed the file before the suite runs.

## Open items {#open}

| Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Where                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **IPv6 literals are never recognised as literal addresses.** `url.hostname` keeps the brackets (`[::1]`), `isIP('[::1]')` is `0`, so every IPv6 target falls through to DNS and is rejected as "could not be resolved". **Fails closed — not an SSRF hole.** But `isPrivateIPv6` is dead code on that path, the message is wrong, and **a public IPv6 literal cannot be configured at all**. The one-line fix _changes what the guard admits_, so it wants Security and its own slice | `webhooks/src/ssrf.ts:107`     |
| **`jobRegistry` is documented but unwired.** `docs/advanced-topics/job-scheduling.md:77` imports it from `@/lib/jobs/job-registry`, a path that does not exist. `apps/api` composes jobs through `JobFactory` + `createJobs`. Either the doc or the registry is wrong                                                                                                                                                                                                                 | `jobs/src/registry.ts:90`      |
| **`isDefaultResourceAction` and `TenantJobPayload`** — the two rule-7 keeps above                                                                                                                                                                                                                                                                                                                                                                                                     | `constants`, `jobs`            |
| **The 40 cross-file exports** — each must stay exported at module level, but whether the package _barrel_ should re-export it is an unmade policy decision                                                                                                                                                                                                                                                                                                                            | all 12                         |
| **Factory style**, 6 static classes vs 1 function                                                                                                                                                                                                                                                                                                                                                                                                                                     | Tier 3.2                       |
| **`tsconfig.build.json` dialects**, 12 vs 6                                                                                                                                                                                                                                                                                                                                                                                                                                           | Tier 3.3                       |
| **Two ineffective excludes in `database`**: `src/seed/**/*` matches nothing (no such directory), and `src/scripts/**/*` cannot take effect because `bootstrap.ts` imports from it — and those files _should_ ship                                                                                                                                                                                                                                                                     | `database/tsconfig.build.json` |
| **`apps/config` has never been audited** — 31 files, 4,839 lines, in no pass table until now                                                                                                                                                                                                                                                                                                                                                                                          | —                              |

## What this pass's method surfaced {#method}

Five claims in this pass's own planning documents were disproved by implementing them; all five are in the [corrections log](https://github.com/grant-js/grant/blob/main/plans/2026-08-16-internal-packages-code-quality-stack.md#corrections). The transferable ones:

**Check that the runner runs the check.** Nine packages had rules that would never execute because no script invoked the linter. Every previous pass verified that its rule was _correct_; none verified that anything _ran_ it.

**A silently failed read looks exactly like data.** Three times: a `node -e "require(…)"` that threw on a JSON file with comments and printed blank, read as "no `extends`"; a `for` loop over an unquoted variable that ran once instead of twelve times under zsh; a mutation whose search string did not match, reporting green. In all three the tool produced _something_, and the something was mistaken for a result.

**Scope the search to the unit, not to `src/`.** The dead-export classifier scanned `src/` only and reported a symbol as dead that `constants/scripts/check-palette-distance.ts` imports. Two more were referenced only from `docs/`. A package is not its `src/` directory.

**Read `--help` before concluding a tool cannot do something.** Two `gh stack` errors were written into a stack plan as a tool limitation. `gh stack init --help` states the opposite in one sentence. Two refusals formed a coherent story and the story was wrong — the same shape as pass 5's C3, where a truncated search result explained itself convincingly.
