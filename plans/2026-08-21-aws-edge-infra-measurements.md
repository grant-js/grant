# Measurements — AWS edge and infrastructure

Seeded by slice 1; appended to by every deployed slice. The
[stack plan](./2026-08-21-aws-edge-infra-stack.md) § Verification model requires this
because phase C cannot be CI-verified past slice 2 — a recorded deploy is the
evidence that replaces a diff review.

The brief's timing and cost tables are **estimates**. Slice 7 replaces them with the
figures accumulated here. Where an estimate and a measurement disagree, the
measurement wins and the brief is corrected, not the other way round.

**No account identifiers are recorded here.** Account IDs, hosted zone IDs and ACM
validation tokens identify the account that happened to run the deploy and prove
nothing a reader needs — the evidence is the timings, the resource states and the
teardown residue. Where an example value is genuinely useful, use the
documentation-reserved `123456789012`, as the tests do. The same reasoning keeps
`cdk.context.json` untracked.

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

**Date**: 2026-08-29 · **Account**: not recorded (see note) · **Domain**: `aws.grantjs.org`
**Credential**: IAM user `grant-cdk-deploy` → role `GrantCdkDeploy` (AdministratorAccess),
profile `grant-cdk`. The user itself holds only `sts:AssumeRole`; verified that its
key alone is refused (`AccessDenied` on `s3:ListAllMyBuckets`).

### Timings

| Stage                                                         | Duration             |
| ------------------------------------------------------------- | -------------------- |
| `cdk bootstrap`, both regions                                 | **58 s**             |
| Synthesis                                                     | 2.0 s                |
| `GrantCertificate` (us-east-1) — ACM DNS validation dominates | **170 s**            |
| `GrantPlatform` (eu-central-1) — CloudFront dominates         | **204 s**            |
| **Deploy total**                                              | **405 s (6 m 45 s)** |
| `cdk destroy --all`                                           | **247 s (4 m 07 s)** |

Against the brief's estimate of ~10–20 min for an adopter with an existing data
tier: **the docs-only slice came in at under 7 minutes.** The estimate stands for
the full stack; slices 4–5 add the database and NAT that dominate it.

Bootstrap used `--bootstrap-kms-key-id AWS_MANAGED_KEY`. Confirmed **0 KMS keys** in
both regions, so the ~$2/month customer-key charge the default would incur is avoided.
Bootstrap version 32 (template requires ≥ 6).

### Verified against the live site

| Check                                                                         | Result                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| DNS A + AAAA                                                                  | both resolve                                         |
| TLS                                                                           | valid (`ssl_verify=0`)                               |
| `/docs/`                                                                      | **200**, `<title>Grant</title>`                      |
| `/docs` → `/docs/`                                                            | **302** — trailing-slash Function works              |
| `/docs/index.html`, `/docs/README.html`, `/docs/advanced-topics/logging.html` | 200                                                  |
| `/docs/assets/app.CVOa4Hir.js`                                                | 200, 699 KB, `text/javascript`                       |
| `/`                                                                           | 404 — expected until the web origin lands in slice 5 |
| Edge cache, repeat request                                                    | `Hit from cloudfront`, `age: 15`                     |

**The `docs/` key-prefix decision is confirmed in production.** The built HTML
references `/docs/assets/…` and those resolve straight to the matching S3 keys with
no rewrite at the edge — the property slice 3a chose the layout for.

### Finding 1 — `cdk destroy` strands the ACM validation record

The acceptance criterion earned its place here. After a clean destroy of both stacks:

- both stacks gone (`Stack ... does not exist`)
- `aws.grantjs.org` A and AAAA removed; site unreachable; `dig` empty
- **but the zone held 20 records, not the original 19**

The survivor is the ACM validation CNAME
an ACM validation CNAME `_<token>.aws.grantjs.org` → `...acm-validations.aws.`

**Cause, established rather than guessed:** `GrantCertificate.template.json` contains
**no `AWS::Route53::RecordSet`** — its resources are the certificate, a Lambda, an IAM
role, the cross-region export writer and CDK metadata. The validation record is
written by **ACM itself** through `DomainValidationOptions.HostedZoneId`, so
CloudFormation never owned it and cannot delete it.

This is documented AWS behaviour, not a CDK defect, but it is a stranded resource and
it accumulates one orphan CNAME per deploy/destroy cycle. The deployment guide must
say so, and slice 7's smoke test should assert the zone returns to its prior record
count — or the stack should own the validation record itself so CloudFormation can
remove it.

### Finding 2 — unknown paths diverge from nginx

`/docs/deployment/` (a directory with no `index.html`; VitePress emits `page.html`)
returns **404 with the VitePress 404 page** — the 403→404 error mapping working as
designed. nginx's `try_files $uri $uri/ /index.html` instead serves the documentation
**homepage with 200**.

CloudFront's behaviour is arguably the better of the two — a truthful status code and
a real 404 page rather than a soft-404 — but it is a difference between targets and
belongs in the parity record rather than being quietly accepted.

### Finding 3 — S3 objects carry no `Cache-Control`

`head-object` on a content-hashed asset returns `CacheControl: null`. Edge caching
works, but browsers receive no directive for files that could safely be
`public, max-age=31536000, immutable`. `BucketDeployment` accepts a `cacheControl`
prop; a one-line fix, not a 3b blocker.

### Finding 4 — `cdk bootstrap` executes the app

Even with explicit `aws://account/region` arguments, bootstrap runs `cdk.json`'s
`app` and fails on missing context — so an adopter's **first** command needs the full
`-c appUrl=… -c zoneName=… -c hostedZoneId=…` set for an operation that ignores every
one of them. Squarely against the "adoptable in one command" bar; fix by documenting
it or by having `bin/grant.ts` tolerate absent context when no stack is synthesized.

### DNS impact

Zone went 19 → 22 records during the deploy (A, AAAA, ACM validation CNAME) and back
to 20 after destroy. **The 19 pre-existing records — apex, `demo`, `docs`, six SES
DKIM CNAMEs, MX, DMARC — were never touched.**

Slice 3a recorded this as blocked because `aws sts get-caller-identity` failed. That
was misdiagnosed: the **`aws` CLI binary is not installed**, but the AWS SDK resolves
a profile fine, and the CDK CLI reports a usable account and region.

Deploying is therefore technically possible and deliberately not done. The available
account is the one the existing Kubernetes deployment runs in — see
[[solo-owner-aws-account]]: solo access does not mean nothing is running. The stack
plan calls for a **scratch** account, and a first CloudFront/ACM/Route 53 deploy
against live infrastructure is not a decision to take implicitly.

## Slice 3d — deploy findings addressed

**Date**: 2026-08-29 · **AWS resources**: none changed · **Deploy**: n/a (CI-verified)

Two of slice 3b's four findings are fixed here; the other two are recorded as carried
follow-ups in the stack plan, with reasons, rather than fixed where they were found.

### F3 — `Cache-Control` on published documentation

`BucketDeployment` now sets `public, max-age=3600`, verified present in the committed
template as `SystemMetadata: {"cache-control": "public, max-age=3600"}` and pinned by a
test.

One hour rather than a year, deliberately: the same policy applies to `.html` pages,
whose filenames are **not** content-hashed, so a long TTL would pin a stale page in
every visitor's browser until expiry. An hour removes the revalidation round-trip
without that risk. Splitting hashed assets from HTML would need two deployments — not
worth it until a measurement says otherwise.

### F4 — `pnpm bootstrap`

Supplies the context `cdk bootstrap` demands but ignores, and pins
`--bootstrap-kms-key-id AWS_MANAGED_KEY` so a re-run cannot silently add the
customer-managed key slice 3b avoided.

Verified idempotent against the already-bootstrapped account: both environments
reported **"bootstrapped (no changes)"** in 6 s, and no KMS key was added.

### Gates

**163 tests** (from 162). `lint`, `type-check`, `dead-code:deploy`, `synth:check`,
`format:check` all clean.

## Slice 4a — network and data tier

