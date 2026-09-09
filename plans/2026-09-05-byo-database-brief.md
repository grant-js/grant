# Story brief — Bring-your-own PostgreSQL, end to end

## Metadata

- **Slug**: `byo-database`
- **Date**: 2026-09-05
- **Author**: Ale Heredia (human) / drafted with Claude
- **Status**: **shipped** — merged to `main` 2026-09-09 as
  [#394](https://github.com/grant-js/grant/pull/394) (`98943678`). Gate 1 cleared
  2026-09-05, Ale Heredia. Stack plan:
  [`2026-09-05-byo-database-stack.md`](./2026-09-05-byo-database-stack.md);
  measurements: [`2026-09-05-byo-database-measurements.md`](./2026-09-05-byo-database-measurements.md).
- **Program brief**: [`2026-09-05-aws-followups-brief.md`](./2026-09-05-aws-followups-brief.md)
  — tier 1, item 1
- **Origin**: phase C carried follow-up **F13**, § Follow-ons row 3
  ([stack plan](./2026-08-21-aws-edge-infra-stack.md))
- **Base**: `main` at `798111ac` (#382). All citations below re-verify against it.
- **Re-verified at gate 1**: `main` has moved to `5fd7e1d3` — #384 (request-log client
  IP) and #385 (phase C close-out). Every citation below still holds except the guide's,
  which moved when #384 deleted the client-IP row from § Known limitations: the warning
  block is now `docs/deployment/aws-serverless.md:308` and the resource table's
  **PostgreSQL** row `:305`. Full table in the stack plan's § Citation re-verification.

## Objective

Make the documented bring-your-own-PostgreSQL path actually deploy a working
platform: an adopter supplies a connection string to a database they already run, and
gets the API, the web app, the docs site, jobs and the edge — everything except an
Aurora cluster and the VPC that exists to reach it.

## The problem, stated precisely

`GrantPlatformProps.database` is documented twice as the bring-your-own toggle:

> `/** The database. Omit entirely to bring your own via `DB_URL`in`env`. */`
> — `deploy/aws/lib/config/props.ts:132`
>
> `Create the data tier. Omit to bring your own Postgres, in which case supply
`DB_URL`through`env` — the shape the Helm chart has always used.`
> — `deploy/aws/lib/config/props.ts:368-371`

But `deploy/aws/lib/grant-platform.ts:147` opens a single `if (props.database)` that
encloses **eleven** constructs, not one: `Network`, `Database`, the
`DatabaseClients` security group, the proxy-or-direct ingress rule, `PlatformSecret`,
`ApiImage`, `MigrateTask`/`MigrateTrigger`, `CacheTable`, `StorageBucket`,
`JobQueue`, `ApiFunction`, `JobsFunction` and `JobSchedules`. Omit `database` and the
deploy succeeds with a docs site and no serving function.

The construct's own doc comment already says so, which is why this is a follow-up
rather than a bug report:

> Bring-your-own-Postgres does not get one yet: the function reads `DB_URL` from the
> platform secret, which this construct only creates alongside its own cluster.
> — `grant-platform.ts`, on `public readonly api?`

**The application side is already done.** `resolveDatabaseConnectionString()` is
`(await resolver.resolve('DB_URL')) || config.db.url`
(`apps/api/src/lib/secrets/database-url.ts:41`), so a `DB_URL` placed in the platform
secret is picked up per use, with rotation bounded by `SECRETS_CACHE_TTL_SECONDS`
rather than by container lifetime (ADR 0004). Nothing in `apps/api` needs to change.
**This is entirely a CDK-layer story.**

## A second finding, and it changes the design

The documented instruction — "supply `DB_URL` through `env`" — is not only
non-functional, it is **the insecure shape**. `classifyConfig`
(`deploy/aws/lib/config/env-file.ts:136-176`) routes anything not in
`RESOLVER_SECRET_KEYS` or `CREDENTIAL_KEYS` to `env`, and `env` becomes Lambda
environment variables — plaintext in the CloudFormation template, in `cdk.out` on
disk, and readable by anyone holding `lambda:GetFunctionConfiguration`. That is the
exact reasoning the file uses to **refuse** `POSTGRES_PASSWORD` and thirteen other
keys at `env-file.ts:66-82`. A `DB_URL` carries the same password inside a URL.

The header comment at `env-file.ts:30-31` records the intent — "`DB_URL` is
resolver-backed too but is not here — the stack computes it from the database it
creates, and an operator bringing their own sets it as ordinary `env`" — and that
second clause is what this story overturns. An adopter's `DB_URL` must reach the
functions the same way the generated one does: through the platform secret.

So the story is **two** decoupled things, and the second is not optional:

1. The platform secret, cache table, uploads bucket, queue, functions and schedules
   must be constructible without an Aurora cluster.
2. `DB_URL` must be classified as resolver-backed, not as ordinary env — with a
   migration path for anyone who already put it in `deploy/aws/.env`.

## Acceptance criteria

- [x] **Omitting `database` yields a complete serving platform.** A `cdk deploy` with
      no `database` prop and a supplied connection string produces the API function,
      the web function, the docs site, the cache table, the uploads bucket, the job
      queue, the jobs function and all six EventBridge rules — everything the
      green-field path produces except `Database` and, where the adopter supplies a
      VPC, `Network`.
- [x] **The green-field path is byte-identical.** With `database` supplied, the
      synthesized template must not change. This is the governing constraint made
      testable: the committed `cdk.snapshot` is the oracle, and a diff there is a
      failure unless it is argued for explicitly.
- [x] **`DB_URL` is resolver-backed** — _in intent, not in letter; see the gate 1
      amendment below._ It moves into `RESOLVER_SECRET_KEYS`
      (`env-file.ts:33`), so a value in `deploy/aws/.env` lands in the platform secret
      rather than in a Lambda environment variable. The `credential-keys.test.ts`
      classification test must cover it.
- [x] **A `DB_URL` that would have become a plaintext env var fails loudly**, not
      silently, for anyone upgrading — the same treatment `STACK_GENERATED_KEYS` and
      `CREDENTIAL_KEYS` already get, with a sentence saying where to put it instead.
- [x] **The platform secret exists without a cluster.** `PlatformSecret` today takes
      `databaseCredentials: ISecret` plus host/port/dbname and composes `DB_URL`
      (`deploy/aws/lib/data/platform-secret.ts`). It must also accept a caller-supplied
      `DB_URL` — as a `SecretValue`, so `SecretValue.secretsManager('…')` renders a
      dynamic reference and the plaintext never enters the template.
      **`ORIGIN_VERIFY_SECRET` is generated here too**, so this construct is required
      on every path, not just the green-field one — the edge trust model depends on it.
- [x] **Network is decided independently of the database.** Bring-your-own Postgres in
      an adopter's existing VPC needs `network.vpc` without `database`; a database
      reachable over the public internet needs no VPC at all. Both must synthesize.
      State which is supported and refuse the other at synth with a real sentence.
- [x] **Migration is opt-in-able on the BYO path.** `migration` is documented as
      "Ignored when this stack does not own the database" (`props.ts:374`). Decide
      deliberately: either the Fargate one-shot runs against the supplied `DB_URL`
      (it needs VPC reachability and the security group), or it stays off and the
      guide says the adopter runs `node dist/migrate.js` themselves. Do not leave it
      ambiguous.
- [x] **A deployed proof, torn down.** Per phase C's verification model, a recorded
      deploy against a Postgres instance this stack did not create, the smoke test
      green, then `cdk destroy` with the account measured back to baseline in **both**
      regions. A measurements file entry, not a claim.
- [x] **The guide's warning is replaced by instructions.** The `::: warning
Bring-your-own PostgreSQL does not work end to end yet` block in
      `docs/deployment/aws-serverless.md:303` goes away; the resource table's
      **PostgreSQL** row moves from "**not yet**" to a supported path with its
      preconditions stated.
- [x] **With no configuration changed, behavior is identical to `main`** — on the AWS
      target, on Helm, and on docker-compose.

> **Gate 1 amended two of these, and the amendments are recorded rather than applied
> silently.** Answering open question 3 settled the tension between AC 3 and AC 4:
> `DB_URL` is **refused** from the env file rather than routed through
> `RESOLVER_SECRET_KEYS`, because `put-secrets` can only run _after_ the deploy that
> publishes the stack outputs — a `DB_URL` that arrives late is a first deploy that
> does not converge. AC 3 is therefore met in intent (`DB_URL` never becomes a Lambda
> environment variable, and `credential-keys.test.ts` still covers it) but not in
> letter. AC 6 gains a condition from the answer to question 2: **every** supported
> topology must have a migration path, not only the ones where the Fargate one-shot
> can run. Both live in the stack plan's § Gate 1 decisions.

**Ticked 2026-09-09, at close-out.** Where each was met, so the boxes are checkable
rather than asserted:

| AC  | Met by                                                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `lib/data/byo-database.test.ts` — the inventory census, plus both deployed topologies. Topology C runs **61 resources against green-field's 112**.                                                                                                                               |
| 2   | `synth:check` in CI, and verified past the oracle in slice 2: raw `cdk.out` diffed against a clean checkout, 112 resources both sides, identical logical-ID sets and ordering, no `DependsOn` change.                                                                            |
| 3   | **In intent only.** Gate 1 refused `DB_URL` from the env file rather than routing it — see the amendment above. It never becomes a Lambda environment variable, and `credential-keys.test.ts` covers it. The letter of this AC was deliberately superseded, not quietly dropped. |
| 4   | 18 spellings tested — lower-case, quoted, `export`-prefixed, BOM-prefixed, whitespace-padded — all refused with a message naming the fix.                                                                                                                                        |
| 5   | `lib/data/platform-secret.test.ts`; `ORIGIN_VERIFY_SECRET` generation unchanged on both paths.                                                                                                                                                                                   |
| 6   | Topologies B, C and D all synthesize; F refused at synth with a real sentence; `migration.enabled: true` in C refused too.                                                                                                                                                       |
| 7   | Fargate one-shot where a VPC exists, `pnpm --filter grant-aws-deploy migrate` where it does not — built and exercised against a real database, per gate 1's added condition.                                                                                                     |
| 8   | Measurements file, both topologies, both regions back to baseline, external databases deleted with them.                                                                                                                                                                         |
| 9   | Guide § Bring your own PostgreSQL; the warning block is gone and the resource table's **PostgreSQL** row is supported with preconditions.                                                                                                                                        |
| 10  | Byte-identical template on the AWS target; **Helm and docker-compose have no diff in the whole story** — verified at close-out, not assumed.                                                                                                                                     |

One AC was met late and only after a fight: gate 4's independent security pass found
that AC 4's guarantee held on the env-file boundary and **not** on the props boundary,
where `AUTH_MFA_SECRET_ENCRYPTION_KEY` and `GITHUB_CLIENT_SECRET` synthesized as
plaintext. Fixed in [#393](https://github.com/grant-js/grant/pull/393). An AC is only
as good as the boundary it was checked on.

## Non-goals

- **Bring-your-own Redis.** The guide is honest that it is "config only — no network
  wiring is generated". Fixing it means creating a VPC, a security group rule and
  reaching a cluster this stack did not create — the same shape as this story but for
  a strictly optional dependency. Separate story, if ever.
- **RDS Proxy or RDS IAM auth** (F14, program follow-up 9). Off by default for a
  measured reason; an adopter's own database is exactly the case where the proxy is
  their decision, not ours.
- **Any change to `apps/api`.** The resolver path already works. If this story finds
  itself editing `create-app.ts`, the design has gone wrong.
- **Making `database` the only optional prop.** `web`, `jobs` and `migration` already
  have their own toggles and keep the semantics they have.
- Removing, deprecating or altering the green-field Aurora path.

## Known constraints

- **`sslmode` is not a detail here.** The composed `DB_URL` attaches it because
  `resolveDatabaseUrl` in `@grantjs/env` builds a URL with no SSL parameter
  (`platform-secret.ts` header). An adopter's URL carries whatever they wrote, and
  phase C's security review already accepted that `sslmode=require` does not verify
  the server certificate. Do not silently rewrite the adopter's URL; validate and say
  what is wrong.
- **RLS is transaction-scoped** (`apps/api/src/lib/rls/rls-context.ts:96-104`) and the
  supplied database must support `SET LOCAL ROLE` and `set_config(..., true)`. A
  managed Postgres that restricts role creation will fail at seed, not at deploy.
  Document the precondition; do not try to detect it at synth.
- **The migration ordering trap is live on this path too.** Phase C's `executeAfter`
  names the whole `Database` construct because an Aurora cluster endpoint has no DNS
  record until the writer exists (`grant-platform.ts`, `MigrateTrigger` comment). With
  no cluster in the graph there is nothing to order against, so reachability becomes
  the adopter's precondition rather than CloudFormation's problem.

## Risk flags

- [x] **API keys / tokens** — `DB_URL` changes classification, and the platform secret
      also carries `ORIGIN_VERIFY_SECRET` and the resolver-backed keys
- [x] **Tenancy / RLS / org scoping** — the platform serves against a database this
      stack did not provision; RLS role setup is now a precondition, not a guarantee
- [x] Auth / sessions — only via the platform secret's `AUTH_MFA_SECRET_ENCRYPTION_KEY`
      and `GITHUB_CLIENT_SECRET`, which must keep working on the BYO path
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII

→ **`security-full`** on the slice that reclassifies `DB_URL` and reshapes
`PlatformSecret`, **independent of the slice author.** Phase C's F16 is exactly the
lesson: a self-reviewed security slice passed gate 3 and had to be redone at gate 4.

## Open questions for gate 1

1. **Does a BYO database have to live in a VPC?** Supporting a publicly reachable
   Postgres removes the VPC and the NAT gateway — roughly half the measured cost
   floor — and is the deployment most adopters bringing a managed database actually
   have. Supporting only in-VPC is simpler and safer. **Recommendation: support both,
   VPC-optional, and refuse the ambiguous middle at synth.**

   **Answered 2026-09-05: support both.** `vpc` and `securityGroups` become optional on
   `ApiFunction` and `JobsFunction`, as they already are on `WebFunction`. Architect is
   an active role for the slices that do it.

2. **Does the migration one-shot run on the BYO path?** **Recommendation: yes when a
   VPC is supplied, off otherwise**, with the guide giving the manual command. A
   first deploy that does not converge is the thing phase B's `node dist/migrate.js`
   entrypoint exists to prevent.

   **Answered 2026-09-05: yes when a VPC is supplied, off otherwise — with the added
   condition that there is _always_ a way to migrate.** "The guide says run it
   yourself" is not a way; a command that is built and exercised is. The VPC-less path
   therefore gets a real operator command running the same `dist/migrate.js` entrypoint
   against the same platform secret, and the deployed proof runs it.

3. **Is refusing an env-file `DB_URL` a breaking change worth taking?** It fails a
   configuration that today deploys — into a broken stack, and with the password in
   the template. **Recommendation: refuse, with the message naming the fix.**

   **Answered 2026-09-05: refuse.** The fix the message names is a Secrets Manager
   secret plus `-c dbUrlSecretArn=…`, which the stack renders as a dynamic reference
   into the platform secret — present at deploy time, never in the template.

## Suggested active roles

PM, Principal, **Senior Backend** (CDK constructs), **Senior Security** (blocking, and
**not** the slice author — F16), QA, Verifier. **Architect** only if question 1 is
answered as "both", since VPC-optional changes what the construct library promises.

## Human gate

- [x] Gate 1: Story brief approved — **2026-09-05, Ale Heredia.** All three open
      questions answered above; citations re-verified against `5fd7e1d3`, with the one
      that moved recorded in Metadata. Stack planning unblocked; gate 2 is next.
- [x] Gate 2: Stack plan approved — 2026-09-06, Ale Heredia.
- [x] Gate 3: Five slices merged to the trunk — 2026-09-08. #386, #387, #390, #391,
      #392, in order, slice 1 under a security-full review by someone other than its
      author.
- [x] Gate 4: Story → `main` — 2026-09-09, merged as #394. The independent security
      pass **blocked** (one Critical, one High, four Medium, two Low) and was
      remediated by #393 before the gate cleared. Full register in the stack plan
      § Gate 4's independent pass.
