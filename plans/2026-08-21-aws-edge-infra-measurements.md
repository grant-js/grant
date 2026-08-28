# Measurements — AWS edge and infrastructure

Seeded by slice 1; appended to by every deployed slice. The
[stack plan](./2026-08-21-aws-edge-infra-stack.md) § Verification model requires this
because phase C cannot be CI-verified past slice 2 — a recorded deploy is the
evidence that replaces a diff review.

The brief's timing and cost tables are **estimates**. Slice 7 replaces them with the
figures accumulated here. Where an estimate and a measurement disagree, the
measurement wins and the brief is corrected, not the other way round.

## Slice 1 — routing oracle

**Date**: 2026-08-27 · **AWS resources**: none · **Deploy**: n/a (CI-verified slice)

### Route table extracted from the existing implementations

| Source                                  | Routes parsed |
| --------------------------------------- | ------------- |
| `deploy/gateway.conf.template`          | 12            |
| `apps/web/next.config.ts` rewrites      | 17            |
| Declared in `deploy/aws/lib/routing.ts` | 11            |

Counts are recorded, not asserted. The test asserts _floors_ (10 and 15) so a parser
that silently stops matching fails instead of passing vacuously; asserting exact
counts would be a second table to maintain and would fail on every legitimate route
addition.

### Perturbation results

A green oracle proves nothing until it is shown to fail. Each row was applied to a
clean tree, run, and reverted.

| Perturbation                                        | Expected | Result          |
| --------------------------------------------------- | -------- | --------------- |
| Flip a declared target (`/docs/` → `web`)           | fail     | **1 failed** ✓  |
| Drop an API route from the declaration (`/health`)  | fail     | **2 failed** ✓  |
| Empty the intentional-divergence list               | fail     | **4 failed** ✓  |
| Rogue gateway route → API (`/billing`)              | fail     | **1 failed** ✓  |
| New API route in `next.config.ts` only (`/billing`) | fail     | **1 failed** ✓  |
| Rogue gateway route → **web** (`/billing`)          | **pass** | **39 passed** ✓ |
| Baseline                                            | pass     | **38 passed** ✓ |

The last-but-one row is correct non-detection, not a gap. A gateway location pointing
at `web` agrees with the `/` catch-all, so it is not drift — and CloudFront needs no
behaviour for it, because the default behaviour already serves it. The cases that
would break the AWS target are a route reaching the **API** without a matching
declaration, and both of those fail.

### Known limits of this oracle

Recorded so slice 2 does not assume more coverage than exists:

- **It compares intent, not behaviour.** Both sources are parsed as text. A gateway
  config that parses correctly but is rejected by nginx at runtime passes here.
- **It does not check ordering.** CloudFront evaluates behaviours in declaration
  order, and nginx applies its own `location` precedence rules. The declaration is
  ordered most-specific-first by convention; nothing enforces it yet. Slice 2 derives
  behaviours from that order, so ordering becomes load-bearing there.
- **`location = /path` redirect blocks are skipped.** The two trailing-slash redirects
  (`/api` → `/api/`, `/docs` → `/docs/`) express a redirect rather than a target. They
  are a stated gap in the brief, closed by a CloudFront Function in slice 3, and are
  not represented in the declaration.
- **The third witness does not exist yet.** Until slice 2 derives CloudFront
  behaviours from `CANONICAL_ROUTES`, this checks two implementations, not three.

## Slice 2 — construct library

**Date**: 2026-08-28 · **AWS resources**: none · **Deploy**: n/a (CI-verified slice)

### The third witness

Slice 1 compares two implementations by parsing them. CloudFront behaviours are
**generated** from the same declaration, which is strictly stronger: a route cannot
be in the table and missing from the distribution.

Derived plan, in CloudFront evaluation order, as emitted in the committed template's
`RoutingPlan` output:

| #   | Path pattern      | Origin            | Cache     |
| --- | ----------------- | ----------------- | --------- |
| 1   | `/org/*`          | api               | disabled  |
| 2   | `/acc/*`          | api               | disabled  |
| 3   | `/.well-known/*`  | api               | short     |
| 4   | `/api-docs*`      | api               | disabled  |
| 5   | `/graphql*`       | api               | disabled  |
| 6   | `/health*`        | api               | disabled  |
| 7   | `/docs/*`         | docs-bucket       | long      |
| 8   | `/api/*`          | api               | disabled  |
| 9   | `/_next/static/*` | web-assets-bucket | immutable |

`/storage` is omitted (mounted only for `STORAGE_PROVIDER=local`), as are the web
catch-all (CloudFront's default behaviour) and `/example` (not deployed here).

### A bug the synth output caught

The first synth emitted `/org/*=>api:short` and `/acc/*=>api:short`.

`toPathPattern` truncates at the first wildcard, so the canonical route
`/org/<id>/prj/<id>/.well-known/` becomes `/org/*` — but the cache policy was still
being derived from the **narrow** route, which contains `.well-known` and is
cacheable. The behaviour that actually ships matches every path under `/org/`, so a
per-tenant API response would have been served from the edge.

Fixed by deriving the policy from what the behaviour matches: any widened pattern is
never cached. `behaviours.test.ts` now asserts this directly, and the table above is
the corrected output. **This is the argument for committing synth output** — the
defect was invisible in the diff and obvious in the artifact.

### Perturbation results

| Perturbation                                     | Expected            | Result            |
| ------------------------------------------------ | ------------------- | ----------------- |
| Rename a declared route (`/health` → `/healthz`) | `synth:check` fails | **out of date** ✓ |
| Snapshot untracked (new stack, never added)      | `synth:check` fails | **out of date** ✓ |
| Snapshot staged and identical                    | pass                | **up to date** ✓  |
| Clean tree                                       | pass                | **up to date** ✓  |

The second row is why `synth:check` uses `git status --porcelain` rather than
`git diff --exit-code`: a plain diff only sees tracked files, so a newly added
stack's template would be ignored — the drift most worth catching. Porcelain's two
status columns distinguish "staged and identical" (a commit in progress, fine) from
"regenerated and changed" (drift).

### Gates

`lint` · `type-check` · `dead-code:deploy` · **123 tests** · `synth:check` — all clean.

### Known limits

- **No resources are created.** The template contains outputs and CDK metadata only.
  `grant-platform.test.ts` asserts exactly that, so a later slice landing early is
  visible rather than silent.
- **Behaviour _derivation_ is verified; behaviour _wiring_ is not.** Nothing yet
  builds a `Distribution` from this plan. Slice 3 does, and its deploy is the first
  evidence the patterns behave as CloudFront reads them.
- **`cdk synth` is hermetic on purpose.** The reference app uses
  `fromHostedZoneAttributes`, never `fromLookup`, and sets no `env` on the stack — so
  the committed template does not depend on which account last ran synth (ADR 0005).

## Slice 3 — docs site

_Not started._

## Slice 4 — API and data tier

_Not started._

## Slice 5 — web

_Not started._

## Slice 6 — scheduled jobs

_Not started._

## Slice 7 — smoke test and guide

_Not started._