**Date**: 2026-08-29 · **AWS resources**: VPC, NAT, Aurora Serverless v2 · **Deploy**: recorded below

Split from slice 4 as the stack plan pre-authorised. 4b carries the API Lambda, RDS
Proxy and migrate one-shot.

### What the committed template now holds

53 resources, up from 20. The data tier adds a VPC with three subnet tiers across two
zones (6 subnets, 6 route tables), **one** NAT gateway, an Aurora Serverless v2
cluster with its instance and subnet group, and a generated Secrets Manager secret.

| Default              | Value    | Why it is explicit                                                                                                                                                          |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DeletionPolicy`     | `Retain` | CDK's default is `SNAPSHOT`, which removes the cluster but keeps a **storage-billed snapshot** that survives `cdk destroy` unseen. Set in both directions, never inherited. |
| `DeletionProtection` | `true`   | Off only when `-c ephemeral=true` is passed.                                                                                                                                |
| `MinCapacity`        | `0`      | Serverless v2 auto-pause. An idle cluster costs nothing, which is the entire premise of this target.                                                                        |
| NAT gateways         | `1`      | CDK's default is one **per availability zone** — roughly $32/month each, silently doubling the largest fixed cost before a request is served.                               |

Verified no account ID appears in either committed template.

### Perturbation results

The two cost guards exist because the failure is a bill, not an error. Each was
reverted to CDK's default and the suite re-run:

| Perturbation                                       | Expected | Result          |
| -------------------------------------------------- | -------- | --------------- |
| Drop explicit `removalPolicy` (inherit `SNAPSHOT`) | fail     | **1 failed** ✓  |
| Drop `natGateways: 1` (inherit one-per-AZ)         | fail     | **1 failed** ✓  |
| Raise `minCapacity` off `0` (lose auto-pause)      | fail     | **1 failed** ✓  |
| Baseline                                           | pass     | **12 passed** ✓ |

### Finding — creating a VPC forces an AZ context lookup, and explicit zones do not avoid it

Adding the VPC broke `pnpm synth` with _"Could not assume role in target account …
Roles may not be assumed by root accounts"_. The cause is not the credential: creating
a `Vpc` resolves the region's zone list through the **availability-zones context
provider**, an AWS call at synth time.

Supplying `availabilityZones` explicitly does **not** avoid it. CDK validates the
supplied list against `stack.availabilityZones` and touches the same provider either
way — the `GivenAvailabilityZones` check in `aws-ec2/lib/vpc.js`. Established by
reading the compiled source after the first fix failed to work.

**This lookup is not the kind ADR 0005 rules out**, and the distinction is worth
stating. `Vpc.fromLookup` **discovers existing infrastructure**, so the template
becomes a function of account state. This one asks a stable question about a region.
`cdk.json` therefore seeds the answer for the **synth-only placeholder account**, which
keeps the committed template reproducible and CI credential-free, while a real deploy
resolves the real zones under its own account key and is unaffected.

### Gates

**175 tests** (from 163). `lint`, `type-check`, `dead-code:deploy`, `synth:check`,
`format:check` all clean.

## Slice 4a — data tier (deploy)

**Date**: 2026-08-29 · **Account**: not recorded (see note) · **Domain**: `aws.grantjs.org`
**Context**: `-c ephemeral=true`, so `destroyOnRemoval: true` reaches the cluster. A
non-ephemeral deploy would refuse to tear down at all, which is the point of the flag.

### Baseline captured before deploying

Recorded first, because "no snapshot survives" is unfalsifiable without it — a
survivor could otherwise be blamed on something pre-existing.

| Baseline (eu-central-1) | Value  |
| ----------------------- | ------ |
| RDS cluster snapshots   | **0**  |
| RDS instance snapshots  | **0**  |
| RDS clusters            | **0**  |
| `grantjs.org` records   | **19** |

The 19 also confirms slice 3b's orphan cleanup held.

### Finding 1 — `grant` is a reserved word in Aurora PostgreSQL

**The first deploy failed**, and no synth-time test could have caught it:

```
DatabaseName grant cannot be used.  It is a reserved word for this engine
(Service: Rds, Status Code: 400)
```

The template is valid CloudFormation. RDS validates `DatabaseName` against the
engine's reserved words at **create** time, so the failure arrived ~4 minutes in,
after the VPC and NAT gateway already existed, and rolled the stack back.

The default was also **inconsistent with the Docker target**: `docker-compose.yml`
and `.env.example` both use `POSTGRES_DB=grant_db`. So the AWS target had quietly
diverged on database name, which would have given `DB_URL` a different shape on each
target. Changing the default to `grant_db` fixes the reserved word and the divergence
together.

**A synth-time validator was added, reversing a first call not to.** The initial
reasoning was that AWS's error already names the cause, so a local reserved-word list
would be a second source of truth that drifts. What that missed is the shape of the
failure: `cdk synth` and CI both pass, and the deploy dies minutes later with the VPC
and NAT already standing. A green gate that does not mean the thing it appears to mean
is worth more than the drift risk.

Two further points settled it:

- **The likelier mistake is not a reserved word at all.** `grant-db` reads as a
  perfectly natural name, and RDS rejects a hyphen just as hard. A shape rule catches
  a wider class than the case that was actually hit.
- **The list cannot go wrong for another engine.** `Database` pins
  `DatabaseClusterEngine.auroraPostgres`, so a PostgreSQL keyword list is correct by
  construction. Were the engine configurable, this would not belong in the repo.

`validateDatabaseName` checks shape and reserved words, case-insensitively, and passes
unresolved tokens through rather than guessing. It does not replace the API's
validation: if AWS rejects a name this accepts, its error still names the cause. It
moves the common cases from minutes-deep to instant. Verified by reverting the default
to `grant`, which now fails `cdk synth` with

```
ConfigurationError: databaseName "grant" is a reserved word in PostgreSQL, and RDS
refuses it when it creates the cluster. Pick another name, e.g. "grant_db".
```

### Timings

| Stage                                             | Duration               |
| ------------------------------------------------- | ---------------------- |
| Synthesis                                         | 2.3 s                  |
| `GrantCertificate` (us-east-1), first deploy      | **170.8 s**            |
| `GrantCertificate`, redeploy                      | 0 s (no changes)       |
| `GrantPlatform` (eu-central-1) — Aurora dominates | **433.0 s**            |
| **Deploy total**                                  | **452.6 s (7 m 33 s)** |
| `cdk destroy --all`                               | **441 s (7 m 21 s)**   |

The certificate stage came in at 170.8 s against slice 3b's 170 s — within a second
across separate deploys, so ACM DNS validation is the fixed floor it appeared to be.

Against the brief's ~10–20 min estimate for a full stack, the data tier reached
**7 m 33 s**. Aurora provisioning is the new dominant term, as predicted.

### Verified on the live tier

| Check                       | Result                                        |
| --------------------------- | --------------------------------------------- |
| Aurora cluster              | `available`, PostgreSQL **17.5**              |
| Capacity                    | **MinACU 0.0** / MaxACU 4.0 — auto-pause live |
| `DatabaseName`              | **`grant_db`** — the fix, end to end          |
| `StorageEncrypted`          | true                                          |
| `DeletionProtection`        | **false** — the ephemeral opt-in working      |
| Writer instance             | `db.serverless`, `PubliclyAccessible: false`  |
| NAT gateways                | **1**, not one per AZ                         |
| Subnets                     | 6 = 3 tiers × 2 zones                         |
| DB subnet `0.0.0.0/0` route | **none** — genuinely isolated                 |
| Secret                      | `Database-db-credentials`                     |
| `/docs/`, `/docs`, `/`      | 200, 302, 404 — unchanged from slice 3b       |

**The route-table check is stronger than the test that motivated it.** `data-tier.test.ts`
asserts `resourceCountIs('AWS::EC2::Subnet', 6)` and infers isolation from a count,
which is a proxy. Querying the live route tables shows the database subnets carry no
default route to an internet gateway or a NAT at all. Only a deploy can check that.

### Teardown — the claim this slice exists to make good on

| After `cdk destroy --all`  | Result   |
| -------------------------- | -------- |
| **RDS cluster snapshots**  | **0** ✓  |
| **RDS instance snapshots** | **0** ✓  |
| RDS clusters / instances   | 0 / 0    |
| CloudFormation stacks      | none     |
| VPCs (non-default)         | none     |
| NAT gateways               | none     |
| **Elastic IPs**            | **none** |
| Secrets (incl. pending)    | none     |
| S3 buckets                 | none     |

Elastic IPs are listed because an unattached one is billed and would have been an easy
thing to strand behind a deleted NAT gateway. None survived.

### Finding 2 — the ACM orphan recurs, but does not accumulate

Slice 3b recorded that `cdk destroy` strands the ACM validation CNAME because ACM
writes that record itself and CloudFormation never owned it. It recurred here exactly:
the zone went 19 → 20.

The new detail is the name. It is **byte-identical** to slice 3b's orphan —
the same `_<token>.aws.grantjs.org` — even though that record was
deleted and the certificate reissued from scratch. ACM derives the validation token
deterministically per domain, so repeated deploy/destroy cycles converge on **one**
stray record, not one per cycle.

That changes F1's severity: untidy, not accumulating. Slice 7 still documents it and
asserts it in the smoke test, but it is not a leak that grows.

## Slice 4c — the API can serve

**Date**: 2026-08-30 · **AWS resources**: Lambda, Function URL, DynamoDB, S3 · **Deploy**: pending

Split from slice 4b, which the stack plan pre-authorised. 4d carries the CloudFront
API behaviours and the header handling the security review attaches to.

### What the committed template now holds

84 resources, up from 74. The ten added are the whole slice, with nothing incidental:

| Added                        | Count | Why                                                                |
| ---------------------------- | ----- | ------------------------------------------------------------------ |
| `AWS::Lambda::Function`      | +1    | The serving function                                               |
| `AWS::Lambda::Url`           | +1    | Its origin endpoint, `AWS_IAM`                                     |
| `AWS::DynamoDB::GlobalTable` | +1    | The cache table (`TableV2` renders as a single-region GlobalTable) |
| `AWS::S3::Bucket` + policy   | +2    | Uploads                                                            |
| `AWS::EC2::VPCEndpoint`      | +2    | S3 and DynamoDB gateway endpoints                                  |
| `AWS::IAM::Role` + policy    | +2    | The function's execution role                                      |
| `AWS::Logs::LogGroup`        | +1    | Its logs, at a declared retention                                  |

### The decisions worth reviewing

| Default                        | Value     | Why it is explicit                                                                                                                                        |
| ------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Function URL `AuthType`        | `AWS_IAM` | `NONE` is a public endpoint that bypasses CloudFront entirely. CDK also attaches a `Lambda::Permission` with a `*` principal — both are asserted against. |
| `ReservedConcurrentExecutions` | `20`      | A **database** guard. Pooling is off by default, so each warm environment holds its own connections.                                                      |
| `DB_POOL_MAX`                  | `2`       | One environment serves one request; a larger pool only reserves connections another environment could use.                                                |
| Cache table removal            | `Delete`  | Deliberately unlike the database. Cache entries are reconstructible and TTL'd; retaining the table leaves a billed resource nobody reads.                 |
| Uploads bucket removal         | `Retain`  | User data. `autoDeleteObjects` stays off with it, so no bucket-emptying custom resource is ever created.                                                  |
| Gateway endpoints              | created   | Free. Without them every cache read and upload is billed as NAT data processing.                                                                          |

**Aurora Serverless v2 derives `max_connections` from the maximum ACU, not the
current one** — roughly 900 at the default `maxCapacity: 4`. The concurrency ceiling
still matters: an account's default Lambda limit is 1000, and 1000 × `DB_POOL_MAX=2`
is 2000 connections. The test asserts the _product_, not either factor, because that
is the quantity the database actually sees.

### No credential reaches the serving function

The environment carries `SECRETS_AWS_SECRET_ID` and no secret. This is the first
consumer of the `DB_URL`-through-`ISecretResolver` change (#359): the migrate task
must inject `DB_URL` as an ECS secret because its entrypoint reads `config.db.url`,
while `create-app.ts` resolves per use — so a rotation reaches a warm container within
`SECRETS_CACHE_TTL_SECONDS` rather than at the next redeploy. Asserted directly:
no key matching `ACCESS_KEY`, `PASSWORD` or `SECRET_KEY`, and no `DB_URL`.

### Perturbation results

Every guard was reverted and the suite re-run. None is decorative:

| Perturbation                             | Expected | Result          |
| ---------------------------------------- | -------- | --------------- |
| Function URL `AuthType` → `NONE`         | fail     | **2 failed** ✓  |
| Reserved concurrency 20 → 1000           | fail     | **1 failed** ✓  |
| Drop the cache table's TTL specification | fail     | **1 failed** ✓  |
| Uploads bucket defaults to destroy       | fail     | **2 failed** ✓  |
| Rename the cache sort key off `sk`       | fail     | **1 failed** ✓  |
| Remove the VPC gateway endpoints         | fail     | **1 failed** ✓  |
| Baseline                                 | pass     | **16 passed** ✓ |

The sort-key case is the one worth noting: the construct and `DynamoDBCacheAdapter`
live in packages with no compile-time link, so a renamed attribute deploys clean and
fails at the first `set()`. The test reads the adapter's source and matches against
it — the same third-witness shape as the routing oracle, rather than a second copy of
the literal.

### Gates

**220 tests** (from 204). `lint`, `type-check`, `dead-code:deploy`, `format:check`
clean. Two consecutive synths produced byte-identical templates.

## Slice 4c — the API serves (deploy)

**Date**: 2026-08-30 · **Domain**: `aws.grantjs.org` · **Context**: `-c ephemeral=true`

First deploy of the serving function, and the first time the Lambda image path has been
built and published at all — the stack plan flagged it as untested through phase B.

### Baseline captured before deploying

| Baseline (eu-central-1)                   | Value                         |
| ----------------------------------------- | ----------------------------- |
| CloudFormation stacks                     | 1 (bootstrap)                 |
| Route 53 records                          | 20 (19 real + the ACM orphan) |
| S3 buckets                                | 2                             |
| Lambda / DynamoDB / RDS / non-default VPC | 0 / 0 / 0 / 0                 |

### Finding 1 — the migration was never ordered after the writer instance

The first deploy rolled back. The migrate task failed with
`getaddrinfo ENOTFOUND …cluster-….rds.amazonaws.com`, which is **not** a refused
connection or a timeout: the hostname did not exist yet.

| Time     | Event                             |
| -------- | --------------------------------- |
| 16:34:09 | DBCluster `CREATE_COMPLETE`       |
| 16:34:09 | Writer DBInstance begins creating |
| 16:35:07 | Migrate trigger fires             |
| 16:35:44 | Task fails, `ENOTFOUND`           |

`MigrateTrigger.executeAfter` named the platform secret, and `PlatformSecret`
references `cluster.clusterEndpoint.hostname` — an attribute of the **DBCluster**.
CloudFormation therefore ordered the trigger after the cluster and never after the
instance. An Aurora cluster endpoint has no DNS record until an instance exists.

**Slice 4b passed on scheduling luck.** With a smaller resource graph the writer
finished first; adding the serving function changed the parallel schedule and the race
flipped. Synth was green both times — only a deploy could find this.

Fixed by naming the whole `Database` construct in `executeAfter`, so ordering no longer
depends on which attribute happens to be referenced. The regression test asserts the
trigger's `DependsOn` contains the DBInstance logical ID, and was confirmed to **fail
against the original wiring**.

### Finding 2 — a failed create cannot roll itself back

The rollback then failed on its own: `ROLLBACK_FAILED`, because the docs bucket still
held 313 objects. `autoDeleteObjects` installs a custom resource that empties the
bucket, but it does not get to run while CloudFormation is unwinding a failed create.
Recovery was manual: empty the bucket, delete the stack, redeploy.

This is a sharp edge on a **first** deploy specifically — the failure mode that greets
someone whose first attempt goes wrong. Carried to slice 7.

### Finding 3 — `ephemeral` did not reach the uploads bucket

Caught by reading `bin/grant.ts` before deploying, not by the deploy. `ephemeral` was
passed to `database` only, so the uploads bucket kept its `Retain` default and teardown
would have stranded it — breaking the property the flag exists to provide. The cache
table was already correct, defaulting to `Delete`.

### The API serves — verified in both directions

| Request                                   | Result                                    |
| ----------------------------------------- | ----------------------------------------- |
| Unsigned `GET /health`                    | **403 Forbidden** — no public bypass      |
| SigV4-signed `GET /health`                | **200** `{"status":"ok",…}`               |
| SigV4-signed `GET /.well-known/jwks.json` | **200**, 1 RSA key **read from Postgres** |
| SigV4-signed `GET /api-docs.json`         | **200**, 87 OpenAPI paths                 |

`/health` alone would not have proved much — it touches no database. JWKS does, so the
full chain is verified: LWA → Express → Aurora, with `DB_URL` resolved through the
secret port. The function's own log carries
`AwsSecretsManagerResolver … keys:["DB_URL"]`, which is ADR 0004 running on the real
Lambda rather than only in the migrate task. The cache table took an item from the rate
limiter, so DynamoDB is wired too. No errors or warnings in the function log.

### Finding 4 — cold start sits against Lambda's init ceiling

| Invocation                             | Duration              |
| -------------------------------------- | --------------------- |
| Cold, first ever (includes image pull) | **18,975 ms**         |
| Cold, image cached                     | **8,900 ms init**     |
| Warm                                   | 173 ms → 46 ms → 6 ms |

Lambda's init phase has a **10 second ceiling**, past which init is retried inside the
invocation — which is the most likely explanation for the first call billing 19 s. At
8.9 s, boot sits right at that edge, so anything added to startup could tip it over,
and a user reaching a cold container through CloudFront waits about nine seconds.

Worth attention before 4d puts traffic on it. Candidates: the OpenAPI document is
generated for 87 paths at boot, the Apollo schema is built at boot, and the LWA probes
`/health` before reporting readiness.

**Memory is over-provisioned on purpose, and the measurement confirms it**: 350 MB used
against 1024 MB allocated. The setting buys CPU share, not headroom.

### Gates

**221 tests** (from 220). `lint`, `type-check`, `format:check` clean. Deploy 530 s.

### Teardown — zero residue, including the bucket the fix was for

Measured against the baseline captured before deploying:

| After `cdk destroy --all`      | Result        |
| ------------------------------ | ------------- |
| CloudFormation stack           | gone          |
| Route 53 records               | 20 = baseline |
| S3 buckets                     | 2 = baseline  |
| **RDS cluster snapshots**      | **0**         |
| DynamoDB tables                | 0             |
| Lambda functions               | 0             |
| VPCs (non-default)             | 0             |
| NAT gateways                   | 0             |
| **Elastic IPs**                | **0**         |
| Secrets (incl. pending delete) | 0             |

The bucket count returning to baseline is the finding 3 fix confirmed in practice
rather than in synth: without it the uploads bucket would have kept its `Retain`
default and survived here.

**The ACM orphan did not accumulate.** The zone stayed at 20, matching slice 3d's
conclusion that ACM derives the validation token deterministically per domain, so
repeated deploy/destroy cycles converge on one stray record rather than one per cycle.

### Cold start — where the 8.9 s goes

Measured by running the shipped image locally, so the split is app-level rather than
inferred from Lambda's single `Init Duration` number:

| Phase                                       | Local (full core) | Share |
| ------------------------------------------- | ----------------- | ----- |
| **Module import graph**                     | **2,402 ms**      | 77%   |
| `createApp()` — i18n, Apollo, cache, routes | 473 ms            | 15%   |
| OpenAPI generation (87 paths)               | 260 ms            | 8%    |

This agrees with the CloudWatch timeline, where `i18n initialized` to
`Database connection initialized` was about 250 ms — almost nothing expensive happens
after the app starts running. The cost is getting there.

**The first invocation reported no `Init Duration` at all**, only 18,975 ms billed,
while the second reported 8,900 ms. Lambda re-runs init inside the invocation when the
init phase exceeds its 10 s ceiling and does not report a separate duration, so the
ceiling was likely crossed on the first call. Image pull is a competing explanation for
that first invocation and the two have not been isolated.

Ranked candidates, not yet implemented:

1. **Memory 1024 → 1769 MB.** CPU is proportional to memory and 1,769 MB is one full
   vCPU, against roughly 0.58 today. Only 350 MB is used, so memory here is purely a
   CPU dial. Roughly cost-neutral: ~1.73x per millisecond against ~40% fewer of them.
2. **Bundle with esbuild.** Targets the 77%. Its own slice, with before/after numbers.
3. **Defer OpenAPI generation** to the first `/api-docs` request.

Ruled out: **SnapStart** supports Java, Python and .NET and requires ZIP packaging, not
container images. **Provisioned concurrency** bills continuously, contradicting the
premise the target is built on.

## Cold start — first two optimizations

**Date**: 2026-08-30 · Applied after the 4c deploy measured 8.9 s init.

### Deferring OpenAPI generation — measured

`createApp()` generated the 87-path OpenAPI document at boot, for a document read only
by `/api-docs` and `/api-docs.json`. Now generated on first request and memoized.

Measured by running the shipped image before and after, same probe, three runs each:

| Phase         | Before (ms) | After (ms) |
| ------------- | ----------- | ---------- |
| Module import | 2426–2468   | 2435–2454  |
| `createApp()` | **300–332** | **24–26**  |
| Total boot    | ~2769       | ~2472      |

`createApp()` is **92% faster**; total local boot falls ~297 ms, about 11%. On Lambda's
slower core the saving is proportionally larger.

**Import is unchanged**, which is the point worth carrying: it is ~2,445 ms of the
~2,472 ms that remains, and nothing here touches it. Bundling is the fix for that and
it is its own slice.

### Memory 1024 → 1769 MB — not yet verified

1,769 MB is where Lambda allocates one full vCPU, against roughly 0.58 at 1 GB. Chosen
for CPU, not memory: the deploy used 350 MB of the 1024 it had, and 77% of boot is
CPU-bound module loading. Billing is per GB-millisecond, so a 1.73x rate against a
proportionally shorter init is close to cost-neutral, and warm invocations get cheaper.

**This cannot be measured locally** — a container gets the host's CPU regardless of the
Lambda memory setting. It is the one change here whose effect is only observable on the
next deploy, and it should be checked against the 8.9 s baseline then.

## Slice 4d — the edge routes to the API (deploy)

**Date**: 2026-08-31 · **Domain**: `aws.grantjs.org` · **Context**: `-c ephemeral=true` · Deploy 617 s

First deploy of the secret-guarded origin. Every claim 4d makes was checked against
real infrastructure rather than inferred from the template.

### The origin design works, in both directions

| Check                                | Result                                      |
| ------------------------------------ | ------------------------------------------- |
| Direct request to the Function URL   | **403**, in the _application's_ error shape |
| `/health` direct                     | **200** — the LWA exemption holds           |
| `/health` through the edge           | **200**                                     |
| **POST `/graphql` through the edge** | **200** `{"data":{"__typename":"Query"}}`   |
| POST with a 4 KB body                | **200** — forwarding intact                 |

The 403 body carries `translationKey`, not AWS's `{"Message":"Forbidden"}`, which is
the evidence that `originVerifyMiddleware` refused it rather than IAM. The dynamic
reference in the origin custom header resolved correctly — a literal
`{{resolve:…}}` would have failed here.

**The GraphQL POST is the finding that justifies the architecture change.** It is
precisely what OAC could not have carried without the browser computing
`x-amz-content-sha256`.

### The rate-limiter bypass is closed in production

Sent a request through the edge carrying `X-Forwarded-For: 1.2.3.4`, then read the
rate-limiter's own DynamoDB keys:

```
global:87.171.69.148   <- the real client address
global:64.89.160.19
```

The spoofed value is **absent**. Verified by reading what the limiter actually keyed
on, not by inspecting logs — an earlier attempt to check via CloudWatch found neither
address and proved nothing.

### Finding — more memory made the cold start worse

The 1769 MB default shipped unverified in #363 on the reasoning that Lambda allocates
CPU in proportion to memory, 1,769 MB buys a full vCPU against roughly 0.58 at 1 GB,
and 77% of boot is CPU-bound module loading. **That reasoning did not hold.**

A/B on one live deploy, same image, memory the only variable:

| Memory  | Init                                         | Billed        |
| ------- | -------------------------------------------- | ------------- |
| 1769 MB | `INIT_REPORT … 10000.06 ms, Status: timeout` | **13,811 ms** |
| 1024 MB | `Init Duration: 7,633.66 ms`                 | **7,642 ms**  |

At 1769 the init phase reproducibly exceeds Lambda's 10 s ceiling and is re-run inside
the invocation, so the caller waits for boot twice. At 1024 it finishes with room.

Reverted to 1024 and pinned by a test, so the appealing-but-wrong value cannot be
reintroduced from first principles without re-measuring `INIT_REPORT`. **The mechanism
is not established** — plausibly V8 sizing its heap generations off the larger limit
and paying longer GCs during the module-loading burst — and is recorded as an
observation rather than dressed up as a theory.

Evidence strength, stated plainly: the 1769 timeout was observed three times; the 1024
figure is one clean sample from this deploy, corroborated by the previous deploy's
8,900 ms (also under the ceiling). A follow-up A/B loop failed to force fresh execution
environments and produced nothing, so it is not counted.

**The OpenAPI deferral is confirmed good**: 8,900 ms → 7,634 ms at the same 1024 MB.
That half of #363 earned its place.

### Teardown — zero residue

| After `cdk destroy --all`         | Result        |
| --------------------------------- | ------------- |
| CloudFormation stack              | gone          |
| Route 53 records                  | 20 = baseline |
| S3 buckets                        | 2 = baseline  |
| DynamoDB / Lambda                 | 0 / 0         |
| RDS clusters / manual snapshots   | 0 / 0         |
| VPCs / NAT gateways / Elastic IPs | 0 / 0 / 0     |
| Secrets (incl. pending delete)    | 0             |

### Gap — the AWS target has no values file

`config/defaults.ts` sets the bar itself: "The Helm chart's equivalent is the `config:`
block in `values.yaml`. Parity with it is an acceptance criterion: an adopter should
not have to read source to learn which settings this target needs."

They currently do. `charts/grant-platform/values.yaml` is 339 documented lines; the CDK
equivalent is `cdk.json` holding two availability-zone entries, seven `-c` flags, and
TypeScript. `app.node.tryGetContext()` already reads `cdk.json`'s `context` block, so
the keys could move there with no change to `bin/grant.ts` and flags still overriding.
Not attempted — recorded as its own piece of work.

## Slice 4 — security-full review, findings and disposition

**Date**: 2026-08-31 · Bar: `security-full` · Scope: `9942d900..41b1193e` (PRs #354–#365)

### Accepted risk — the Function URL is publicly reachable

**Not fixable at this layer, and that is the finding.** Origin Access Control cannot
carry this API: its recommended signing mode overwrites the viewer's `Authorization`
header, and `POST`/`PUT` through OAC require the _viewer_ to send
`x-amz-content-sha256`. Enforcement therefore lives in the function, which means a
request that will be refused still costs a Lambda invocation.

The consequence the review named: a low `reservedConcurrentExecutions` makes denial of
service **cheaper**, not safer. At 20, roughly twenty concurrent requests to the origin
exhaust every execution environment and starve legitimate CloudFront traffic. The
earlier code comment — "reserved concurrency bounds that" — was wrong in a way worth
recording: it bounds _spend_, not _availability_.

**Mitigations applied**, none of which eliminate the exposure:

| Mitigation                             | Effect                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| Reserved concurrency 20 → **100**      | Exhaustion costs 5x more; 100 x `DB_POOL_MAX=2` = 200 connections against Aurora's ~900 |
| `SECURITY_ORIGIN_VERIFY_REQUIRED=true` | A missing secret refuses every request instead of opening the origin                    |
| Distinguishable log on refusal         | Direct-origin probes are separable from ordinary 403s, so they can be alarmed on        |
| LWA readiness moved to TCP             | No exempt path remains; `/health` now requires the secret too                           |

**Rejected**: API Gateway in front of the Lambda would let AWS refuse before compute,
and is deliberately not adopted yet — it adds a component and per-request cost to a
target whose premise is minimal idle cost. AWS WAF does not support Lambda function
URLs. Revisit if abuse is observed.

**Residual risk**: an attacker who learns the Function URL can still burn invocations.
Detection is the compensating control; the alarm is not yet wired.

### Accepted risk — `sslmode=require` does not verify the server certificate

Already recorded in `platform-secret.ts`. postgres.js maps `require` to
`rejectUnauthorized = false`, so the hop is encrypted but the server certificate is
unverified — that defeats passive interception, not an active in-VPC MITM.
`verify-full` needs the RDS CA bundle shipped in the image, which it does not carry.
**Accepted at this bar** for a hop that never leaves the VPC and terminates in isolated
subnets with no route out.

### Fixed

| Finding                                                    | Disposition                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| Origin verification failed open when the secret was absent | `SECURITY_ORIGIN_VERIFY_REQUIRED`, true on AWS              |
| `/health` exempt and internet-reachable                    | Exemption deleted; LWA readiness is TCP                     |
| `logs:PutRetentionPolicy` on `*` via CDK's LogRetention    | Explicit `logGroup`; custom resource gone, wildcards 3 → 2  |
| `RoutingPlan` advertised a cache plan not implemented      | Behaviours honour `cacheFor()`; JWKS keeps its 5-minute TTL |
| No distinguishable signal for direct-origin probes         | Structured warn under `OriginVerify`                        |

The two remaining wildcard IAM statements are both legitimate:
`ecr:GetAuthorizationToken` does not support resource-level permissions, and
`ecs:DescribeTasks` is conditioned by `ArnEquals ecs:cluster`.

### Not fixed — client-IP fallback collapses to loopback

When a trusted header is configured but absent, `getClientIp` falls through to
`req.ip`/socket, which under the Lambda Web Adapter is always `127.0.0.1` — so those
requests share one rate-limit bucket. Unreachable in practice because origin
verification now refuses every non-CDN request before the rate limiter, and there is no
longer an exempt path. **The safety depends on middleware order, and nothing asserts
that order** — worth a test if the ordering is ever touched.

### Independence

Every line reviewed was written by the same author who wrote the slice. Real findings
came out of it, but the trust-model finding is exactly where self-review is weakest:
the design and the comment asserting it was bounded came from the same hand. **The
plan's "independent of the slice author" gate is not satisfied by this pass.**

## Slice 5 — the platform serves (deploy)

**Date**: 2026-08-31 · **Domain**: `aws.grantjs.org` · **Context**: `-c ephemeral=true`

First deploy where the canonical hostname serves the product rather than documentation
plus an API. Verified by hand against a live stack, then re-verified against a stack
built entirely from code with nothing patched in place.

### Finding 1 — CloudFront could not invoke the web function

The whole site returned the documentation 404 page. `FunctionUrlOrigin.withOriginAccessControl`
grants `lambda:InvokeFunctionUrl` and stops there; AWS's instructions for restricting a
function URL to CloudFront list **two** `add-permission` calls. Without the second,
every origin request is refused **before the function is invoked** — so its log group
stays empty, which reads as a routing fault rather than a permissions one.

### Finding 2 — the error mapping masked it, for over eleven minutes

The 403 → 404 mapping exists so a mistyped docs URL does not look like a permissions
failure. It is **distribution-wide**, so it also caught a genuine 403 from the web
origin and dressed it as a friendly 404.

Worse, it was _cached_: the error page carries its own `Cache-Control: max-age=3600` and
CloudFront honours it over the `errorResponses` TTL. Observed `age: 659` on a response
whose TTL was 300 s. Every retry re-read one stale failure, and a cache-busting query
string did not help because the behaviour's cache policy excludes query strings from the
key. **This cost about an hour**, and briefly produced a wrong diagnosis in the other
direction — that the failure was only cache.

Fixed by setting the error TTL to zero. The friendly 404 survives; the pinning does not.

### Finding 3 — the validator required an env copy of a resolver-backed secret

`validateConfig()` threw `GITHUB_CLIENT_SECRET is required when GITHUB_CLIENT_ID is set`
while `GithubOAuthService` reads that value through `ISecretResolver`. Configuring OAuth
therefore required the literal string `resolved-from-secrets-manager` in the Lambda
environment purely to pass boot validation — a placeholder standing in for a value the
app never reads from there. Every key migrated to the resolver would have hit the same
wall.

### Finding 4 — SES could only be configured with a static access key

The adapter hardcoded `credentials: { accessKeyId, secretAccessKey }`, so the only path
was a long-lived key in a Lambda environment variable. Now falls through to the default
credential chain, matching the S3 fix in #358, with `ses:SendEmail`/`ses:SendRawEmail`
on the function role.

### Smoke test — from code, nothing patched

| Check                                           | Result                                         |
| ----------------------------------------------- | ---------------------------------------------- |
| `/` through the edge                            | **200** at `/en`                               |
| `/en/auth/login`                                | **200**                                        |
| `_next/static/…js`                              | **200**, `max-age=31536000, immutable`         |
| `/health`, `/api-docs.json`, `/docs/`           | **200**                                        |
| `/api/auth/github`                              | **302** to GitHub, correct client and callback |
| API boots with no `GITHUB_CLIENT_SECRET` in env | ✓                                              |
| **SES delivery**                                | **1 attempt, 0 bounces, 0 rejects**            |

Email is signed by the **execution role**; no access key exists anywhere in the stack.
Confirmed against a real send rather than inferred from configuration.

### Cold start — the one weak spot, and it is the API

| Function | Init      | Warm      |
| -------- | --------- | --------- |
| Web      | ~2,300 ms | 12–240 ms |
| API      | ~7,600 ms | 6–225 ms  |

The Next standalone server boots **three times faster** than Express plus Apollo plus
87 OpenAPI paths, which was not the expected direction. The first request to a cold API
is the only part of the experience that reads as slow; everything after it is
indistinguishable from a warm server.

**Bundling remains the outstanding fix**: 77% of the API's boot is loading the module
graph (2,402 ms of 3,135 ms measured locally), and neither the memory experiment nor the
OpenAPI deferral touched it.

## Slice 6 — scheduled jobs

**Date**: 2026-09-03 · **Commit**: `6ef367d9` · **Deploy**: pending (section below)

### The rule count, from the committed template

The acceptance criterion, read out of `cdk.snapshot/GrantPlatform.template.json`
rather than from the source that generated it.

| Rule                          | Expression            | State        |
| ----------------------------- | --------------------- | ------------ |
| `data-retention-cleanup`      | `cron(0 2 * * ? *)`   | ENABLED      |
| `system-signing-key-rotation` | `cron(0 0 1 * ? *)`   | **DISABLED** |
| `event-relay-sweep`           | `cron(* * * * ? *)`   | ENABLED      |
| `webhook-delivery`            | `cron(* * * * ? *)`   | ENABLED      |
| `notification-delivery`       | `cron(* * * * ? *)`   | ENABLED      |
| `demo-db-refresh`             | `cron(0 0 */2 * ? *)` | **DISABLED** |

Six rules, five production plus one demo-gated. The two disabled ones are off in
`@grantjs/env` (`JOBS_SYSTEM_SIGNING_KEY_ROTATION_ENABLED`, `DEMO_MODE_ENABLED`) and
their rules are synthesized anyway, so the count is not a function of configuration —
a template with five would need careful reading to tell a disabled job from a lost one.

Other resources the slice added, same source: **2** SQS queues (the queue and its
dead-letter queue), **1** Lambda event-source mapping, **1** Lambda function. No new
`AWS::Lambda::Url`: the dispatcher is reachable only through `lambda:InvokeFunction`.

### Perturbation results

A green oracle proves nothing until it is shown to fail. Each row was applied to a
clean tree, run, and reverted.

| Perturbation                                                | Expected | Result          |
| ----------------------------------------------------------- | -------- | --------------- |
| Give `event-relay` a schedule in `apps/api` (a seventh job) | fail     | **1 failed** ✓  |
| Drop `notification-delivery` from the table                 | fail     | **4 failed** ✓  |
| Drift a default schedule (`0 2 * * *` → `0 3 * * *`)        | fail     | **1 failed** ✓  |
| Repoint `webhook-delivery` at another job's schedule key    | fail     | **1 failed** ✓  |
| Pass Unix cron through untranslated                         | fail     | **2 failed** ✓  |
| Give the jobs function a public Function URL                | fail     | **1 failed** ✓  |
| Drop `JOBS_PROVIDER=aws` from the target defaults           | fail     | **1 failed** ✓  |
| Baseline                                                    | pass     | **54 passed** ✓ |

The last two are the security and correctness ends of the same slice: without the
provider the application schedules its own timers _and_ receives the rules, running
everything twice; with a Function URL the dispatch route — mounted ahead of origin
verification because no AWS event source can send CloudFront's secret — becomes an
unauthenticated job trigger on the internet.

### What the dispatch path costs, stated before measuring it

Recorded now so the deploy either confirms or refutes it rather than being read
generously afterwards.

- Each rule invokes a **cold** function most of the time. The sweeps run every minute,
  which will keep one environment warm; the daily and monthly jobs will not.
- A failed scheduled run is **not retried**. Under the Web Adapter the invocation
  returns the route's HTTP response, so a 500 completes the invocation successfully.
  Carried as F5.
- Queued messages _are_ retried, three times, then parked in the dead-letter queue.

### Deploy — two cycles, because the first found an ordering fault

**Date**: 2026-09-03 · **Domain**: `aws.grantjs.org` · **Context**: `-c ephemeral=true`

| Cycle   | Certificate | Platform            | Wall clock (incl. image builds) |
| ------- | ----------- | ------------------- | ------------------------------- |
| 1       | 45.61 s     | 538.56 s            | 711 s                           |
| destroy | —           | 786 s (both stacks) | —                               |
| 2       | 50.35 s     | 605.57 s            | 683 s                           |

The second cycle exists because the first produced a finding that only a fresh deploy
can produce, and re-running it is the only way to show the fix works.

### The dispatch path works, and it is the part nothing local could prove

EventBridge → jobs Lambda → the Web Adapter's pass-through → `/events` →
`IJobAdapter.trigger()` → the job. Read from the jobs function's log group:

| Check                                                         | Result                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| Live rules                                                    | **6**, targets `{"jobId":"…"}` matching the six declarations |
| Rule states                                                   | 4 ENABLED, 2 DISABLED, as the template said                  |
| Scheduled executions (cycle 2, ~10 min)                       | **30, all successful** — 10 each of the three minute sweeps  |
| Queue: valid message                                          | `Queued job executed` for `event-relay`                      |
| Queue: unroutable message                                     | `Queued job failed; message will be retried`, reported back  |
| Jobs function URLs                                            | **none** — `list-function-url-configs` empty                 |
| Direct origin `/health`                                       | **403**, origin verification unchanged                       |
| `/`, `/en/auth/login`, `/docs/`, `/api-docs.json`, `/graphql` | 200 (307 locale redirect at `/`)                             |

The Lambda Web Adapter's pass-through behaves as documented — the open question
recorded before the deploy. Its content type is still undocumented, and the router
parses regardless of it, so this deploy does not settle that half.

### Finding 1 — the rules were armed before the schema existed

The first deploy's sweeps spent their first ninety seconds failing:

```
relation "event_log" does not exist
relation "notifications" does not exist
relation "webhook_delivery_attempts" does not exist
```

The migrate one-shot was still running. Self-correcting — 07:38:48 was the first
success and everything after it passed — but an adopter's first look at a working
stack should not be a log full of errors, and the same window would swallow a genuine
fault. Fixed by ordering the jobs **function** (not just the rules) after the migrate
trigger, which covers the queue too since the event-source mapping is created with it.

**Cycle 2 confirms it**: zero `does not exist` failures, and the first execution
recorded is a success.

### Finding 2 — the first cold starts overran the init ceiling, then stopped doing it

| Cycle | Init                                                             |
| ----- | ---------------------------------------------------------------- |
| 1     | `INIT_REPORT … Status: timeout` ×2 at 9,999 ms, then 4,195.82 ms |
| 2     | 4,897.60 ms and 4,566.36 ms — **no timeout**                     |

Cycle 1's timeouts were during the deploy, with Aurora resuming from zero capacity and
the migration still running. Cycle 2, where the function is created after the migration,
saw none. That is consistent with the mechanism and does not establish it — one deploy
cannot separate a cold cluster from contention with the API function and migrate task
starting at the same moment. Carried as F8; the steady-state figure matches the API's
post-bundling ~4.1 s.

Warm invocations, cycle 2: **n=30, min 11 ms, median 14 ms, max 5,062 ms** (the max is
the cold one). Max memory used ~330 MB of 1,024 — the headroom is large, and shrinking
it is not free, because memory buys the CPU that boot is bound by.

### Finding 3 — a destroy/redeploy cycle drops the out-of-band secrets

`/api/auth/github` answered **500** after cycle 2 while every GitHub value in the
template was correct. The platform secret is recreated empty, so `GITHUB_CLIENT_SECRET`
was simply absent and `isConfigured()` refused. One `put-secrets` run fixed it, plus
300 s for warm containers to see it — and testing inside that window looks exactly like
the fix having failed, which it briefly did here. Carried as F10 for the guide.

### The enqueue-only path, exercised by a real import

Not a synthetic probe: a CDM import run from the dashboard against a live project,
which is the first time `project-sync` has executed anywhere on this target.

| Hop                               | Evidence                                                    |
| --------------------------------- | ----------------------------------------------------------- |
| API `startProjectSync` → SQS      | `NumberOfMessagesSent` 5                                    |
| SQS → event-source mapping        | `NumberOfMessagesReceived` 5, in flight 0                   |
| Mapping → jobs Lambda → `/events` | `EventDispatch … Queued job executed  jobId=project-sync`   |
| `trigger()` → `ProjectSyncJob`    | `Starting job` 08:27:40 → `completed successfully` 08:31:08 |
| Message settled                   | `NumberOfMessagesDeleted` 5, DLQ 0, Errors 0, Throttles 0   |

Result: `rolesCreated: 5, groupsCreated: 5, userRolesAssigned: 273, warnings: 49`.

**Duration 208.25 s**, agreeing to the millisecond between the log delta and the
Lambda `Duration` metric. Under `node-cron` this same work ran inline in the API
request, against a 30-second timeout — so this run is direct evidence for why the
provider switch had to bring the queue with it.

**It is also the first CDM import duration measured anywhere**, which ADR 0002 asks
for and phase C owns. It is _not_ the measurement that ADR needs: 283 entities is two
orders of magnitude below the 28,880-entity scenario, and nothing here separates
per-entity work from fixed cost (fetching the document, transaction setup). Extrapolating
from one point would produce exactly the confident wrong number the ADR warns about.
What it does establish is that a real import fits the 15-minute ceiling with room, and
that the ceiling is reached by scale rather than by overhead.

**What could not be observed**: the `project_sync_jobs` row itself. The cluster has the
Data API disabled and sits in isolated subnets, so there is no path to it from a
developer machine without adding a bastion or an in-VPC one-off task. The API serving
`/sync/jobs/{id}/payload` and `/snapshot` with 200 proves the row exists and is
readable; its `status` value is not evidenced here.

### Teardown — clean for everything billed, and two things it leaves

| After `cdk destroy --all`       | Result        |
| ------------------------------- | ------------- |
| CloudFormation stacks           | gone          |
| EventBridge rules               | **0**         |
| SQS queues (incl. dead-letter)  | **0**         |
| Lambda functions                | 0             |
| RDS clusters / manual snapshots | 0 / 0         |
| Secrets (incl. pending delete)  | 0             |
| S3 buckets                      | 2 = baseline  |
| Route 53 records                | 20 = baseline |

### Final teardown — end of the slice 6 session

**Date**: 2026-09-04 · `cdk destroy --all` · **754 s** (12m34s) for both stacks

Every billed resource returned to baseline: Route 53 records 20 = baseline, S3
buckets 2 = baseline, and zero across EventBridge rules, SQS queues, Lambda
functions, RDS clusters, manual snapshots, secrets (including pending deletion),
non-default VPCs, NAT gateways, DynamoDB tables and CloudFront distributions.

The throwaway webhook probe — a Lambda, an HTTP API, an IAM role and a log group,
created outside CDK to receive deliveries — was removed with it, also to zero.

Unchanged from the earlier cycle, and both already recorded: the ACM validation
CNAME persists (F1, idempotent per domain, which is why the record count still
reads as baseline) and the stack-owned log groups persist (F7). The log groups are
the one residue that **grows**: this session added three more, and the account now
holds 82 `Grant`-named groups across the story's deploy cycles.

Two residues, both now measured rather than assumed:

- **The ACM validation CNAME persists** (`_17d199c9b8df2cc1e725d5274f58c2bf.aws.…`),
  confirming F1 — and refining it: ACM reuses one validation record per domain, so the
  leak is **idempotent, not per-cycle**. That is why the record count still reads as
  baseline.
- **Log groups survive**: 12 stack-owned (7 `GrantApiLogs`, 2 `GrantWebLogs`, 1
  `GrantJobsLogs`) plus 38 CDK custom-resource groups. CDK's `LogGroup` defaults to
  `RETAIN`, and unlike the CNAME this **grows by one per function per deploy cycle**.
  New finding, F7; slice 7's guide gets the cleanup command.

## Slice 7 — smoke test and guide

**Date**: 2026-09-05 · **Domain**: `aws.grantjs.org` · **Context**: `-c ephemeral=true`

Green-field deploy into an account returned to baseline by slice 6's final teardown,
then the story's only end-to-end check. Baseline confirmed before deploying: 2 S3
buckets, 0 CloudFront distributions, 0 RDS clusters, 0 Lambda functions, 20 Route 53
records, only `CDKToolkit` in both regions.

### Timings

| Phase                                     | Wall clock  |
| ----------------------------------------- | ----------- |
| Docker build + push, both images (cached) | ~2 min      |
| `GrantCertificate` (us-east-1)            | 44 s        |
| `GrantPlatform`                           | 10 min 08 s |
| **Total, one command**                    | **~12 min** |

`GrantPlatform` ran 17:00:57 → 17:11:05 UTC, from CloudFormation's own stack events
rather than from the CLI's summary. This is the figure the brief's "roughly half an
hour green-field" estimate is replaced by: it is **less than half** the estimate,
because the image layers were cached. A first-ever build adds roughly 10 minutes.

### The smoke test, and the two checks it got wrong first

`deploy/aws/scripts/smoke.ts`, 14 checks over **10/10 CloudFront behaviours**. Coverage
is computed from `toCloudFrontBehaviours()` + `ASSET_BEHAVIOURS` + the default rather
than hand-listed, and an uncovered behaviour **fails the run** — so the test cannot
quietly stop covering a route someone adds.

First run was 11/13. `/org/*` and `/acc/*` reported "fell through to the web app", and
that diagnosis was wrong: the API _was_ answering. Its 404 for a nonexistent project
carries `content-length: 0`, so "the body parses as JSON" fails on a **correctly**
routed request. The discriminator that works is headers — Express sets `x-request-id`
on every API response, Next sets `x-powered-by` on its own:

| Path                        | Status | `content-type`     | Marker                  |
| --------------------------- | ------ | ------------------ | ----------------------- |
| `/en/definitely-not-a-page` | 404    | `text/html`        | `x-powered-by: Next.js` |
| `/org/<uuid>/prj/<uuid>/…`  | 404    | `application/json` | `x-request-id: …`       |

Worth recording because it is the failure mode the oracle exists to prevent, arriving
from the other direction: a check that is **wrong about what it proves** reports a
routing fault that does not exist. Fixed, then 13/13.

### Final result — 14/14, from code, nothing patched

| Behaviour         | Check                           | Result                                 |
| ----------------- | ------------------------------- | -------------------------------------- |
| `*`               | root                            | **307** → `/en`                        |
| `*`               | rendered page                   | **200**, 20,341 bytes                  |
| `*`               | `/docs` trailing slash          | **302** → `/docs/`                     |
| `*`               | `/api` trailing slash           | **302** → `/api/`                      |
| `/_next/static/*` | asset, discovered from the HTML | **200**, `max-age=31536000, immutable` |
| `/health*`        | liveness                        | **200**, `status=ok`                   |
| `/api/*`          | REST router                     | **200**, JSON                          |
| `/graphql*`       | GraphQL                         | **200**, `__typename=Query`            |
| `/api-docs*`      | OpenAPI                         | **200**, openapi 3.0.0, **87 paths**   |
| `/.well-known/*`  | platform JWKS                   | **200**, 1 key                         |
| `/org/*`          | reaches the API                 | **404 from the API**                   |
| `/acc/*`          | reaches the API                 | **404 from the API**                   |
| `/docs/*`         | index rewrite                   | **200**, 38,985 bytes                  |
| `/api/*`          | **account registration**        | **201**                                |

**EventBridge rules: exactly 6**, matching the count slice 6 made a pass condition.

### The first account, created through the deployed API

`POST /api/auth/register` → **201**, `accountId 719358c3-…`, confirmed in the API log
(`msg: "User registered"`). Registration alone sends no mail; `POST
/api/auth/resend-verification` → **200**, and SES then recorded **Delivery 1, Bounce 0,
Reject 0**. Signed by the execution role — no access key exists in the stack.

The per-minute `notification-delivery` job logged `delivered: 0` on every run
throughout, which is also the standing evidence that the EventBridge → jobs Lambda path
works on this deploy.

### Finding 1 — the database never reaches zero, and the jobs are why

The headline number of this slice, and it contradicts the target's own pitch.

The cluster is `minCapacity: 0` with `SecondsUntilAutoPause: 300`, so it should cost
nothing idle. Observed capacity is a **flat 0.5 ACU** across every one-minute datapoint
with no user traffic at all. Cause: **three sweeps run every minute** —
`event-relay-sweep`, `webhook-delivery`, `notification-delivery` — and each opens a
connection, so the cluster never sees 300 idle seconds.

Billing agrees independently: **8.605 ACU-hours over 16 hours up** on 2026-09-03 is a
mean of **0.538 ACU**. Two different instruments, same answer.

**Not established by experiment.** The direct test — disable the six rules, watch
capacity fall to zero — was not run, so the mechanism is inferred from the schedule
plus two consistent measurements rather than demonstrated. Stated as inference.

Note that a 5-minute schedule would **not** fix it: auto-pause needs 300 idle seconds,
which a 5-minute sweep straddles.

### Cost floor — measured, not estimated

Derived from Cost Explorer. The 16 billed NAT-gateway hours on 2026-09-03 pin the
stack's uptime exactly, which makes every other line divisible by it. The account is
otherwise near-empty — baseline is ~$0.007/day of Route 53 — so the daily totals are
almost entirely this stack.

| Item                           | Measured rate    | Per month (730 h) |
| ------------------------------ | ---------------- | ----------------- |
| NAT gateway                    | $0.05200 / h     | $37.96            |
| Public IPv4 (the NAT's)        | $0.00500 / h     | $3.65             |
| Aurora Serverless v2 @ 0.5 ACU | $0.14000 / ACU-h | $51.10            |
| Secrets Manager, 1 secret      | —                | $0.40             |
|                                |                  | **≈ $93 / month** |

The brief predicted "a floor in the tens of dollars per month". That holds, but it
attributed the floor to NAT plus a minimum-capacity database. **Aurora is the larger
half**, and it is caused by the job schedule rather than by the database's minimum —
which is the part an adopter can actually change. Per-request costs at smoke-test
volumes were below a cent per day and are not what anyone budgets for.

### Finding 2 — a security-relevant stack output stated the opposite of the truth

`ApiFunctionUrl` was described as "IAM-authorized origin endpoint. Not publicly
reachable; sign requests with SigV4."

Verified against the live stack, all three clauses are wrong:

- `get-function-url-config` returns **`AuthType: NONE`**
- an unsigned `GET /health` **reaches the application** and returns its 403 body
  (`{"error":"Forbidden","code":"FORBIDDEN",…}`), not a Lambda IAM rejection

The endpoint is public; what refuses the request is the application's origin-verify
middleware, which is exactly the design slice 4's security review recorded as an
accepted risk. The output text contradicted that record. Fixed in
`lib/grant-platform.ts`; one line of the committed snapshot changed with it.

This one matters more than its size: it is the sentence an adopter reads in `cdk
deploy` output while deciding whether the endpoint needs protecting.

### Cold starts — the bundling fix holds, and the web function improved sharply

| Function | Init           | Warm invocations               |
| -------- | -------------- | ------------------------------ |
| Web      | 526–630 ms     | n=61, min 9 ms, median 235 ms  |
| API      | 3,776 ms       | n=47, min 24 ms, median 132 ms |
| Jobs     | 3,808–3,919 ms | n=364, min 7 ms, median 11 ms  |

The API's 3,776 ms confirms slice 6's post-bundling ~4.1 s and is **half** the 7,600 ms
slice 5 measured pre-bundling. The web function's 526–630 ms against slice 5's
~2,300 ms is a **four-fold** improvement that this slice did nothing to cause and does
not explain; recorded as an observation, not a claim.

### Teardown — the account returned to baseline

**Date**: 2026-09-05 · `cdk destroy --all` · **39 s** for the remaining stack

Recorded late, and that is itself the finding. The slice 7 session tore down
`GrantPlatform` but left **`GrantCertificate` standing in `us-east-1`** — a stack and
an ACM certificate that a check of the platform region alone reports as clean. The
gate 4 audit (F15) caught it; a `--all` destroy at the end of the session would have.
The lesson is that "torn down" has to be measured in **both** regions, because this
target is deliberately two-region and only one of them holds anything interesting.

| After `cdk destroy --all`       | Result                          |
| ------------------------------- | ------------------------------- |
| CloudFormation stacks           | `CDKToolkit` only, both regions |
| ACM certificates (`us-east-1`)  | **0**                           |
| CloudFront distributions        | 0                               |
| RDS clusters / manual snapshots | 0 / 0                           |
| Lambda functions                | 0                               |
| EventBridge rules               | 0                               |
| SQS queues                      | 0                               |
| DynamoDB tables                 | 0                               |
| Secrets (incl. pending delete)  | 0                               |
| NAT gateways / non-default VPCs | 0 / 0                           |
| S3 buckets                      | 2 = baseline                    |
| Route 53 records                | 20 = baseline                   |

Nothing billed survives. The two residues are the ones already carried:

- **F1 — the ACM validation CNAME persists**, and it is the _same record_ slice 6
  recorded: `_17d199c9b8df2cc1e725d5274f58c2bf.aws.grantjs.org.` Two full
  deploy/destroy cycles later it has not duplicated, which upgrades "idempotent per
  domain" from inference to a measurement across cycles. It is why the record count
  reads as baseline rather than baseline+1.
- **F7 — log groups survive and accumulate.** 82 at the end of slice 6, **90 now**:
  eight more from this session's deploy, the rotation redeploy and the destroy.
  Unchanged as the one residue that grows per cycle, and the reason the guide ships a
  cleanup command.
