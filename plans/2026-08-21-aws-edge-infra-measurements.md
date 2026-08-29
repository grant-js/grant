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

## Slice 3a — docs site (constructs)

**Date**: 2026-08-28 · **Deploy**: **not performed — see 3b**

### Split, and why

The plan's slice 3 is "docs on S3, CloudFront, cert, zone, Function", verified by a
recorded deploy. No AWS CLI or credentials exist on the build machine, so the deploy
half cannot be produced. Everything else can, and is: constructs, synth, and unit
tests, all CI-verifiable.

Split along the same line as phase B's 6a/6b — what can be verified locally versus
what needs an account.

- **3a (this)** — constructs and synth. CI evidence.
- **3b (pending)** — deploy into a scratch account, `cdk destroy`, measurements.

### Resources synthesized

18 resources, from `cdk.snapshot/GrantPlatform.template.json`:

| Type                                                      | Count |
| --------------------------------------------------------- | ----- |
| `AWS::CloudFront::Distribution`                           | 1     |
| `AWS::CloudFront::Function`                               | 2     |
| `AWS::CloudFront::OriginAccessControl`                    | 1     |
| `AWS::S3::Bucket` + policy                                | 2     |
| `AWS::CertificateManager::Certificate`                    | 1     |
| `AWS::Route53::RecordSet` (A, AAAA)                       | 2     |
| `Custom::CDKBucketDeployment` + handler/role/policy/layer | 5     |
| `Custom::S3AutoDeleteObjects` + provider                  | 3     |
| `AWS::CDK::Metadata`                                      | 1     |

Synth takes **3.7s** including the 19 MB docs asset.

### Two latent repo bugs this slice surfaced

**1. `turbo.json` did not track the docs build output.** Build outputs were
`.next/**`, `dist/**`, `build/**`; VitePress writes to `<pkg>/.vitepress/dist`, which
none of them match. Measured rather than assumed:

```
rm -rf docs/.vitepress/dist && pnpm run build --filter=grant-docs
  grant-docs:build: cache hit, replaying logs
  >>> FULL TURBO
  dist STILL MISSING
```

CI runs on a **self-hosted** runner with a persistent turbo cache, so `synth:check`
would have failed there with `«CannotFindAsset»` while passing on any machine that
had built docs recently. Fixed by adding `.vitepress/dist/**` to the build outputs;
a cache hit now restores it.

**2. Asset hashes churned the committed template.** CDK bakes a content hash into
every asset's S3 key, and the docs site is an asset. Measured: adding one file to
`docs/.vitepress/dist` changed the hash set, so **any documentation edit would have
failed `synth:check`**. The snapshot is evidence about structure, not content, so
`snapshot-template.mjs` now normalizes 64-hex hashes to `<asset-hash>`. Verified in
both directions — a docs edit no longer changes the template, and a structural change
(`PriceClass.PRICE_CLASS_100` → `_ALL`) still fails the check.

### Perturbation results

| Perturbation                        | Expected            | Result                                       |
| ----------------------------------- | ------------------- | -------------------------------------------- |
| Docs content edit (add one file)    | template unchanged  | **unchanged** ✓                              |
| Structural change (price class)     | `synth:check` fails | **out of date** ✓                            |
| Missing `docs/.vitepress/dist`      | actionable error    | **"Run `pnpm --filter grant-docs build`"** ✓ |
| Cached turbo build, no dist on disk | dist restored       | **restored** ✓                               |

### Gates

`lint` · `type-check` · `dead-code:deploy` · **149 tests** · `synth:check` ·
`format:check` — all clean. Test count 123 → 149; the 26 new cover the two
CloudFront Functions as executed code, the docs key layout, OAC, and DNS.

### Known limits

- **Nothing has been deployed.** Every claim here is about synthesized structure.
  CloudFront path-pattern semantics, OAC policy acceptance, ACM DNS validation and
  index resolution against a real S3 origin are all unverified until 3b.
