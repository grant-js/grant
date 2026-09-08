# Stack plan — Bring-your-own PostgreSQL, end to end

## Metadata

- **Slug**: `byo-database`
- **Story brief**: [`2026-09-05-byo-database-brief.md`](./2026-09-05-byo-database-brief.md)
  — approved 2026-09-05, Ale Heredia, with all three open questions answered
- **Program brief**: [`2026-09-05-aws-followups-brief.md`](./2026-09-05-aws-followups-brief.md)
  — tier 1, item 1
- **Status**: `approved` — gate 2 cleared 2026-09-06, Ale Heredia
- **Story trunk**: `feat/byo-database`
- **Base**: `main` at `5fd7e1d3` (#385). The brief was written against `798111ac`;
  § Citation re-verification below covers the move.
- **Measurements**: `plans/2026-09-05-byo-database-measurements.md` — created by
  slice 5, the only deployed slice
- **Governing ADRs**: [0005](../decisions/0005-aws-target-as-a-construct-library.md)
  decides the shape (interface-typed props, `bin/` is the replaceable layer);
  [0004](../decisions/0004-secret-resolution-through-a-port.md) is why `apps/api` needs no change;
  [0003](../decisions/0003-lambda-web-adapter-over-a-handler-entrypoint.md) is why the migration and the
  serving function stay one artifact; [0001](../decisions/0001-configuration-gated-database-bootstrap.md)
  is why a migration path has to exist at all.
- **worktree_path**: **not required.** `git worktree list` shows the main checkout
  plus `../grant-pr384` on `fix/request-log-client-ip`, which merged as #384 and can
  be removed. No other story is in flight.

## Citation re-verification

`main` moved after gate 1 was drafted (`798111ac` → `5fd7e1d3`: #384 request-log
client IP, #385 phase C close-out). Every citation in the brief re-verified against
`5fd7e1d3`:

| Citation                                                            | Status                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `props.ts:132` — "Omit entirely to bring your own via `DB_URL`"     | holds                                                                      |
| `props.ts:368-371` — "supply `DB_URL` through `env`"                | holds                                                                      |
| `props.ts:374` — migration "Ignored when this stack does not own …" | holds                                                                      |
| `grant-platform.ts:147` — the single `if (props.database) {`        | holds                                                                      |
| `grant-platform.ts:97-99` — "does not get one yet" doc comment      | holds                                                                      |
| `env-file.ts:30-31` — "an operator … sets it as ordinary `env`"     | holds                                                                      |
| `env-file.ts:33` — `RESOLVER_SECRET_KEYS`                           | holds                                                                      |
| `env-file.ts:66-82` — `CREDENTIAL_KEYS`, 15 keys                    | holds                                                                      |
| `env-file.ts:136-176` — `classifyConfig`                            | holds                                                                      |
| `platform-secret.ts` — composes `DB_URL` from cluster credentials   | holds                                                                      |
| `apps/api/src/lib/secrets/database-url.ts:41`                       | holds                                                                      |
| `apps/api/src/lib/rls/rls-context.ts:96-104` — `SET LOCAL ROLE`     | holds                                                                      |
| `credential-keys.test.ts` — the classification oracle               | holds                                                                      |
| `docs/deployment/aws-serverless.md:303` — the warning block         | **moved to `:308`**; the resource table's **PostgreSQL** row is now `:305` |

The one that moved did so because #384 deleted the client-IP row from § Known
limitations. Nothing in the brief's reasoning depends on it.

Two citations the brief did not carry but the slices need, also at `5fd7e1d3`:

- `deploy/aws/.env.example:157-162` — the "`DB_URL` — does NOT work yet" block.
- `docs/deployment/aws-serverless.md:41` — "**PostgreSQL and Redis are not something
  you bring.**" That sentence becomes half true when this story lands and is on
  slice 5's list.

## Gate 1 decisions

The brief's three open questions, answered 2026-09-05. Each one determined a slice,
and the third overrode an acceptance criterion — recorded here rather than quietly
reinterpreted.

1. **VPC → support both, and refuse the ambiguous middle.** `vpc` and
   `securityGroups` become optional on `ApiFunction` and `JobsFunction`, exactly as
   they already are on `WebFunction` (`web-function.ts:66-71`) — so the shape has
   precedent in this library rather than being invented here. A publicly reachable
   managed Postgres is the deployment most adopters bringing their own database
   actually have, and it removes the NAT gateway, which is the largest fixed cost in
   the target. Architect is active on the slices that do it (2 and 3), because
   VPC-optional changes what the construct library promises.

2. **Migration → the Fargate one-shot when a VPC is in the graph, a built operator
   command when there is not, and never nothing.** Fargate needs subnets, so the
   VPC-less topology has nowhere to run the task. The added condition from gate 1 is
   that "the guide tells you to run it yourself" does not count as a path: slice 3
   builds `pnpm --filter grant-aws-deploy migrate`, which runs the **same**
   `node dist/migrate.js` entrypoint against the **same** platform secret, and
   slice 5 runs it against a live database. `migrate.ts` is already the right shape
   for this — it resolves `DB_URL` through `ISecretResolver` (`apps/api/src/migrate.ts:29`)
   and performs migrations, the RLS role grant and the core seed in one idempotent,
   advisory-locked pass.

3. **`DB_URL` → refused from the env file; supplied as a `SecretValue`.** This
   supersedes the letter of the brief's third acceptance criterion. Routing `DB_URL`
   through `RESOLVER_SECRET_KEYS` would put it in the hands of `put-secrets`, which
   reads `Stacks[0].Outputs` (`scripts/put-secrets.ts:70-90`) and therefore cannot
   run until the deploy that publishes them has finished — leaving the migration and
   the API's first minutes with no database URL. So `DB_URL` is refused at synth with
   a message naming the fix: put the URL in Secrets Manager and pass
   `-c dbUrlSecretArn=…`, which the stack renders as a `{{resolve:secretsmanager:…}}`
   dynamic reference inside the platform secret. Present at deploy time, absent from
   the template. The criterion's intent — `DB_URL` never becomes a Lambda environment
   variable, and `credential-keys.test.ts` covers it — is met in full.

4. **Derived, and the one most likely to be violated: no new construct scopes.**
   CloudFormation logical IDs are a hash of the construct path, so wrapping the
   eleven constructs currently inside `if (props.database)` in a tidy `DataTier`
   sub-construct would rename **every resource in the green-field template** — which
   on an existing deploy means replacing a database. The refactor is done in place,
   with flags, in the same scope (`this`). `synth:check` is what proves it.

## The shape this adds

Two new props, a handful of reference-app context flags, and a topology table that
says which combinations are supported and which are refused.

| Prop                                             | Meaning                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database?: DatabaseProps`                       | Unchanged. Present ⇒ this stack owns an Aurora cluster.                                                                                                    |
| `databaseUrl?: SecretValue`                      | **New.** Present ⇒ serve against a database this stack did not create.                                                                                     |
| `network?: NetworkProps`                         | Unchanged with `database`. With `databaseUrl` it also decides _whether_ there is a VPC.                                                                    |
| `network.databaseSecurityGroup?: ISecurityGroup` | **New.** The adopter's database security group, so the stack can open it to `DatabaseClients` rather than leaving a manual step in the middle of a deploy. |

| #   | `database` | `databaseUrl` | `network`              | Result                                                                                |
| --- | ---------- | ------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| A   | set        | —             | any                    | Green-field. **Byte-identical to `main`.**                                            |
| B   | —          | set           | `{ vpc }`              | BYO in the adopter's VPC. Fargate migration on; `DatabaseClients` opened to their SG. |
| C   | —          | set           | omitted                | BYO, no VPC. Functions run outside one; migration via the operator command.           |
| D   | —          | set           | `{}` / `{natGateways}` | BYO, stack creates the VPC (a routable or peered database). Fargate migration on.     |
| E   | —          | —             | any                    | Docs-only. **Unchanged** — no VPC, no cluster, no serving function.                   |
| F   | set        | set           | any                    | **Refused at synth**: pick one.                                                       |

The ambiguous middle question 1 asks about is topology C with a database that is not
actually reachable from outside a VPC. Nothing at synth can detect that — the URL is
a `SecretValue`, opaque by construction — so it is not guessed at. What _is_ refused
is the structurally impossible: `migration.enabled: true` in topology C, and F.

## Governing constraint

Inherited from the program and unchanged: **additive and configuration-driven.** For
this story the parity property has a mechanical oracle, which is why the brief made it
the governing acceptance criterion:

> With `database` supplied, `pnpm --filter grant-aws-deploy synth:check` produces no
> diff in `cdk.snapshot/GrantPlatform.template.json`.

A diff there fails the slice unless it is argued for explicitly in the PR body. It is
also the only check that catches gate 1 decision 4, and it already runs in CI
(`.github/workflows/ci.yml:159`).

The BYO topologies get their own committed template (slice 4) so the new path has
reviewable evidence of the same kind, rather than only assertions about it.

## Verification model

Unlike phase C, **four of the five slices are fully CI-verifiable**, because the work
is a synth-time graph and a classification rule. Only the proof needs an account.

| Slice | Evidence                                                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------- |
| 1–4   | CI. Unit tests, `synth:check` on both shapes, `dead-code:deploy`, lint, type-check.                               |
| 5     | **A recorded deploy** of topologies B and C, each smoke-tested, migrated, and destroyed. Measurements file first. |

Slice 5 follows phase C's model exactly, including the part F15 was raised for:
`cdk destroy` run to completion and **the account measured back to baseline in both
regions** — `eu-central-1` for the platform and `us-east-1` for `GrantCertificate`.
The external database is torn down with it and counted in the same check; a story
about not creating a database must not leave one running.

## Active roles

- [x] Project Manager — gate decisions, and the AC-3 override above
- [x] Principal Engineer — slice order, integration, scratch-account and
      external-database lifecycle
- [x] **Senior Backend** — slices 1–4
- [x] **Architect — slices 2 and 3.** Gate 1 answered question 1 as "both", and the
      brief makes Architect conditional on exactly that: VPC-optional changes what
      `deploy/aws/lib/` promises, and `props.ts` is an API (`props.ts:15-17`).
- [x] **Senior Security — slice 1, blocking, and _not_ the slice author.** Phase C's
      F16 is the reason this is stated twice: a self-reviewed security slice cleared
      gate 3 and had to be redone at gate 4.
- [x] **Senior QA — slice 5**, and the test shape for slices 2–3
- [x] Verifier — after every slice

## Ordered slices (PRs)

| #     | Branch                            | Base    | Concern                                                      | Owner             | Review bar        | PR  |
| ----- | --------------------------------- | ------- | ------------------------------------------------------------ | ----------------- | ----------------- | --- |
| 1     | `feat/byo-database-secret`        | trunk   | `DB_URL` refusal; `PlatformSecret` without a cluster         | Backend + **Sec** | **security-full** |     |
| 2     | `feat/byo-database-graph`         | slice 1 | The eleven constructs come out of `if (props.database)`      | Backend + Arch    | light             |     |
| 3     | `feat/byo-database-vpcless`       | slice 2 | VPC-optional; migration policy; the operator migrate command | Backend + Arch    | light             |     |
| 4     | `feat/byo-database-reference-app` | slice 3 | `bin/` context surface; the committed BYO template           | Backend           | light             |     |
| 5     | `feat/byo-database-proof`         | slice 4 | Deployed proof of B and C, torn down; the guide              | **QA**            | light             |     |
| final | `feat/byo-database`               | `main`  | integration                                                  | Principal         | **deep**          |     |

### Slice 1 — the secret path

**The whole security surface of the story, in one diff a reviewer can hold.** It
changes no resource graph: with `database` supplied the template is untouched, and
`databaseUrl` is accepted but not yet consumed. That split is deliberate — the
security reviewer reads a diff about secret handling and nothing else — and it is the
predictable review objection, so it is answered here rather than in the PR thread.

- `lib/config/env-file.ts` — refuse `DB_URL`, ordered **before** the
  `RESOLVER_SECRET_KEYS` branch. The message says both halves of the truth: with
  `database` the stack composes it from the cluster it creates; without, put it in
  Secrets Manager and pass `-c dbUrlSecretArn=…`. Delete the header's now-false
  sentence at `:30-31`.
- `lib/data/platform-secret.ts` — accept `databaseUrl?: SecretValue` as an
  alternative to `databaseCredentials` + `host` + `port` + `databaseName`. Exactly
  one of the two, asserted at synth. `ORIGIN_VERIFY_SECRET` generation is unchanged
  and stays on both paths — it is why this construct is required by every serving
  topology, not just the green-field one.
- `lib/config/props.ts` — `databaseUrl` on `GrantPlatformProps`, documented with the
  same `SecretValue` warning `secrets` already carries (`props.ts:392-404`):
  `secretsManager(…)` renders a dynamic reference, `unsafePlainText` puts the literal
  in the template, and `unsafe` is not decoration.
- `lib/data/platform-secret.test.ts` (new) — the BYO secret renders
  `{{resolve:secretsmanager:` and no plaintext; the green-field composition is
  unchanged including `sslmode=require`; supplying both or neither is refused.
- `lib/config/env-file.test.ts` — the refusal, and its message naming the fix.
- `lib/config/credential-keys.test.ts` — **`DB_URL` is the one credential the oracle
  cannot see.** The heuristic is `/(SECRET|PASSWORD|API_KEY|PRIVATE_KEY|ACCESS_KEY|CREDENTIAL)/`
  (`credential-keys.test.ts:34`) and a password carried inside a URL matches none of
  it. Add an explicit assertion that `DB_URL` is classified, with a comment saying why
  widening the regex is not the fix — `_URL$` would sweep in `APP_URL`, `DOCS_URL` and
  `SECURITY_FRONTEND_URL`, and a heuristic that over-matches on eight harmless keys
  gets muted rather than read.
- `.env.example` — replace the "does NOT work yet" block (`:157-162`) with the
  refusal and the ARN flow. Prose in the guide waits for slice 5, where it has
  measurements behind it.

**Security review checklist for this slice** (the reviewer's list, not the author's):
does any path put a database password in the template, in `cdk.out`, or in a Lambda
environment variable; does the dynamic reference resolve at create _and_ update;
what does a rotation of the adopter's upstream secret do (see § Risks, row 1); does
the refusal fail closed for someone upgrading with `DB_URL` already in their `.env`.

### Slice 2 — constructibility without a cluster

The core of the story, and the one governed by decision 4.

- `lib/grant-platform.ts` — two decisions replace one: `ownsDatabase` gates
  `Network`, `Database`, the proxy-or-direct ingress rule and the `DatabaseClients`
  group; `servesApi = ownsDatabase || databaseUrl` gates `PlatformSecret`, `ApiImage`,
  `MigrateTask`/`MigrateTrigger`, `CacheTable`, `StorageBucket`, `JobQueue`,
  `ApiFunction`, `JobsFunction`, `JobSchedules` and the outputs. In place, same scope,
  same construct ids. Delete the "does not get one yet" comment at `:97-99` — it
  stops being true in this diff.
- `MigrateTrigger.executeAfter` — with no `Database` in the graph there is nothing to
  order against but `this.platformSecret`. The comment at `:263-278` explains an
  Aurora-specific race; it must stay accurate for the path that still has one and say
  plainly that reachability is the adopter's precondition on the path that does not.
- `lib/config/validate.ts` — `assertDatabaseSelection`: topology F refused with a
  real sentence.
- `lib/config/props.ts` — three doc comments become false in this slice and are fixed
  with it: `database` (`:132`, `:368-371`), `migration` and `jobs` "Ignored when this
  stack does not own the database" (`:374`, `:377`), and `secrets` "Only meaningful
  when this stack owns the database" (`:407`).
- `lib/data/byo-database.test.ts` (new) — the inventory assertion the brief's first
  acceptance criterion asks for: API function, web function, docs site, cache table,
  uploads bucket, job queue, jobs function, **six** EventBridge rules, platform
  secret, and zero `AWS::RDS::DBCluster`.
- `lib/data/data-tier.test.ts` — "creates no VPC or database when not requested"
  (`:53`) still holds for topology E and gains the BYO cases; its `build()` helper
  needs a `databaseUrl` parameter.
- **`synth:check` clean.** The oracle for the whole slice.

### Slice 3 — VPC-optional, and always a way to migrate

- `lib/compute/api-function.ts`, `lib/compute/jobs-function.ts` — `vpc?` and
  `securityGroups?`, spread conditionally exactly as `web-function.ts:66-71` does.
  Nothing else about either function changes.
- `lib/grant-platform.ts` — network decided independently of the database, per the
  topology table. `DatabaseClients` exists only where a VPC does.
- `lib/data/network.ts` / `lib/config/props.ts` — `databaseSecurityGroup?: ISecurityGroup`
  and `databasePort?: number` (default 5432). Without it topology B has a manual
  security-group edit in the middle of a deploy, which is the kind of step that turns
  a supported path back into a plausible-looking one. `SecurityGroup.fromSecurityGroupId`
  left mutable emits an `AWS::EC2::SecurityGroupIngress` against a group CDK does not
  own; if that proves not to hold, fall back to exposing the client group and
  documenting the one command — and say which happened in the PR.
- `lib/config/validate.ts` — refuse `migration.enabled: true` in topology C, naming
  `pnpm --filter grant-aws-deploy migrate` in the message.
- `scripts/migrate.ts` + `package.json` (new script) — reads the URL from the secret
  named by `-c dbUrlSecretArn` / `GRANT_DB_URL_SECRET_ARN` via the AWS CLI (the same
  shell-out `put-secrets.ts` already justifies at `:12-14`), then runs
  `node dist/migrate.js` in the API image with `SECRETS_PROVIDER=env`,
  `STORAGE_PROVIDER=local` and `AWS_TARGET_ENV_DEFAULTS` — **imported from
  `lib/config/defaults.ts`**, so the operator command and the stack cannot drift.
  Values are never printed; key names are.
- `lib/compute/data-connectivity.test.ts` — a function with no VPC has no
  `VpcConfig`, keeps its `secretsmanager:GetSecretValue` grant, and still has no
  database credential in its environment.
- `lib/config/validate.test.ts` — the migration refusal.

### Slice 4 — the reference app, and the BYO template as evidence

- `bin/grant.ts` — `-c dbUrlSecretArn=…` selects BYO (`database` omitted,
  `databaseUrl: SecretValue.secretsManager(arn)`); `-c vpcId`, `-c vpcAzs`,
  `-c vpcPrivateSubnetIds` select topology B via `Vpc.fromVpcAttributes`, never
  `fromLookup` — a lookup would make the committed template a function of whichever
  account last synthesized (`props.ts:48-52`, ADR 0005). `-c dbSecurityGroupId`
  opens the adopter's group. Validate the ARN lexically the way `certificateArn`
  already is (`validate.ts:60-80`), so a wrong-account or wrong-region secret fails
  at synth rather than mid-deploy.
- `scripts/snapshot-template.mjs`, `package.json` — a second synth into
  `cdk.snapshot/byo/`, and `synth:check` covering both. The green-field snapshot
  proves byte-identity; the BYO snapshot proves the inventory, in the same reviewable
  form phase C established.
- `scripts/put-secrets.ts` — its "this stack may not own one" error (`:86-88`) is now
  wrong on the BYO path, where the output exists and the stack owns no database.
- `.env.example` — the ARN flow, next to the refusal slice 1 added.

### Slice 5 — the deployed proof, and the guide

**Both topologies, or the story is not done.** B and C have different failure modes
and the guide will claim both.

- `plans/2026-09-05-byo-database-measurements.md` (new) — created before the first
  deploy, in phase C's shape: wall-clock, `cdk diff` inventory, the observable check
  with its output, and what `cdk destroy` left behind.
- **Topology B**: an RDS PostgreSQL instance created out of band in the scratch
  account — deliberately not by this stack — then `cdk deploy` with `-c vpcId=…`,
  the Fargate migration converging on the first deploy, `pnpm smoke` green,
  `cdk destroy`, both regions to baseline, the RDS instance deleted.
- **Topology C**: a publicly reachable managed Postgres, no VPC, no NAT.
  `pnpm --filter grant-aws-deploy migrate` run against it, `pnpm smoke` green, and a
  recorded **cost delta versus the green-field floor** — removing the NAT gateway is
  the reason this topology exists, so the number is part of the evidence.
- **The RLS precondition is tested, not documented into existence.** `migrate.js`
  runs the RLS role grant and the core seed (`apps/api/src/migrate.ts:2-8`), so a
  managed Postgres that restricts role creation fails there. Whatever the two
  databases do is a measurement; record it either way.
- `docs/deployment/aws-serverless.md` — delete the warning (`:308`); move the
  **PostgreSQL** row (`:305`) to supported with its preconditions; amend
  "PostgreSQL and Redis are not something you bring" (`:41`), which becomes half
  true; add § Bring your own PostgreSQL covering the two topologies, both migration
  commands, the RLS precondition, the `sslmode` note (the adopter's URL is used as
  written and never rewritten), and the rotation caveat from § Risks row 1.

## Security review findings carried forward

Slice 1's blocking security review (2026-09-06) found six issues beyond the slice's
own design. Four were fixed in slice 1; two belong to later slices and are recorded
here so they are not lost between them.

| From | Finding                                                                                                                                                                                                                                                    | Disposition                                                                                                                                                                                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1   | `parseEnvFile` matched keys case-insensitively while every refusal matched exactly, so `db_url=` and `smtp_password=` reached the template as plaintext Lambda variables. Pre-existing; in scope because slice 1 claims the `DB_URL` refusal fails closed. | **Fixed in slice 1.** Upper-case keys only, and a lower-case one is an error rather than a silent skip.                                                                                                                                                                                        |
| F2   | `DB_GRANT_ROLE_URL` (a **superuser** URL) and `E2E_DB_URL` were unclassified — a password inside a URL matches none of `CREDENTIAL_SHAPED`.                                                                                                                | **Fixed in slice 1.** Both refused; the oracle now checks both directions for URL-shaped keys. Note `DB_GRANT_ROLE_URL` is § Risks row 3's likely workaround, and it is read from `process.env`, not the resolver — so slice 5's guide must say the RLS grant is run manually, not configured. |
| F4   | `resolveDatabaseUrl` wrote an empty or malformed `DB_URL` rather than throwing; the failure then surfaced as a connection error to `localhost`.                                                                                                            | **Fixed in slice 1**, honoring § Risks row 4's "validate and say what is wrong".                                                                                                                                                                                                               |
| F6   | The rotation wording said "until the next deploy". A rotation changes nothing in the template, so there is no update and `cdk deploy` reports success while keeping the old URL.                                                                           | **Fixed in slice 1** in `props.ts` and `.env.example`. **§ Risks row 1 above is still imprecise in the same way** — read it with this correction.                                                                                                                                              |
| F10  | The `DB_URL` refusal exists only on the env-**file** path. A caller writing their own `bin/` can pass `env: { DB_URL: '…' }` and reach the identical plaintext Lambda variable with no guard. ADR 0005 explicitly invites that.                            | **Slice 2.** `assertDatabaseSelection` also asserts `STACK_COMPOSED_KEYS ∩ Object.keys(props.env)` is empty.                                                                                                                                                                                   |
| F7   | Slice 1's refusal message and `.env.example` name `-c dbUrlSecretArn=<arn>`, which nothing reads yet; an unrecognized `-c` is silently ignored.                                                                                                            | **Slice 4** builds it. Acceptable inside the stack, not at `main` — gate 4 re-verifies.                                                                                                                                                                                                        |

Two measurements added to slice 5, both from findings that cannot be settled without
an account:

- Rotate the upstream secret, redeploy unchanged, and record whether the platform
  secret's `DB_URL` moved (F6). Record too whether a stack update that _does_ modify
  the platform secret overwrites an out-of-band write, and what it does to
  `ORIGIN_VERIFY_SECRET`.
- Put a `"` in the referenced secret and record what CloudFormation does (F5). The
  value is substituted textually into a JSON document at deploy time, so a quote may
  merely break it — or may close `DB_URL` and open another key, which is the
  resolver's entire input. Literals are checked at synth; a referenced secret's
  contents are not visible there.

## Stack setup

Root the stack on the trunk — never `main`, or the slices skip gate 4:

```sh
git switch -c feat/byo-database origin/main && git push -u origin feat/byo-database
gh stack init --base feat/byo-database feat/byo-database-secret

# after each slice
gh stack submit --auto
gh stack link --base feat/byo-database <pr> <pr>   # bottom to top
gh stack add feat/byo-database-graph               # before starting the next one
```

`--base` is not optional on `init` or `link`. `gh stack submit --auto` opens drafts;
`gh pr ready <pr>` when a slice is ready for gate 3.

## Dependencies / notes

- **Slices 1–4 need no AWS access at all.** That is the point of the ordering: the
  entire design lands and is reviewed before an account is involved.
- **Two external databases are a slice 5 prerequisite and cannot be faked.** One RDS
  PostgreSQL instance in the scratch account's VPC for topology B, one publicly
  reachable managed Postgres for topology C. Principal owns both lifecycles; both are
  in the teardown check.
- **The scratch account is at baseline** as of 2026-09-05, with two known residues
  (F1's ACM validation CNAME, F7's log groups at 90).
- **`dead-code:deploy` runs in CI** (`.github/workflows/ci.yml`). A new script or an
  export nothing consumes yet — slice 1 adds exactly that shape — has to be wired or
  it fails the gate.
- **The local e2e stack collides with CI** on the self-hosted runner. Tear it down
  before pushing, as in phases A–C.
- **Nothing in `apps/api` changes.** If a slice finds itself editing `create-app.ts`,
  the design has gone wrong (brief § Non-goals). The one file under `apps/api` this
  story _reads_ is `migrate.ts`, and only slice 3's script calls it.

## Risks specific to this story

| #   | Risk                                                                                                                                                                                                                                                                                                                                                                | Handling                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **A dynamic reference is copied, not linked.** CloudFormation resolves `{{resolve:secretsmanager:…}}` only during create or update of the resource that holds it — the same property already recorded for `ORIGIN_VERIFY_SECRET` (`platform-secret.ts:31-38`). Rotating the adopter's upstream secret does **not** reach the platform secret until the next deploy. | Documented in slice 5's guide section, with the out-of-band alternative: write `DB_URL` straight into the platform secret and the resolver picks it up within `SECRETS_CACHE_TTL_SECONDS`. |
| 2   | **Logical-ID drift on the green-field path.** The single most expensive way to fail this story: renaming resources means replacing a live database.                                                                                                                                                                                                                 | Gate 1 decision 4 plus `synth:check` in CI. Non-negotiable, and reviewed as such.                                                                                                          |
| 3   | **RLS is a precondition the stack cannot check.** `SET LOCAL ROLE` and `set_config(..., true)` (`rls-context.ts:96-104`) need a database that permits role creation at seed.                                                                                                                                                                                        | Measured in slice 5 against two real providers; documented as a precondition. Not detected at synth — a synth-time probe would need credentials CDK does not have.                         |
| 4   | **`sslmode` belongs to the adopter.** The composed URL attaches `sslmode=require` because `resolveDatabaseUrl` in `@grantjs/env` emits none; a supplied URL carries whatever was written.                                                                                                                                                                           | Never rewritten. Validate and say what is wrong; phase C already accepted that `sslmode=require` does not verify the server certificate.                                                   |
| 5   | **`DatabaseSecretName` is a misnomer after this story** — the output names the platform secret and exists on a path with no database. Renaming it would change the green-field template and break `put-secrets`, which matches on the prefix (`put-secrets.ts:83`).                                                                                                 | Keep the logical ID; fix the description. Recorded here so it reads as a decision rather than an oversight.                                                                                |
| 6   | **Topology C moves the functions out of the VPC.** Egress is then direct rather than through NAT, which changes nothing the webhook SSRF guard depends on but does change the network story the guide tells.                                                                                                                                                        | Called out for the gate 4 deep review, and stated in the guide next to the cost saving that motivates it.                                                                                  |

## Human gates

- [x] Gate 1: Story brief approved — 2026-09-05, Ale Heredia, with all three open
      questions answered (§ Gate 1 decisions).
- [x] Gate 2: Stack plan approved — 2026-09-06, Ale Heredia.
- [ ] Gate 3: Stack PRs merged into trunk (light, except slice 1 **security-full,
      reviewed by someone other than its author** — phase C F16).
- [ ] Gate 4: Story → `main` deep review complete. Blocking items known in advance:
      the scratch account and both external databases measured to zero in both
      regions; `main` merged into the trunk before the integration PR opens; an
      independent security pass over the assembled BYO path.

## Cleanup

- [ ] Scratch account and both external databases torn down; final `cdk destroy`
      recorded in the measurements file, both regions at baseline
- [ ] `git worktree remove ../grant-pr384` (stale from #384; no worktree needed for
      this story)
- [ ] Local **and remote** slice branches deleted — phases A and C both ticked this
      without doing it (program brief § Housekeeping)
- [ ] Stack plan status → `merged-to-main`
- [ ] Program brief updated: tier 1 item 1 closed
- [ ] Phase C stack plan: F13 disposition updated from "follow-on story" to this story

## Follow-ons

Carried out of this story deliberately, each because it is real work with its own
review surface.

| #   | Item                                                                                                                       | Why it is not here                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Bring-your-own Redis.** The guide is honest that it is "config only — no network wiring is generated".                   | Same shape as this story for a strictly optional dependency. Separate story, if ever (brief § Non-goals).                                       |
| 2   | **RDS Proxy on by default, and RDS IAM auth** (F14, program item 9).                                                       | An adopter's own database is exactly the case where the proxy is their decision, not ours.                                                      |
| 3   | **Detecting an unreachable BYO database at synth.** Topology C with a private URL deploys and then fails at the migration. | Needs credentials and a network probe at synth time, which CDK has neither of. The failure is at least loud and names the database.             |
| 4   | **`DB_URL` rotation without a stack update** (§ Risks row 1). The out-of-band write works today; nothing automates it.     | Wants a decision about whether the platform secret should reference rather than copy — which is a Secrets Manager shape question, not this one. |