- **The root path 404s.** The docs bucket is the default origin until the web app
  lands in slice 5, and content lives under the `docs/` key prefix. `/docs/…` is what
  this slice claims to serve.
- **Certificate region is not asserted for the created path.** A supplied ARN is
  checked lexically for `us-east-1`; one created here inherits the stack's region, so
  the stack must target us-east-1 until a cross-region certificate stack exists.
  Slice 4 forces that decision, because the API and data tier will want a region
  chosen for latency.
- **`pre-push` reordered.** `synth:check` now runs after `build`, since synth needs
  built docs. CI already had `Build` before it.

## Slice 3c — cross-region certificate

**Date**: 2026-08-28 · **AWS resources**: none deployed · **Deploy**: n/a (CI-verified)

### The correction that prompted it

Slice 3a recorded that "the stack must target us-east-1 until a cross-region
certificate stack exists". That overstated the constraint. **CloudFront is a global
service; only the ACM certificate it serves is pinned to us-east-1.** Colocating the
certificate with everything else is what would have forced the platform into that
region — not CloudFront itself.

### A failure that synthesizes cleanly and fails at deploy

Measured before choosing the design. Two stacks referencing each other across
regions, synthesized twice:

| Stack environments                        | Synth  | Cross-region plumbing                                |
| ----------------------------------------- | ------ | ---------------------------------------------------- |
| Region-agnostic (no `env`)                | **OK** | **none** — plain `Fn::ImportValue`                   |
| Cert `us-east-1`, platform `eu-central-1` | OK     | `CrossRegionExportWriter` + `Reader` + Lambda + role |

With both regions left as tokens CDK cannot see that the reference crosses a region,
so it emits an ordinary CloudFormation export. Exports do not cross regions, so the
deploy fails with an unresolved-export error naming neither. `assertConcreteEnv`
refuses that shape at synth.

An early version of the guard was **unreachable**: the reference app fell back to a
placeholder account and region before asserting, so it could never see an agnostic
env. The fallback was removed — an unreachable guard against a silent deploy failure
is worse than none.

### Topologies produced

| Configuration                                   | Stacks                                           |
| ----------------------------------------------- | ------------------------------------------------ |
| Created certificate, platform in `eu-central-1` | `GrantCertificate` (us-east-1) + `GrantPlatform` |
| Created certificate, platform in `us-east-1`    | same two — uniform, no special case              |
| Supplied `us-east-1` certificate ARN            | `GrantPlatform` only; no cert stack needed       |
| Supplied certificate ARN in another region      | **refused at synth**                             |

### Determinism

`pnpm synth` passes account and region as explicit context, which beats
`CDK_DEFAULT_*`. Verified the committed templates contain **no** account ID at all —
including none from the credentials present on this machine — so the artifact does not
depend on who ran synth.

### Gates

`lint` · `type-check` · `dead-code:deploy` · **162 tests** (from 149) ·
`synth:check` · `format:check` — all clean.

## Slice 3b — docs site (deploy)

**Status**: not blocked on credentials after all — **blocked on a target account decision.**

Slice 3a recorded this as blocked because `aws sts get-caller-identity` failed. That
was misdiagnosed: the **`aws` CLI binary is not installed**, but the AWS SDK resolves
a profile fine, and the CDK CLI reports a usable account and region.

Deploying is therefore technically possible and deliberately not done. The available
account is the one the existing Kubernetes deployment runs in — see
[[solo-owner-aws-account]]: solo access does not mean nothing is running. The stack
plan calls for a **scratch** account, and a first CloudFront/ACM/Route 53 deploy
against live infrastructure is not a decision to take implicitly.

## Slice 4 — API and data tier

_Not started._

## Slice 5 — web

_Not started._

## Slice 6 — scheduled jobs

_Not started._

## Slice 7 — smoke test and guide

_Not started._
