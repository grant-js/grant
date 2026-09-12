# Stack plan — AWS follow-ups, tiers 1–3

## Metadata

- **Slug**: `aws-followups-closeout`
- **Program brief**: [`2026-09-05-aws-followups-brief.md`](./2026-09-05-aws-followups-brief.md)
  — **items 2–11**, i.e. everything the program brief indexes except item 1, which
  the byo-database story closed.
- **Story brief**: **none, deliberately.** See § Scope, and the objection to it.
- **Status**: `approved` — gates 1 and 2 taken together on this document, 2026-09-09.
- **Story trunk**: `feat/aws-followups-closeout`
- **Base**: `main` at `484e531b`, **not** the `98943678` this plan was drafted against.
  Between drafting and gate 2, `chore/close-out-byo-database` merged as **#398**
  (`484e531b`), a docs-only commit touching three `plans/` files and nothing else.
  Rooting on it rather than on `98943678` costs nothing and discharges gate 4's
  "`main` merged into the trunk" for the moment the trunk opened. The program brief
  was written against `798111ac`; § Citation re-verification covers the moves, and
  every citation it re-verifies at `98943678` is untouched by `484e531b`.
- **Measurements**: `plans/2026-09-09-aws-followups-closeout-measurements.md` —
  created by slice 4, extended by slice 16. Three deployed slices, two account cycles.
- **Governing ADRs**: [0002](../decisions/0002-long-running-cdm-sync-beyond-lambda.md)
  is the one this story is finally in a position to settle (part E);
  [0004](../decisions/0004-secret-resolution-through-a-port.md) is the whole mechanism
  part C leans on; [0005](../decisions/0005-aws-target-as-a-construct-library.md)
  governs every prop added here; [0003](../decisions/0003-lambda-web-adapter-over-a-handler-entrypoint.md)
  is the standing decision item 11 asks to revisit.
- **worktree_path**: `../grant-aws-followups`, created off `484e531b`. The cleanup this
  row demanded is **done, 2026-09-09, before slice 1**: `chore/close-out-byo-database`
  merged as #398 and its worktree removed (`git diff origin/main <branch>` empty before
  removal); the stale `chore/close-out-aws-edge-infra` checkout — merged as #385 back on
  2026-09-06 and eight commits behind — refreshed to `main`, its superseded plan edits
  stashed rather than discarded (`stash@{0}`, "stale close-out-aws-edge-infra plan
  edits"), and both local branches deleted. Their **remote** refs are still standing and
  stay on the § Cleanup list, which is where remote-ref deletion belongs.

## Stack status

Live record, updated as slices land. The `PR` column in § Ordered slices is the
authoritative per-slice reference; this is the same information as a progress view.
Last updated **2026-09-11**.

| Slices              | State                                | PRs                                                                            |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| 1–8 (parts A, B, C) | **merged to trunk**                  | [#400], [#401], [#403], [#404], [#405], [#407], [#408], and [#421] for slice 4 |
| 9 (part D)          | **merged to trunk** 2026-09-11       | [#427]                                                                         |
| 10a (part D)        | **merged to trunk** 2026-09-11       | [#428]                                                                         |
| 10b (part D)        | **merged to trunk** 2026-09-11       | [#429]                                                                         |
| 11 (part D)         | **merged to trunk** 2026-09-11       | [#430]                                                                         |
| 12a (part E)        | **open, draft**                      | [#433]                                                                         |
| 12–15 (part E)      | not started; input unblocked by #422 | —                                                                              |
| 16 (part F)         | not started                          | —                                                                              |
| final → `main`      | not opened                           | —                                                                              |

**Out of band.** [#422] is not a slice. Slice 4's deployed import failed on a defect in
`cdm-scale-fixtures.ts` rather than on anything the deployment did, and the fix had to
land before part E could consume slice 4's measurement — so it went to the trunk as its
own PR rather than being smuggled into a slice that was not about it.

**Trunk against `main`:** 15 commits ahead, 5 behind as of 2026-09-11 (the dependency
bumps [#409], [#411], [#415], [#420], [#426] merged to `main` after the trunk opened).
Nothing has conflicted, but **slice 10 touches `@grantjs/schema` codegen**, so the trunk
should take `main` before slice 10 starts rather than after it discovers a drift.

[#400]: https://github.com/grant-js/grant/pull/400
[#401]: https://github.com/grant-js/grant/pull/401
[#403]: https://github.com/grant-js/grant/pull/403
[#404]: https://github.com/grant-js/grant/pull/404
[#405]: https://github.com/grant-js/grant/pull/405
[#407]: https://github.com/grant-js/grant/pull/407
[#408]: https://github.com/grant-js/grant/pull/408
[#409]: https://github.com/grant-js/grant/pull/409
[#411]: https://github.com/grant-js/grant/pull/411
[#415]: https://github.com/grant-js/grant/pull/415
[#420]: https://github.com/grant-js/grant/pull/420
[#421]: https://github.com/grant-js/grant/pull/421
[#422]: https://github.com/grant-js/grant/pull/422
[#426]: https://github.com/grant-js/grant/pull/426
[#427]: https://github.com/grant-js/grant/pull/427
[#428]: https://github.com/grant-js/grant/pull/428
[#429]: https://github.com/grant-js/grant/pull/429
[#430]: https://github.com/grant-js/grant/pull/430
[#433]: https://github.com/grant-js/grant/pull/433

## Scope, and the objection to it

Gate 1 asked whether this plan should cover the next story (items 2–4) or everything
remaining. The answer was **everything remaining, items 2–11**. The objection is
recorded once, here, and then the plan delivers the full scope:

**This is more than one story's review surface, and three of the items are not AWS
work at all.** Item 5 changes how every deployment target obtains credentials. Item 7
changes `IFileStorageService` in `@grantjs/core` — the only port change in the whole
program — plus both storage adapters, an API handler, the GraphQL schema and two web
dialogs. Item 8 has no decidable outcome until a measurement exists. Tier 3 items 9–11
are trade-offs whose answers are not known today. A single trunk carrying all of that
will hold a diff no one reviewer can hold.

What the plan does about it, rather than quietly narrowing the scope:

1. **Six parts, each with its own review bar and its own reviewer.** A part is a gate-3
   checkpoint. Nothing merges to the trunk in bulk.
2. **§ Named split points.** Parts C, D and E each have a stated fracture line. If a
   gate says "this is its own story", the split is a `gh stack` re-root, not a replan.
3. **Decision slices are labelled as such.** Slices 12–15 may produce an ADR amendment
   and no code. That is a legitimate outcome, and pre-committing to code for an
   undecided trade-off is how tier 3 items get built for no reason.

## Citation re-verification

The program brief's citations were taken at `798111ac`. `main` has since moved twice
(`583c9c39` #384, `5fd7e1d3` #385, `98943678` #394 — the byo-database story). Every
citation this plan depends on, re-verified at `98943678`:

| Program brief citation                                     | Status at `98943678`                                                                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy/aws/lib/config/env-file.ts:66` — `CREDENTIAL_KEYS` | **Moved to `:92-116`, and grew from 15 keys to 17.** `DB_GRANT_ROLE_URL` and `E2E_DB_URL` were added by byo-database slice 1's security review (F2).                   |
| "`classifyConfig` refuses ~15 credential-shaped keys"      | Now **17**. `classifyConfig` is at `:189`; `parseEnvFile` at `:131`.                                                                                                   |
| `apps/api/src/lib/rls/rls-context.ts:96-104`               | holds                                                                                                                                                                  |
| Origin-verify warn log (item 2)                            | holds — `apps/api/src/middleware/origin-verify.middleware.ts:96-100`, `log.warn` under `createLogger('OriginVerify')` at `:60`                                         |
| `ses:SendEmail` at `Resource: "*"` (item 3)                | holds, **in two places**: `deploy/aws/lib/compute/api-function.ts:187-192` and `deploy/aws/lib/compute/jobs-function.ts:150-156`. The brief names only one.            |
| Origin verify precedes the rate limiter (item 4)           | holds — `apps/api/src/create-app.ts:174` and `:186`                                                                                                                    |
| `API_JSON_BODY_LIMIT_BYTES` 10 MiB (item 6)                | holds — `packages/@grantjs/env/src/schema.ts:31`, read at `apps/api/src/config/env.config.ts:37`, applied at `create-app.ts:178` **and** `event-dispatch.routes.ts:78` |
| `IFileStorageService` in `@grantjs/core` (item 7)          | holds — `packages/@grantjs/core/src/ports/storage.port.ts:14-50`                                                                                                       |
| 208 s / 283 entities (item 8)                              | holds — phase C measurements, § The enqueue-only path                                                                                                                  |
| Visibility timeout 6× consumer timeout (item 10)           | holds — `deploy/aws/lib/data/job-queue.ts:78`; `MAX_RECEIVE_COUNT = 3` at `:26`                                                                                        |
| RDS Proxy off by default, ~$58/month (item 9)              | holds — `deploy/aws/lib/grant-platform.ts:238-250`, prop at `props.ts:114`                                                                                             |
| OpenNext deferred (item 11)                                | holds — `deploy/aws/lib/config/props.ts:205-208`, `deploy/aws/lib/compute/web-function.ts:4-6`                                                                         |

## Four things the program brief gets wrong, found while re-verifying

Recorded here rather than fixed silently, because two of them change what a slice
costs and one changes whether an item is justified at all.

1. **Item 5 is much smaller than "touches the email, cache, storage and jobs
   adapters".** The adapter packages read **no** environment variables — `grep -rn
'process\.env' packages/@grantjs/{email,cache,storage,jobs}/src` returns nothing. All
   17 credential keys are read in exactly one file, from the `@grantjs/env` parse
   result, and passed to adapters as ordinary constructor config:
   `apps/api/src/config/env.config.ts:282` (DynamoDB), `:304` (Redis), `:402`
   (`SECURITY_API_KEY`), `:505` (Mailgun), `:528` (SMTP), `:679` (S3), `:740` (jobs).
   The comment at `env-file.ts:80-86` saying "the adapters read them from
   `process.env`" is the imprecision that made this look like a four-package story.
   **It is one file plus the composition root.**

2. **Item 7's stated justification is contradicted by an existing measurement.** The
   brief ranks presigned-PUT as "lifts the ~6 MB Lambda payload cap". Phase B's
   measurements, § Finding 1, says the opposite in as many words: a gzipped client
   already pushes **19.76 MiB of raw CDM** through a 6 MiB request, so
   "`IFileStorageService.getUploadUrl()` … has no measured justification and **should
   stay deferred**." That finding is about **CDM sync payloads**. It says nothing about
   **user file uploads**, which go base64 through GraphQL
   (`file-storage.service.port.ts:16`, `me.handler.ts:183,575`,
   `users.handler.ts:884`) and pay a +33% base64 expansion against the same cap. Part D
   proceeds on the upload justification only, and slice 9's PR body must say so —
   citing the CDM cap would be citing a number that has been measured to be wrong.

3. **Item 8's fixture already exists.** The brief says it "needs the fixture before it
   needs the escape hatch". `apps/api/tests/helpers/cdm-scale-fixtures.ts` generates
   `enterprise` (28,880 entities) and `entropy-bound` (28,880, least-compressible)
   deterministically, and `tests/unit/lib/cdm/cdm-scale-fixtures.test.ts` asserts every
   document validates against `startProjectSyncRequestSchema`. What is missing is not a
   fixture — it is an **execution** of one at that scale against a real database.

4. **The SES comment states a constraint that does not exist. — CHECKED 2026-09-09,
   and it is wrong.** `api-function.ts:184-186` said `ses:SendEmail`/`ses:SendRawEmail`
   "do not support resource-level permissions in the classic API". The SES developer
   guide, § Identity and access management, says the opposite in as many words: "To
   restrict the identities that a user is allowed to send from, set `Resource` to the
   ARNs of the identities that you are permitting the user to use." **Both** mechanisms
   are available and slice 2 (#401) uses both: `resources: [identityArn]` bounds which
   identity, and `ses:FromAddress` bounds which address within it — a domain identity
   otherwise covers every mailbox at the domain. `ses:FromDisplayName` being a separate
   condition key is what establishes that SES parses `Source`, so `"Grant" <a@b.com>` is
   matched as `a@b.com`. The comment is rewritten to say what was checked, and when.

## Gate 1 decisions

No story brief exists for items 2–11, so the decisions a brief would have carried are
taken here. Each one shapes a slice.

1. **The alarm gets an optional action prop and no default action.**
   `observability?: { alarmTopic?: ITopic }` on `GrantPlatformProps`, interface-typed
   per ADR 0005, with the reference app exposing `-c alarmEmail` that composes an SNS
   topic in `bin/`, not in `lib/`. The metric filter and alarm are created
   unconditionally; only the action is conditional. This keeps `lib/` composable
   without a fork and keeps the alarm real rather than aspirational — an alarm in
   `INSUFFICIENT_DATA` with no action is still a queryable control, and phase C's
   security review asked for a control, not a mailbox.

2. **The green-field template changes in this story, on purpose.** byo-database's
   governing oracle was byte-identity; it does not apply here and pretending otherwise
   would fail six slices for doing their job. The replacement rule is per-slice and
   sharper — see § Verification model. Every slice declares whether it may change
   `cdk.snapshot/`, and a diff outside its declaration fails it.

3. **SES is granted only where it is used.** Today both functions hold
   `ses:SendEmail` on `*` regardless of `EMAIL_PROVIDER`, which defaults to `console`
   (`schema.ts:256-259`). The grant becomes conditional on `EMAIL_PROVIDER === 'ses'`
   in the resolved environment, and in that configuration `EMAIL_FROM` **must** be
   present or synth refuses. This dissolves the blocker the brief records ("`EMAIL_FROM`
   not known at synth in every configuration"): in every configuration where the grant
   is issued, it is known — `apps/api` already refuses to boot otherwise
   (`env.config.ts:970`). The reference app already carries it (`bin/grant.ts:276-278`).

4. **The scale measurement rides the edge-trust deploy.** Slice 4 is one account cycle
   that proves parts A and produces ADR 0002's missing number. Batching them is not
   convenience: phase C established that every deployed slice owes a full teardown
   verified in **both** regions (F15), so an account cycle is the expensive unit, and
   the measurement is the input two later slices are blocked on.

5. **Three points, not one.** The scale measurement runs `department` (3,650),
   `enterprise` (28,880) and `entropy-bound` (28,880). One point cannot separate
   per-entity cost from fixed cost, which is precisely the error phase C's measurements
   warned against when recording the 208 s / 283-entity run.

6. **Slices 12–15 may ship no code.** Their deliverable is a decision with a number
   behind it. `feat/aws-followups-opennext` closing as "measured, standalone stays,
   ADR 0003 amended" is a successful slice.

## Verification model

Per-slice, and the template column is the load-bearing one.

| Slice     | Evidence                                                                       | May change `cdk.snapshot/`?                       |
| --------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| 1         | CI. Unit test, mutation-tested.                                                | **No** — apps/api only                            |
| 2, 3      | CI. `synth:check` diff reviewed line by line, every line attributable.         | **Yes**, and the diff is the review               |
| 4         | **Recorded deploy**, both regions to baseline, measurements file first.        | No                                                |
| 5         | CI + e2e. `boot-parity.e2e.test.ts` changes from pinning 500 to asserting 413. | **No** — apps/api, core, errors                   |
| 6         | CI. One key in `AWS_TARGET_ENV_DEFAULTS`.                                      | **Yes**, one environment entry in three functions |
| 7         | CI. Every target's boot path exercised.                                        | **No**                                            |
| 8         | CI. `env-boundary-parity.test.ts` and `credential-keys.test.ts` both move.     | **Yes** — keys leave the refusal list             |
| 9, 10, 11 | CI. Conformance suite extended; e2e upload flow.                               | **No**                                            |
| 12–15     | A number, or an ADR amendment, or both.                                        | **Only if** the decision says build               |
| 16        | **Recorded deploy** #2, both regions to baseline.                              | No                                                |

Both deployed slices follow phase C's model without amendment, including the part F15
was raised for: `cdk destroy` run to completion and the account measured back to
baseline in **`eu-central-1` and `us-east-1`**, because checking the platform region
alone reported clean while `GrantCertificate` was still standing.

## Active roles

- [x] Project Manager — the scope decision above, the part-level gates, and the call
      on each split point
- [x] Principal Engineer — slice order, integration, worktree hygiene (there are two
      stale ones to clear first), and both scratch-account cycles
- [x] **Senior Security — parts A and C, blocking, and not the slice author.** Phase C
      F16 and byo-database slice 1 are two consecutive precedents for why this is
      written out: a self-reviewed security slice cleared gate 3 both times and had to
      be redone.
- [x] **Architect — slice 9 only.** `IFileStorageService` is a `@grantjs/core` port and
      the only one this program touches (AGENTS.md § Development workflow, step 4).
      Not required elsewhere: every other prop added here is additive and interface-typed.
- [x] Senior Backend — slices 1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 14
- [x] Senior Frontend — slice 11
- [x] Senior QA — slices 4 and 16, and the test shape for slices 1 and 5
- [x] Verifier — after every slice

## Ordered slices (PRs)

Ordered by what it costs to be wrong, then by what unblocks what. Part A first
because an accepted risk whose compensating control does not exist is an unaccepted
risk; slice 4 early because two later slices are blocked on its number.

| #     | Branch                                     | Base  | Part | Concern                                                      | Owner             | Bar               | PR   |
| ----- | ------------------------------------------ | ----- | ---- | ------------------------------------------------------------ | ----------------- | ----------------- | ---- |
| 1     | `feat/aws-followups-middleware-order`      | trunk | A    | Origin verification precedes the rate limiter, asserted      | Backend + QA      | light             | #400 |
| 2     | `feat/aws-followups-ses-identity`          | 1     | A    | `ses:SendEmail` scoped, and granted only where used          | Backend + **Sec** | **security-full** | #401 |
| 3     | `feat/aws-followups-origin-alarm`          | 2     | A    | The compensating control, wired                              | Backend + **Sec** | **security-full** | #403 |
| 4     | `feat/aws-followups-edge-proof`            | 3     | A/E  | Deployed proof of 1–3 **and** ADR 0002's missing number      | **QA**            | light             | #421 |
| 5     | `feat/aws-followups-payload-errors`        | 4     | B    | `413` and `400` instead of `500 INTERNAL_ERROR`              | Backend           | light             | #404 |
| 6     | `feat/aws-followups-body-limit`            | 5     | B    | The Lambda target stops advertising a limit it cannot honour | Backend           | light             | #405 |
| 7     | `feat/aws-followups-credential-resolution` | 6     | C    | Credentials resolve through `ISecretResolver`, every target  | Backend + **Sec** | **security-full** | #407 |
| 8     | `feat/aws-followups-credential-keys`       | 7     | C    | The AWS refusal becomes a route                              | Backend + **Sec** | **security-full** | #408 |
| 9     | `feat/aws-followups-upload-port`           | 8     | D    | `getUploadUrl()` on the port, and both adapters              | Backend + Arch    | **deep**          | #427 |
| 10a   | `feat/aws-followups-upload-api`            | 9     | D    | Schema, resolver, REST, handler, service — my user picture   | Backend           | light             | #428 |
| 10b   | `feat/aws-followups-upload-api-targets`    | 10a   | D    | The same pair for membership and admin pictures              | Backend           | light             | #429 |
| 11    | `feat/aws-followups-web-upload`            | 10b   | D    | The web flow, and the bucket rule it needs                   | Frontend          | light             | #430 |
| 12a   | `feat/aws-followups-sync-runtime`          | 11    | E    | ADR 0002 settled: the number, and the bound on fixing it     | Backend           | light             | #433 |
| 12b   | `feat/aws-followups-sync-runtime`          | 12a   | E    | The Fargate hatch, opt-in; zero template diff by default     | Backend           | light             | #433 |
| 13    | `feat/aws-followups-queue-redelivery`      | 12    | E    | Visibility timeout from a measured duration                  | Backend           | light             |      |
| 14    | `feat/aws-followups-rds-iam`               | 13    | E    | RDS IAM auth as an option; the proxy default re-decided      | Backend           | light             |      |
| 15    | `feat/aws-followups-opennext`              | 14    | E    | Measured, then decided                                       | Backend           | light             |      |
| 16    | `feat/aws-followups-proof`                 | 15    | F    | Deployed proof of C, D and anything E built; teardown        | **QA**            | light             |      |
| final | `feat/aws-followups-closeout`              | main  | —    | integration                                                  | Principal         | **deep**          |      |

### Part A — the edge trust model (program items 2, 3, 4)

The three loose ends gate 4's security pass left on phase C. One reviewer, one
threat model, and the part that justifies being first: item 2 is the named
compensating control for a risk that was **accepted on the record**.

#### Slice 1 — a test that holds the middleware order

`originVerifyMiddleware` at `create-app.ts:174` runs before `rateLimitMiddleware` at
`:186`. Nothing asserts it, and the ordering is the edge trust model: verify first
and a direct probe is refused before it can consume a rate-limit budget or a cache
round-trip; verify second and an unauthenticated caller can exhaust another tenant's
counters through the origin.

- A new test under `apps/api/tests/unit/middleware/` that builds the app and asserts
  the relative position of the two layers — not their absolute indices, which every
  unrelated middleware addition would break.
- **The obstacle, named because it decides the diff.** `verifyOrigin` is a _named_
  function expression (`origin-verify.middleware.ts:62`), so it is findable by
  `layer.handle.name`. `rateLimitMiddleware` returns an **anonymous** arrow
  (`rate-limit.middleware.ts:68`), whose name is `''`. Two options: name the returned
  arrow `rateLimit` — a one-line, behaviour-preserving change following the precedent
  `verifyOrigin` already sets — or compare by function identity through a module mock.
  **Take the first.** The second couples the test to `vi.mock` hoisting for no gain,
  and a name on an Express middleware is worth having in a stack trace anyway.
- **Mutation-tested, or it is not evidence.** Swap the two `app.use` calls and the
  test must fail. Stated because a test asserting order is exactly the kind that
  passes against any order if it reads the array wrong.
- No `deploy/aws` change. This slice does not touch the template.

#### Slice 2 — `ses:SendEmail` scoped, and granted only where it is used

Today both functions hold `ses:SendEmail` and `ses:SendRawEmail` on `Resource: "*"`
unconditionally (`api-function.ts:187-192`, `jobs-function.ts:150-156`), while
`EMAIL_PROVIDER` defaults to `console` (`schema.ts:256-259`). So the common
configuration is a function that can send mail as any verified identity in the
account and has no reason to send mail at all.

- **First: check the constraint the comment asserts.** `api-function.ts:184-186` says
  these actions do not support resource-level permissions. Verify against the SES
  service-authorization reference and record what was found, with the date, in the
  rewritten comment. The finding selects the mechanism: identity-ARN `resources`, or a
  `ses:FromAddress` condition, or both.
- `ApiFunctionProps` / `JobsFunctionProps` gain `sesIdentityArn?: string` — an ARN, not
  an address, so an adopter can point at a domain identity they already own without
  this library constructing ARNs from a mail address it cannot validate. ADR 0005:
  interface-typed props, `bin/` composes.
- `lib/grant-platform.ts` passes it only when the resolved environment has
  `EMAIL_PROVIDER === 'ses'`; otherwise **neither function gets the statement at all**.
- `lib/config/validate.ts` — `EMAIL_PROVIDER=ses` with no `EMAIL_FROM` is refused at
  synth, with a message naming `-c emailFrom`. This is the same refusal `apps/api`
  already makes at boot (`env.config.ts:970`), moved to where it costs a synth rather
  than a deploy.
- `bin/grant.ts` — derive the identity ARN from `-c emailFrom`'s domain, or accept
  `-c sesIdentityArn` explicitly, validated lexically the way `certificateArn` is.
- **Template diff, declared:** the two `AWS::IAM::Policy` documents change; the
  green-field snapshot loses the SES statement entirely (`.env.example:56` leaves
  `EMAIL_PROVIDER` empty ⇒ `console`). Every other line must be unchanged.
- Tests: the grant absent under `console`, present and scoped under `ses`, the refusal
  when `EMAIL_FROM` is missing, and — mutation-tested — a test that fails if
  `resources` reverts to `['*']`.
- **Shipped as #401, with two deviations from the shape above, both recorded rather than
  quiet.** (a) The function props gained `ses?: SesSendGrant` — an
  `{ identityArn, fromAddress }` pair — instead of a bare `sesIdentityArn?: string`,
  because using both IAM mechanisms needs both values and two loose optionals make
  "ARN set, address unset" a representable state that means nothing. The
  `GrantPlatformProps` surface is still exactly `email.sesIdentityArn`; the address comes
  from the resolved `EMAIL_FROM`, so the policy and the environment cannot diverge.
  (b) A third refusal was considered and **not** added: an identity ARN under
  `EMAIL_PROVIDER=console` stays inert rather than failing synth. An unused prop is not a
  broken deployment, and a config file carrying the ARN across a provider switch is
  reasonable to have.

#### Slice 3 — the compensating control, wired

Phase C's slice 4 security review sustained "the Function URL is publicly reachable"
**with an alert on the origin-verify warn log as the named compensating control**. It
was never built. This is the first observability construct in the target: `grep -rn
'Alarm\|MetricFilter\|aws-sns' deploy/aws/lib` currently returns nothing.

- `lib/observability/origin-verify-alarm.ts` (new construct) — a `MetricFilter` on the
  API function's log group against the warn line at
  `origin-verify.middleware.ts:96-100`, plus an `Alarm` on the resulting metric. The
  log group is stack-owned (`api-function.ts:165`), so no import or lookup is needed.
- **Match on structure, not prose.** The logger is Pino-structured; the filter pattern
  keys on the module name `OriginVerify` (set at `:60`) and the level, not on the
  English of `msg`. A filter that breaks when someone improves a log message is a
  control that silently stops working — the exact failure mode this slice exists to fix.
- `observability?: { alarmTopic?: ITopic }` on `GrantPlatformProps` (gate 1 decision 1).
  Alarm always created; `addAlarmAction` only when a topic is supplied.
- `bin/grant.ts` — `-c alarmEmail` composes an SNS topic with an email subscription in
  the reference app. The topic is created in `bin/`, never in `lib/`.
- Threshold and period are props with defaults, and the defaults are argued in the
  construct's doc comment rather than chosen silently. A single refused probe is not an
  incident; a sustained rate is. Slice 4 measures the false-positive floor — scanners
  reach any public Function URL — and the PR body records that the first threshold is a
  starting point the deploy will correct.
- **Template diff, declared:** one `AWS::Logs::MetricFilter`, one
  `AWS::CloudWatch::Alarm`, and nothing else in the green-field snapshot. The BYO
  snapshots gain the same two.
- Tests: filter and alarm exist on every serving topology including both BYO shapes;
  no alarm action without a topic; an action with one.
- **Shipped as #403.** Two things worth carrying forward. (a) The filter pattern is a
  **text** pattern, not the JSON one (`{ $.module = "OriginVerify" }`) this slice's
  wording implies: a JSON pattern needs the log event to parse as JSON end to end, and
  whether the Lambda runtime forwards this container's stdout verbatim or prefixes it is
  not knowable at synth. Substring terms match either way, and slice 4 is what confirms
  the filter increments at all. (b) `ApiFunction.logGroup` is now a public field rather
  than an inline `new LogGroup(...)`. Same construct path, so the logical ID is unchanged
  and nothing is replaced — verified by the absence of any `AWS::Logs::LogGroup` line in
  the snapshot diff.
- **One template line beyond the declaration, and it is unavoidable**: `CDKMetadata`'s
  `Analytics` blob changes whenever the construct set does. Same for #401.

#### Slice 4 — the deployed proof, and ADR 0002's missing number

One account cycle, two deliverables (gate 1 decision 4). `plans/2026-09-09-aws-followups-closeout-measurements.md`
is created **before** the first deploy, in phase C's shape.

Part A's proof:

- A direct request to the Function URL without the origin header → `403`, the warn
  line in CloudWatch, the metric filter incrementing, the alarm transitioning, and —
  if `-c alarmEmail` was passed — the notification arriving. **The alarm firing is the
  deliverable**; a metric that increments while the alarm stays in `INSUFFICIENT_DATA`
  is the same paper control in a new place.
- Baseline noise over the deploy window: how many refusals arrive unprompted. This is
  the number that sets the threshold, and it cannot be guessed from a diff.
- A real SES send under the scoped policy — password reset or invitation, whichever is
  cheapest to trigger — proving slice 2 scoped the grant without breaking it. Then the
  negative: an attempted send from an address outside the identity is denied.

ADR 0002's number:

- Run `project-sync` imports at **three** scales from the existing fixtures
  (`tests/helpers/cdm-scale-fixtures.ts`): `department` (3,650), `enterprise`
  (28,880), `entropy-bound` (28,880). Slice 6 of phase C measured one point at 283
  entities / 208.25 s; three points separate per-entity cost from fixed cost, which
  one cannot.
- Record for each: wall clock, the jobs-Lambda `Duration` metric, whether the
  15-minute ceiling was reached, `NumberOfMessagesReceived`/`Deleted`, DLQ depth, and
  what the `project_sync_jobs` row says. Phase C could not read that row — the cluster
  had the Data API disabled in isolated subnets — so **run this measurement on a
  topology where the row is readable**, which the byo-database story now makes
  possible (a BYO database reachable from outside the VPC).
- **Ingress matters and must be recorded.** A 28,880-entity document is 12.16 MiB raw
  / 2.22 MiB gzipped; uncompressed it exceeds the invocation cap. Send it gzipped, and
  record that the request succeeded — that is also the live confirmation of phase B's
  finding 1, which until now is arithmetic on fixture bytes rather than an observation.
- **The measurement can go three ways, and all three are results**: comfortably under
  15 minutes (slice 12 closes ADR 0002's escape hatch as unneeded and amends the ADR),
  near it (slice 12 builds the hatch), or the import fails for a reason unrelated to
  duration (which is the finding, and it reprioritises everything after it).
- **Ran 2026-09-10 as #421. It went the third way.** The import failed for a reason
  unrelated to duration: `cdm-scale-fixtures.ts` generates permission conditions
  `permissionConditionSchema` rejects, so every import died on its first permission.
  **Reproducible offline in one line** — no deploy was needed to find it, which makes this
  the expensive way to learn something CI could have said for free. § Four things, item 3
  of this plan recorded "the fixture already exists" on the strength of a test asserting
  the documents validate against `startProjectSyncRequestSchema`; they do, and that is not
  the assertion `PermissionService.createPermission` makes. Fixed as **#422**, which also
  adds the assertion whose absence allowed it.
- **Part A, by contrast, is fully proven.** Every claim slices 2 and 3 could not make from
  a template now has an observation: 403 direct versus 200 through CloudFront, the filter
  incrementing 0→3, the alarm reaching `ALARM` from `OK`, SES sending 2 and delivering 2
  under the scoped policy **with a display-name `Source`** — the case named as most likely
  to break delivery — and IAM simulation denying both a same-domain and an other-identity
  send. Baseline noise is **zero**, structurally: the metric counts requests to the
  Function URL, whose hostname is in no CT log, so scanners arrive through CloudFront
  carrying the secret. The threshold stays at 20.
- **Lambda forwards the container's stdout verbatim**, so slice 3's text filter pattern
  was a safe choice and an unnecessary one — a JSON pattern would have matched. Recorded
  so a future slice narrows it deliberately rather than rediscovering it.
- **Four findings the deploy produced**, none visible from a template, carried as
  follow-ons 6–9.
- Teardown: `cdk destroy`, both regions to baseline, F1's ACM CNAME and F7's log-group
  growth expected and counted.

### Part B — the honest ceiling (program item 6)

Two changes, both small, and the order matters: make the error real before lowering
the limit that produces it, or the first adopter to hit the new limit gets the same
`500 INTERNAL_ERROR` and a worse experience than before.

> **Rooted on the trunk, not on slice 4.** Part A merged (#400, #401, #403) but **slice
> 4 has not run** — it is an account cycle and needs credentials this work did not have.
> Nothing in part B consumes slice 4's output: the ordering table put slice 5 on top of
> it for stack shape, not for a dependency. Part E is the part that genuinely blocks on
> slice 4's number, and it is still downstream of it. Slices 2 and 3 remain **unproven**
> until that deploy runs, and merging them did not change that.

#### Slice 5 — `413` and `400`, instead of `500 INTERNAL_ERROR`

Phase B measurements § Finding 4 verified this against a running container rather
than inferring it from code: an oversized body returns `500 INTERNAL_ERROR`, and so
does malformed JSON. `body-parser` raises `PayloadTooLargeError` and `SyntaxError`;
`error.middleware.ts:20-23` matches only `GrantException` and `HttpException`, so both
fall to the generic `res.status(500)` at `:42`.

- `@grantjs/core` — `PayloadTooLargeError extends GrantException`. Adding a subclass to
  an existing hierarchy is not a port change and needs no Architect sign-off; it is
  called out because it is a cross-package edit in a slice that otherwise looks local.
- `@grantjs/errors` — `mapDomainToHttp` gains the `413` arm alongside the existing
  chain (`mapper.ts:65-146`). `SyntaxError` from `body-parser` maps to the existing
  `BadRequestError`, so `400` needs no new type.
- `apps/api/src/middleware/error.middleware.ts` — translate the two `body-parser`
  errors into domain errors **before** the `GrantException` check. Discriminate on
  `err.type` (`'entity.too.large'`, `'entity.parse.failed'`), not on the class name:
  `body-parser` sets `type` deliberately for this, and matching class names couples the
  API to a transitive dependency's internals.
- `apps/api/tests/e2e/boot-parity.e2e.test.ts:196-218` — these currently **pin** the
  500s, with a comment saying "pinned, not endorsed". They become assertions of `413`
  and `400`. Phase B put the pins there so this fix would be a deliberate, visible
  change rather than a silent one; honour that by making the diff read as the decision
  it is.
- i18n: both codes need message keys, and a `413` whose body says
  `errors.common.internalError` has fixed nothing.
- **Every target gets this**, not just Lambda. The 500 is wrong on Docker and
  Kubernetes too; it is merely more consequential where the runtime has its own cap.
- **Shipped as #404, and it found three missing translation keys on the way.** i18next
  returns the key itself when it cannot resolve one, so a missing entry does not fail —
  it ships as user-facing text. `errors.validation.badRequest` (every `BadRequestError`)
  and `errors.auth.notAuthenticated` (**every 401**) were defined in neither locale, so
  the API had been answering real requests with a dot-separated identifier in the `error`
  field. Both are now defined, and a new test resolves every _static_ key the mapper can
  produce in every locale — the assertion whose absence allowed this, since the existing
  `error-mapper.translationKey.test.ts` only checks which key is chosen.
- **Evidence, per the verification model: CI green **and** e2e.** `pnpm test:e2e` run
  against the real Docker stack — 210 passed, 2 skipped (unrelated `skipIf` cases),
  stack torn down. `boot-parity.e2e.test.ts` asserts the `413` and the `400` against a
  running container, which is where phase B observed the `500`s in the first place.
- **One misstep, caught by CI and worth recording.** The leak fix was first written as
  `req.i18n.exists(key)`. That is the obvious implementation and it is wrong _here_:
  `translateError` runs inside the error handler, so a `req.i18n` carrying only `t` —
  a partial mock, a different i18next major, any middleware attaching a minimal object —
  makes the handler throw while handling, and Express answers `500` with no body for
  **every** error. It traded a cosmetic leak for a total one, passed the unit suite, and
  failed four integration tests. The shipped version compares the translated result to
  the key instead: i18next's documented behaviour for a miss, needing nothing of the
  object beyond `t`. Pinned by a test that passes a `t`-only i18n and asserts no throw.
  The local lesson is narrower than the fix: `vitest run tests/unit` is not what CI runs.
- **`errors.conflict.<resource>` is a fourth, of a different shape, and is deliberately
  left open.** The mapper derives it from a runtime resource name, so the key set is
  unbounded and **no member of it is defined for any resource**. Closing it means
  deciding whether the mapper should keep deriving keys it cannot guarantee, which is not
  this slice's decision to take on the way past. Recorded as a test that asserts the miss,
  and as follow-on 5. What #404 _does_ fix is the leak: `translateError` checks `exists`
  and falls back to the error's own message, so the worst case across the whole unbounded
  family is an untranslated sentence rather than a leaked identifier.

#### Slice 6 — the Lambda target stops advertising a limit it cannot honour

`API_JSON_BODY_LIMIT_BYTES` defaults to 10 MiB (`schema.ts:31`). Phase B measured the
Lambda invocation ceiling at **5.32 MiB of raw CDM** for an uncompressed body. Between
those two numbers the platform accepts, by its own configuration, payloads the runtime
rejects before any code runs: no `413`, no domain error, no audit entry, nothing in the
request log.

- `deploy/aws/lib/config/defaults.ts` — add `API_JSON_BODY_LIMIT_BYTES: '5242880'`
  (5 MiB) to `AWS_TARGET_ENV_DEFAULTS`, with the reason attached in the same style as
  every other key there. This is phase B finding 2's recommended option, taken: one
  config value, no route-specific behaviour, and every other target untouched.
- **The gzip asymmetry is documented, not engineered around.** `body-parser` applies
  `limit` after inflating (`inflate` is opt-out), so a gzipped client is still bounded
  by 5 MiB of _decompressed_ body while spending far fewer bytes against the
  invocation cap. That is the correct behaviour and it means the new limit binds
  uncompressed clients at roughly where Lambda would have, and gzipped clients earlier
  than Lambda would have. Say so in the guide, with the measured ratios (17.7% mean,
  22.8% worst case) and the recommendation to gzip large CDM.
- `docs/deployment/aws-serverless.md` — the ceiling, the reason, and how to raise it
  for an adopter who has measured their own CDM.
- **Template diff, declared:** one environment entry on the API and jobs functions.
- Tests: the parity/defaults test that already guards `AWS_TARGET_ENV_DEFAULTS`; and an
  assertion tying the value to the measured ceiling with a comment pointing at the
  measurements file, so a future edit has to argue with a number.
- **Shipped as #405.** The template diff is **three** resources per VPC-bearing shape,
  not the two declared: the migrate Fargate task shares the resolved environment and
  picks the key up exactly as it picks up every other `AWS_TARGET_ENV_DEFAULTS` entry.
  Inert there — it runs `node dist/migrate.js` and serves no HTTP — and consistent with
  existing behaviour rather than a defect, but the declaration did not name it.
  `byo/vpcless` gains two, having no migrate task. No `CDKMetadata` change, because this
  adds a value rather than a construct.

### Part C — credentials with a path instead of a refusal (program item 5)

`classifyConfig` refuses 17 credential-shaped keys (`env-file.ts:92-116`) because a
Lambda environment variable is plaintext in the template. The refusal is honest and it
is a capability gap: an adopter who needs Mailgun, or S3 with static keys, or a
password-protected Redis, cannot deploy this target at all.

**Smaller than the brief says** (§ Four things, item 1): the adapters read nothing from
`process.env`. Every key lands in `apps/api/src/config/env.config.ts`.

#### Slice 7 — credentials resolve through the port, on every target

- The mechanism already exists and is already trusted for exactly this:
  `ISecretResolver` (`packages/@grantjs/core/src/ports/secret.port.ts`), with an env
  resolver and an AWS Secrets Manager resolver in `@grantjs/secrets`, per ADR 0004.
  `ORIGIN_VERIFY_SECRET`, `GITHUB_CLIENT_SECRET` and `AUTH_MFA_SECRET_ENCRYPTION_KEY`
  travel it today. This slice widens the set; it invents nothing.
- **The shape.** `config` is a module-level synchronous const, and the credential
  fields cannot become promises without every consumer changing. Resolve once in the
  composition root instead: `createApp()` is already async, and every adapter is
  constructed inside or after it — `create-app.ts:141` (cache),
  `services/email.service.ts:52`, `services/file-storage.service.ts:12`,
  `lib/jobs/initialize.ts:29`. A `resolveCredentials(secrets)` step overlays
  resolver-provided values onto the credential fields before the first adapter is built.
  **Env-provided values keep working unchanged** — the env resolver returns exactly what
  `process.env` holds, so the default path is the same values by a different route.
- The overlay is explicit and enumerated, not reflective. A list of the keys and where
  each lands, in one place, so a reviewer can diff it against `CREDENTIAL_KEYS`.
- **`DB_GRANT_ROLE_URL` does not join this set, and the reason is worth writing down.**
  It is read by `packages/@grantjs/database/src/grant-rls-login-role.lib.ts` outside any
  composition root, during a migration, and it is a _superuser_ URL. Moving it needs the
  RLS grant path to change shape; it stays refused. Slice 8's message must keep saying so.
- **`E2E_DB_URL` and `E2E_REDIS_PASSWORD` do not join either.** They are test-harness
  keys with no production caller. They stay refused, and the refusal message says
  "test-only key" rather than implying a route exists.
- Security review focus: a resolved credential must not reach a log, an error message
  or a health payload; the resolver's cache TTL becomes the rotation window for these
  keys too, and that is a behaviour change worth stating; failure to resolve a
  _required_ credential must fail closed at boot, not degrade to an empty string —
  byo-database's F4 is the precedent, where an empty `DB_URL` surfaced as a connection
  error to `localhost` instead of a configuration error.
- **Shipped as #407.** Three notes for the security reviewer.
  - **The TTL sentence above is wrong, and the truth is a weaker guarantee.** These
    values are read once at boot and captured by the adapter constructed from them, so
    a rotation lands when the container is **replaced** — it does not track
    `SECRETS_CACHE_TTL_SECONDS`. `ORIGIN_VERIFY_SECRET` does, because the middleware
    resolves it per request. Inherent to the overlay shape rather than fixable within
    it; stated in the code, the guide and `.env.example`.
  - **Fail-closed needed no new validation code.** The overlay runs _before_
    `validateConfig()`, so the validator's existing "required when this provider is
    selected" checks see resolved values. Moving one call is the whole mechanism, and
    the ordering is pinned by a test that mutation-fails when reversed.
  - **Thirteen keys, not seventeen.** `POSTGRES_PASSWORD` joins the plan's three named
    exclusions: it is refused because it _already_ has a route through `DB_URL`, not
    because it lacks one.
- **A mutation initially survived, and the fix is in the diff.** Weakening the
  empty-value guard from `!value` to `value === undefined` passed every test, because
  the fake resolver normalized `''` away before the guard saw it — testing
  `EnvSecretResolver`'s normalization rather than the overlay's own defence. The suite
  now carries a deliberately less well-behaved resolver alongside the realistic one.

#### Slice 8 — the AWS refusal becomes a route

- `deploy/aws/lib/config/env-file.ts` — the keys slice 7 made resolver-backed move from
  `CREDENTIAL_KEYS` to `RESOLVER_SECRET_KEYS`. `DB_GRANT_ROLE_URL`, `E2E_DB_URL` and
  `E2E_REDIS_PASSWORD` stay refused, with their reasons updated so the list reads as
  three decisions rather than a leftover.
- The comment block at `:80-86` is rewritten: it currently says the adapters read these
  from `process.env`, which is not true and is what made this look like a four-package
  story.
- `scripts/put-secrets.ts` writes them to the platform secret out of band, as it
  already does for the two existing resolver keys.
- `lib/config/validate.ts` — `assertConfigurableEnv` must move in lockstep. This is the
  exact boundary byo-database's F10 broke twice: the file path and the props path read
  the same lists, and `env-boundary-parity.test.ts` exists to fail when they diverge.
  If this slice changes one list and not the other, that test is the thing that catches
  it — confirm it does, by mutation, before claiming it.
- `credential-keys.test.ts` — the oracle moves with the lists. Keep the assertion that
  URL-shaped keys are classified in both directions; that check was added because a
  password inside a URL matches none of the `CREDENTIAL_SHAPED` heuristic.
- `.env.example` — the ARN/secret flow for each newly routed key.
- **Template diff, declared:** keys leave the functions' `Environment` maps. That is the
  entire point of the slice and the diff should show exactly that and nothing else.
- **Shipped as #408, and three of its four expected costs were zero.**
  - **The template diff is empty**, and the declaration above is simply wrong. These
    keys were _refused_, so they were never in a template: `grep -c MAILGUN_API_KEY` on
    all three snapshots returns 0 before and after. What changed is which configurations
    synth accepts, which no snapshot of a configuration that never set them can show.
  - **`assertConfigurableEnv` needed no lockstep edit**, and cannot break the way F10
    did: `REFUSED_AS_ENV` is _derived_ from all four lists rather than duplicating them,
    so a key moving between two of them stays refused by construction. Confirmed by
    mutation as the slice demanded — dropping `...RESOLVER_SECRET_KEYS` from that spread
    fails `env-boundary-parity.test.ts` on all fifteen keys, naming each.
  - **`put-secrets.ts` needed no change.** It writes whatever `loadTargetConfig().secrets`
    holds, which `RESOLVER_SECRET_KEYS` populates.
  - `credential-keys.test.ts` also needed no change — both lists feed its `classified`
    set, so a key moving between them is a no-op to the oracle while an _unclassified_
    new one still fails it. That is the property it was written for.

### Part D — presigned uploads (program item 7)

**Read § Four things, item 2 before starting.** The brief's justification for this item
— lifting the ~6 MB Lambda payload cap for CDM — was measured and rejected in phase B.
The justification that survives is different and still real: **user file uploads** go
base64 through GraphQL (`file-storage.service.port.ts:16`; call sites at
`me.handler.ts:183`, `me.handler.ts:575`, `users.handler.ts:884`), paying +33% base64
expansion against the same invocation cap, and every byte passes through a Lambda that
is billed for the transfer. The nginx gateway already allows 100 MB, so this is also a
parity gap between targets.

#### Slice 9 — the port, and both adapters

The only `@grantjs/core` change in the entire program. **Architect sign-off, deep review.**

- `packages/@grantjs/core/src/ports/storage.port.ts` — `getUploadUrl(path, options):
Promise<{ url, fields?, expiresAt }>` added to `IFileStorageService` (currently
  `:14-50`). **Optional or required is the design decision**, and it belongs to
  Architect: required means every implementation must have one, including the local
  adapter where "presigned" has no meaning; optional means every caller needs a
  fallback path. Recommend required, with the local adapter returning a URL to a
  route it owns — a capability the port promises and one adapter cannot honour is the
  shape that makes ports leak.
- `@grantjs/storage` — the S3 adapter issues a genuine presigned PUT; the local adapter
  implements the same contract over its own route.
- The conformance suite that phase A established for `ICacheAdapter` is the model: one
  suite, run against both adapters, so "works on S3" and "works locally" are the same
  assertion.
- Constraints that must be in the contract, not in the caller: expiry, maximum size,
  and content type. A presigned URL without a size condition is an open write endpoint
  with a timer on it.

**Slice 9 outcome (#427).** Architect took the decision the plan referred: **required**,
recorded as ADR 0007. `fields?` did not survive — a `content-length-range` exists only
in presigned POST, which costs a dependency this repo does not carry, and an exact
length is the stronger commitment. Two additions the plan did not anticipate, both
argued in the ADR: `getMetadata()` on the port, because after a direct upload what a
client claimed is not evidence and a core change belongs in the deep-reviewed slice;
and the `PUT /storage/*` route, because a port method returning a URL to a route that
does not exist is not an implementation.

Three measured findings, all recorded rather than absorbed:

- `getSignedUrl` does **not** sign `content-type` unless `signableHeaders` names it.
  The obvious implementation issues a URL that appears to pin the type and accepts
  anything.
- A default S3 client hoists `x-amz-checksum-crc32` of an empty body into the signed
  query string; every real PUT is then refused `400 InvalidRequest`. Presigning needs
  its own client, because the fix is construction-time only and applying it to the
  shared client would strip checksums from `upload()`.
- **LocalStack community 3.8 does not verify SigV4 at all** — a forged signature, an
  expired URL, a wrong-length body and a rewritten tenant prefix were all accepted with 200. So the integration lane proves the round trip and nothing about enforcement.
  Slice 16 inherits assertions 19–24 against a real bucket; until it runs, nothing in
  the repository demonstrates that S3 refuses any of them.

`@grantjs/storage` had zero tests before this slice and now has 65 unit and 54
integration, plus a shared conformance suite for the five methods that already existed.
Twelve mutations killed. Template diff: none, as declared.

#### Slice 10 — the API surface

- `@grantjs/schema` — a mutation to request an upload URL and one to confirm
  completion, plus the REST equivalent kept in sync with OpenAPI (AGENTS.md § API
  surface). Types regenerate; nothing is hand-declared.
- Service and handler layers per the existing boundaries — handler → service →
  repository, no shortcuts.
- **The validation that base64 upload does today must not be lost.**
  `validateAndDecodeUpload` checks content type, extension and size _before_ anything
  is stored (`file-storage.service.ts:114`). With a presigned PUT the bytes arrive
  without passing through the API at all, so those checks move to: conditions baked
  into the presigned URL, plus verification at the confirm step. **This is the security
  core of part D** — say it plainly in the PR body, because it is where a reviewer's
  attention is worth the most.
- Tenancy: the key prefix must be derived server-side from the caller's scope. A
  client-supplied path in a presigned URL is a cross-tenant write.
- The base64 path stays. Additive, per the program's governing constraint: existing
  callers keep working, and an adopter changes nothing to keep today's behaviour.

**Slice 10 split into 10a and 10b (#428 is 10a).** Each existing upload mutation
costs about nine touchpoints — schema, input, operation, resolver, resolver index,
mutation map, REST route, REST schemas, OpenAPI path. Mirroring all three targets at
once is ~30 changed files of which twenty are the same shape repeated, which is a
worse review than two slices rather than a better one. 10a carries the whole mechanism
and all of the argument on one target (my user picture); 10b replicates it for the
project-membership and admin targets.

**Mirrored per target, not collapsed into one generic mutation.** A single
`requestUploadUrl(target: UploadTarget)` would be two mutations instead of six, but it
would have to either reach across handlers — a resolver calls one handler — or
re-implement each target's authorization in a new one. `users.handler.ts`'s
`assertSelfManagedIdentityMutationAllowed` is the case that decides it: duplicating
that check is how it comes to differ from the original.

**Where the validation went**, since this is the item the plan flags as part D's
security core. Content type and extension **move** to before the mint, delegating to
the same two validators the base64 path calls — not a second copy, because a second
copy is how two paths come to accept different things. Size **changes shape**: it is
measured as a claim before minting, committed to exactly by the URL, and measured
again against the store at confirm. The third is not redundant — it is the only one
that does not depend on the store enforcing what the URL says, which per ADR 0007 this
repository cannot demonstrate for S3 until slice 16.

`STORAGE_UPLOAD_URL_EXPIRY_SECONDS` (default 300) was added; the plan did not
anticipate a config key, but a bearer capability no store revokes needs its lifetime
to be an operator's decision.

**Slice 10b outcome (#429).** GraphQL only: neither `uploadMyProjectMembershipPicture`
nor `uploadUserPicture` has a REST route today, and each pair mirrors the transport
surface of the mutation it replaces, so the boot-parity route table is untouched.

The substance is that **authorization is checked twice per target**. The base64
mutations check inside the transaction that writes, which is sound when bytes and
write arrive together; a minted URL separates them by minutes. So each target checks
before issuing the capability and again before recording it — and the re-check covers
a gap the split creates that the base64 path never had: a membership revoked, or a
target that became self-managed, while a legitimately issued URL was still live.

The administrator target is the one to read closely. Its storage path is derived from
the **target** user rather than the caller, so unlike the `me` mutations there is no
structural backstop: the permission check is the entire tenancy boundary. That is also
why the three administrator mutations now share one `guardUserPictureWrite` definition
at the resolver layer rather than three copies of the same guard chain — a shared
definition cannot drift, and that is better than a test that notices when copies do.

#### Slice 11 — the web flow

- `apps/web/hooks/` — the new operations, and only there. `app/` and `components/` do
  not touch Apollo (AGENTS.md § Web app layer boundaries).
- `components/features/settings/setting-image-upload-dialog.tsx` and
  `components/features/project-sync-jobs/project-sync-job-start-dialog.tsx` are the two
  existing base64 readers; they move to request-URL → PUT → confirm.
- Failure states are the deliverable, not the happy path: an expired URL, a PUT that
  succeeds while the confirm fails, a user who navigates away mid-upload. Each leaves
  either a complete object or nothing claimed.

**Slice 11 outcome (#430).** Two commits, because two things are independently
verifiable: the web flow (jsdom unit tests) and the bucket rule that lets it work on the
deployed target (a CDK template assertion). They are one PR because splitting them would
have shipped a client that provably cannot reach S3.

The orchestration lives in `apps/web/lib/direct-upload.ts` rather than in the three
components, and the reason is the plan's own requirement. What has to hold is a property
of the _window_ between storing bytes and claiming them, and three copies of that window
is three chances to treat it differently:

- **Before the PUT** — an expired ticket or an abort means nothing was written and
  nothing was claimed, and both stop without sending a byte. The expiry is checked
  client-side deliberately: the local adapter answers a stale signature and a forged one
  identically by design (slice 9), so before the request is the only place the difference
  can be named.
- **After the PUT** — the abort signal is deliberately _not_ honoured. Abandoning a
  stored object is the orphan the sequence exists to avoid, so a cancelled upload that
  already landed is finished rather than dropped. This asymmetry is the one design
  decision in the slice, and it is pinned by a test that fails if the signal is checked
  again after the transfer.
- **A confirm that fails anyway** is reported as `unclaimed`, distinctly from a failed
  upload. The path the server derives is deterministic, so a retry overwrites: the orphan
  does not accumulate, and one successful retry resolves it.

Also: the request carries the headers the API named and no others, and `credentials:
'omit'` — a presigned URL authorizes itself, and the storage origin is not ours to hand a
session cookie to. Both are asserted, both mutations die.

25 web tests, 14 mutations killed; 5 deploy tests, 5 mutations killed.

**Finding F-11-1 — a failed confirm is not always "nothing claimed".** The plan's
acceptance ("each leaves either a complete object or nothing claimed") does not hold in
one branch, and the reason is upstream of this slice.

`sanitizeExtensionAndGeneratePath` derives `users/<id>/picture.<ext>` with nothing
per-upload in it, and `confirmMyUserPictureUpload` records that same derived URL. So:

- **Same extension as the current picture** — `pictureUrl` already equals what the
  confirm would write, so the confirm is a no-op on the row and **the PUT alone made the
  new bytes live**. A failed confirm means the picture changed while the user was told it
  did not. (The cache-buster the row carries is also not bumped, so a cached copy may
  still be displayed — which is, by luck, the less confusing of the two.)
- **Different extension** — the row still points at the old object, so the new one is
  orphaned and the old picture stays visible. This branch does satisfy the acceptance.

Fixing it properly means minting to a staging path and having the confirm promote the
object, which needs a copy/move on `IFileStorageService` — a port change, and out of
scope for a frontend slice. What 11 does instead is refuse to hide it: the Apollo cache
is evicted on the failure path as well as the success path, in both call sites that hold
one, so the UI re-reads the server's answer rather than assuming nothing moved. Carried
as a follow-up, not closed.

**Finding F-11-2 — the content type was a lie, and slice 9 made it a signed one.** The
crop pipeline always encoded JPEG (`canvas.toBlob(..., 'image/jpeg')`) while the content
type came from the dropped file's extension, so a dropped `.png` was uploaded as JPEG
bytes labelled `image/png`. Harmless while the API decoded a base64 blob it could
inspect; not harmless once the content type is what a presigned URL commits to. Fixed
in this slice: `chooseOutputFormat` decides the format, the extension, and the content
type together, and GIF is re-labelled PNG because a canvas has no GIF encoder and
`toBlob` substitutes one silently. Closed — the mutation that re-labels GIF as GIF now
fails.

**Deviation from the plan's scope: the second dialog was never a base64 reader.** The
plan names `project-sync-job-start-dialog.tsx` as the other file that "moves to
request-URL → PUT → confirm". It does not read a file into base64 and it does not touch
storage: it parses a JSON file with `FileReader.readAsText`, validates its shape, and
sends the **parsed object** as `SyncProjectInput` GraphQL variables to `startProjectSync`.
There is no storage target for a CDM payload — slices 9–10b minted picture targets only —
so moving it would need a new port-backed target, a handler pair, and a worker that reads
the payload from the store instead of from the mutation. That is a backend slice, not a
line in a frontend one. Left as it is, and carried as a follow-up.

It is worth carrying, though, and not only for symmetry: that dialog accepts a 25 MB JSON
file and posts it as a GraphQL variable, which is well past the 6 MB request ceiling part
B established for the Lambda target (slices 5 and 6). A CDM import large enough to be
worth doing is currently one the deployed target cannot accept. Part B made the ceiling
honest; this is the first caller found standing on the wrong side of it.

### Part E — the decisions slice 4 unlocks (program items 8, 10, 9, 11)

Tier 3, plus item 8's second half. **These are decision slices** (gate 1 decision 6):
each produces a number and a recorded choice, and code only where the choice says
build. A tier-3 item built without its decision is work done for a reason nobody
wrote down.

#### Slice 12 — ADR 0002, settled

**Outcome: the measurement went the second way, and slice 12 split.** A 28,880-entity
import takes **62.3 minutes — 415% of the ceiling** (measured offline, no deploy needed;
see the measurements file § ADR 0002). So the branch below that builds the hatch is the
live one.

- **12a — ADR 0002 amended, no code.** The open question is answered, "phase C wires this"
  is corrected to what phase C actually did, and the size at which sync must leave Lambda
  is recorded as **≈10,700 entities** so the size-based split in _Consequences_ becomes
  specifiable. F6 and program blocker 3 close here.
- **12b — the hatch.** Same job envelope, same public names, runtime by configuration.
  **Opt-in and off by default**, on ADR 0002's own wording ("existing deployments keep
  running the job in-process exactly as today") — so the declared template diff is
  **none**, and two tests assert that rather than leaving it to the snapshot. Requires the
  container tier: a Fargate task needs a VPC and shares the migrate task's cluster and
  image, so `migration: { enabled: false }` or a vpcless topology has no hatch.

**Two things the measurement added that the plan did not anticipate.** Per-entity cost
_rises_ with scale (5.5× across the range), so the ceiling is crossed near 10,700 entities
rather than at 28,880 — the plan's linear framing would have put the crossing at 29,170 and
called it a near miss. And gate 3 chose to try fixing the cause first, which produced a
bound rather than a fix: `existsById` took −13% of statements, and a perfect memory of
every repeated lookup would reach 1.54× against the 4.15× needed. The structural fix is a
batch apply path, carried as follow-on 12. The hatch is an escape valve, knowingly.

- Read slice 4's three-point measurement. Fit fixed cost against per-entity cost and
  state the extrapolated duration for a 28,880-entity import with a stated confidence,
  not a point estimate dressed as one.
- **If it fits under 15 minutes with margin**: amend ADR 0002 to record that the
  escape hatch is not needed at the measured scale, name the scale at which it would
  be, and close phase C's F6 and program blocker 3. No code.
- **If it does not fit**: build the Fargate escape hatch ADR 0002 already specifies —
  same job envelope, same public names (`startProjectSync` / `startProjectExport`, the
  `project_sync_jobs` table, the polling API), runtime selected by configuration. The
  `MigrateTask` construct is the precedent for a Fargate one-shot in this stack and
  should be read before writing a second one.
- Either way ADR 0002 stops saying "phase C wires this", which it has been saying since
  phase C decided it could not.

#### Slice 13 — a failed queue message stops waiting 90 minutes

`visibilityTimeout` is `consumerTimeout * 6` (`job-queue.ts:78`), the AWS
recommendation, against a consumer that may run Lambda's full 15 minutes — so three
receives to reach the DLQ (`MAX_RECEIVE_COUNT = 3`, `:26`) takes about 4.5 hours. Phase
C accepted this explicitly pending a measurement of real import durations, which slice
4 now provides.

- Derive the visibility timeout from the **measured** p99 job duration rather than from
  the theoretical ceiling. AWS's 6× recommendation is about a consumer whose duration
  you do not know; slice 4 removes that excuse.
- The trade to state in the PR: too short and a slow-but-healthy job is redelivered and
  runs twice. `project-sync` idempotency under redelivery is the property that has to
  hold, and if it is not already asserted, asserting it is part of this slice — a
  shorter timeout that duplicates imports is worse than a long one.
- **Template diff, declared:** one property on the queue.

#### Slice 14 — RDS IAM auth as an option, and the proxy default re-decided

Two things phase B and C both deferred (F14), and they are separable.

- **IAM auth** is the additive half: `password?: () => Promise<string>` on
  `DatabaseConfig` (`packages/@grantjs/database/src/connection/connection.ts:28-37`),
  which today takes only `connectionString`. The `postgres` client accepts a function
  for `password`, which is what makes a rotating IAM token workable — a token is valid
  ~15 minutes and a long-lived pool outlives it. Additive, optional, every existing
  caller unchanged.
- **The proxy default is a cost decision, not an engineering one.** Off today because a
  persistent pool forfeits Aurora auto-pause, measured at 0.5 ACU flat across forty idle
  minutes ≈ $58/month (`grant-platform.ts:238-250`). **Recommend it stays off**, and
  record why with the number, rather than flipping a default in an integration PR. What
  this slice adds is the option properly wired and documented, so an adopter with real
  concurrency turns it on knowingly.
- IAM auth is only reachable with the proxy or with RDS IAM on the cluster directly;
  say which combinations are supported, in a table, the way byo-database's topology
  table does.
- **Template diff, declared: none by default.** If the diff shows the proxy appearing,
  the slice has flipped a default it decided not to flip.

#### Slice 15 — OpenNext, measured and then decided

The standing decision is recorded twice in the code (`props.ts:205-208`,
`web-function.ts:4-6`): a Next standalone server behind the Lambda Web Adapter, not
OpenNext, because OpenNext exists for ISR cache persistence and image optimization and
this app uses neither. Phase C measured cold start at 526–630 ms.

- Re-measure cold start on the current build. If it has not regressed, **the decision
  stands and this slice is a paragraph** in the doc comment and in ADR 0003, saying it
  was re-checked, with the date and the number.
- The condition that would change it is stated so a future reader can test it: ISR
  adoption, or Next image optimization becoming load-bearing.
- **Expected outcome: no code.** Recorded in advance so a closing slice with an empty
  diff reads as the plan working rather than as work skipped.

### Part F — the second deployed proof

#### Slice 16 — everything after part A, proven on a real deploy

The second and last account cycle. Extends the slice 4 measurements file.

- **Part C**: deploy with at least one credential supplied through the resolver — SMTP
  or Mailgun, whichever is cheapest to verify end to end — and observe the adapter
  using it. Then the negative that matters: that credential must appear in neither the
  CloudFormation template, nor `cdk.out`, nor the function configuration. Check by
  `aws lambda get-function-configuration` and `aws cloudformation get-template`, and
  paste the commands, as byo-database's slice 5 did.
- **Part D**: an upload through the presigned path, of a file large enough that the
  base64 path would have failed. Plus the refusals: an expired URL, an oversized PUT
  against the URL's own size condition, and a URL issued for one tenant used against
  another's prefix.
- **Part E**: whatever it built. If slice 12 built the Fargate hatch, an import that
  exceeds 15 minutes on Lambda and completes on Fargate. If slice 14 wired IAM auth, a
  deploy using it.
- **Teardown, in both regions**, to the same standard: `cdk destroy` to completion, the
  account measured back to baseline in `eu-central-1` **and** `us-east-1`, F1's ACM
  validation CNAMEs removed by hand (byo-database reproduced this; assume it recurs),
  and the F7 log-group count recorded.

## Named split points

The scope objection above, made actionable. If a gate decides a part is its own story,
these are the cut lines — each is a `gh stack` re-root, not a replan.

| Split                      | Cut after | New story slug            | Why it is a clean cut                                                                                                                      |
| -------------------------- | --------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **A alone**                | slice 4   | `aws-edge-trust-closeout` | The program brief's original proposal. Self-contained: one threat model, one reviewer, one deploy, and it closes an accepted-risk control. |
| **C as an adapters story** | slice 6   | `credential-resolution`   | Slices 7–8 benefit every target and only slice 8 is AWS. The program brief already says item 5 "is not an AWS story".                      |
| **D as a feature story**   | slice 8   | `presigned-uploads`       | A vertical feature: core port, schema, API, web. Different reviewers from everything around it, and the one part needing Architect.        |
| **E as a decisions story** | slice 11  | `aws-target-trade-offs`   | Four decisions that share an input (slice 4's number) and produce ADR amendments. Nothing downstream depends on them.                      |

The measurement in slice 4 is the only cross-part dependency, and it points **forward
only** — part E consumes it. Any split that keeps slice 4 in part A leaves every other
part independently mergeable.

## Risks specific to this story

| #   | Risk                                                                                                                                                                                                                                   | Handling                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The trunk outgrows any single reviewer.** Sixteen slices across `@grantjs/core`, four adapter packages, `apps/api`, `apps/web` and `deploy/aws`.                                                                                     | § Named split points, decided at each part's gate 3 rather than at the end. The final deep review is scoped to integration, not to re-reviewing sixteen merged slices.                                                                       |
| 2   | **Scoping SES breaks mail delivery in a way synth cannot see.** An identity ARN that does not match the `From` address fails at send time, not at deploy time.                                                                         | Slice 4 sends real mail under the scoped policy, and records the denial for an out-of-identity address. Until that runs, slice 2 is unproven — say so in its PR body rather than at gate 4.                                                  |
| 3   | **The alarm's threshold is guessed until slice 4 measures the noise floor.** A public Function URL is scanned; too tight and the control is muted by its own false positives, which is how paper controls die.                         | Threshold is a prop with an argued default; slice 4 measures the baseline and slice 4's PR corrects the default. The correction is expected, not a defect.                                                                                   |
| 4   | **The metric filter is coupled to a log line.** Any improvement to the `msg` at `origin-verify.middleware.ts:97` silently disables the control.                                                                                        | Match on the structured module name and level, not the prose. Plus a test in `apps/api` asserting the fields the filter depends on — the coupling is real either way, and an assertion is what makes it visible from the side that moves.    |
| 5   | **Part C widens what a compromised platform secret yields.** Today it holds `DB_URL` and two keys; after slice 8 it may hold every third-party credential the deployment uses.                                                         | Security-full on both slices. The alternative is worse — those credentials are template plaintext today, which is why they are refused — but the concentration is a real change to the blast radius and belongs in the guide, not just here. |
| 6   | **Part D's presigned URL moves validation off the request path.** Content type, extension and size are checked before storage today (`file-storage.service.ts:114`); a presigned PUT bypasses all three.                               | Conditions in the URL plus verification at confirm; tenancy prefix derived server-side. Slice 16 tests the three refusals on a live deploy, not only in unit tests.                                                                          |
| 7   | **Slice 4 may not reproduce the failure it is measuring.** A 28,880-entity import might fail on ingress, on a database limit, or on something unrelated to duration.                                                                   | That is a result. Slice 12 is written to consume three outcomes, one of which is "it failed for another reason, and here is the reason". No slice after it assumes success.                                                                  |
| 8   | **Two stale worktrees and an unmerged close-out branch** (`chore/close-out-byo-database`, three commits ahead of `main`) before this story starts.                                                                                     | Principal clears both before slice 1. Third consecutive story where worktree hygiene was ticked ahead of the fact — program brief § Housekeeping, and byo-database's own cleanup note.                                                       |
| 10  | **CDK test files synthesize a whole platform per assertion**, and the self-hosted runner is ~10x slower than local. `origin-verify-alarm.test.ts` (#403) did thirteen synths; its first measured 35,027 ms and failed an unrelated PR. | Fixed on the trunk (`b3ce5ce1`): the file memoizes one `Template` per fixture, and the suite timeout went 30 s to 60 s. Any new CDK test file should build once per fixture, not once per `it`.                                              |
| 9   | **The green-field template changes six times in this story.** byo-database's byte-identity oracle does not apply, which removes the single cheapest safety net the last story had.                                                     | Per-slice declarations in § Verification model. A snapshot diff outside a slice's declaration fails it — same enforcement, narrower claim. Gate 4 reviews the cumulative template diff against `main` as one artifact.                       |

## Stack setup

Root the stack on the trunk — never `main`, or the slices skip gate 4:

```sh
git switch -c feat/aws-followups-closeout 98943678 && git push -u origin feat/aws-followups-closeout
gh stack init --base feat/aws-followups-closeout feat/aws-followups-middleware-order

# after each slice
gh stack submit --auto
gh stack link --base feat/aws-followups-closeout <pr> <pr>   # bottom to top
gh stack add feat/aws-followups-ses-identity                  # before starting the next one
```

`--base` is not optional on `init` or `link`. `gh stack submit --auto` opens drafts;
`gh pr ready <pr>` when a slice is ready for gate 3. `gh stack merge` is a human command.

## Dependencies / notes

- **Two account cycles, slices 4 and 16.** Everything else is CI-verifiable. That is
  the reason for the ordering, not a coincidence of it.
- **The scratch account is at baseline** as of the byo-database teardown (2026-09-09),
  with the two known residues: F1's ACM validation CNAME (idempotent per domain) and
  F7's log groups, one per function per cycle.
- **`dead-code:deploy` runs in CI.** Slices 3, 9 and 14 each add an export before its
  consumer exists; wire it in the same slice or the gate fails.
- **The local e2e stack collides with CI** on the self-hosted runner. Tear it down
  before pushing, as in phases A–C and byo-database. In practice the runner is also
  serialized: two stacked PRs pushed together took **~24 minutes** to both go green,
  the second queued behind the first. Budget for that before running e2e locally.
- **`pnpm --filter grant-api test` is the CI-equivalent command, not
  `vitest run tests/unit`.** The integration suite lives beside the unit one and is what
  caught slice 5's `i18n.exists` regression. Run the package script.
- **`synth:check` covers three shapes** (`scripts/snapshot-template.mjs:82-93`):
  green-field, BYO-with-VPC and BYO-without. Slices 2, 3, 6, 8 and possibly 13 update
  all three, and a slice that updates one and not the others has almost certainly made
  a topology-conditional change it did not intend.
- **`apps/api` changes in five slices** (1, 5, 7, 10, plus tests in 3). Unlike
  byo-database, "if a slice edits `create-app.ts` the design has gone wrong" does
  **not** apply here — slice 7 edits the composition root by design. What still holds
  is that no slice may construct a handler, service or repository outside the factories.
- **`@grantjs/env` is not modified.** Its dependency-free constraint (AGENTS.md § Error
  handling) is why part C resolves credentials in the composition root rather than in
  the parser.

## Human gates

- [x] **Gate 1: scope approved** — items 2–11 as one story, 2026-09-09, Ale Heredia.
      Taken on this document rather than a separate brief, with the objection recorded
      in § Scope. Gate 1 decisions 1–6 above are part of this approval.
- [x] **Gate 2: stack plan approved** — 2026-09-09, Ale Heredia.
- [ ] **Gate 3: per part, not once.** Parts A and C are **security-full and reviewed by
      someone other than the slice author** — phase C's F16 and byo-database's slice 1
      are two consecutive precedents where a self-reviewed security slice cleared gate 3
      and had to be redone. Slice 9 is deep (a `@grantjs/core` port). Everything else is
      light.
- [ ] **Gate 4: story → `main` deep review.** Blocking items, known in advance:
  - [ ] The scratch account measured to zero in **both** regions after slice 16.
  - [ ] `main` merged into the trunk before the integration PR opens — and if `main` did
        not move, record that rather than skipping it silently.
  - [ ] An independent security pass over the assembled edge-trust and credential paths
        (parts A and C), by a reviewer who authored none of the slices.
  - [ ] The cumulative `cdk.snapshot/` diff against `main` reviewed as one artifact,
        every line attributable to a named slice.
  - [ ] If any part was split out (§ Named split points), the program brief updated to
        say which story owns it.

## Cleanup

- [ ] Scratch account torn down after slice 16; both regions at baseline; ACM CNAMEs
      removed by hand and the F7 log-group count recorded
- [x] `chore/close-out-byo-database` merged (#398) and its worktree removed; the stale
      `chore/close-out-aws-edge-infra` checkout refreshed — **both owed before slice 1**,
      both done 2026-09-09 ahead of it. See § Metadata, `worktree_path`. First story in
      four where this was done before the tick rather than after.
- [ ] Local **and remote** slice branches deleted, verified with `git ls-remote` rather
      than ticked. Phases A and C both ticked this without doing it; byo-database was the
      first to actually verify it
- [ ] The five `feat/aws-adapters*` and eighteen `*aws-edge-infra*` remote refs from
      phases A and C deleted (program brief § Housekeeping — one command, still not run)
- [ ] Stack plan status → `merged-to-main`
- [ ] Program brief updated: every row in tiers 1, 2 and 3 given a disposition
- [ ] Phase C stack plan: F6, F9 and F14 dispositions updated from "follow-on story" to
      this story; follow-ons 1, 2, 4, 5, 7, 8 and 9 likewise
- [ ] Phase B brief: its open acceptance criterion on RDS IAM auth resolved either way

## Follow-ons

Carried out even of this story, which is meant to be the one that carries everything.

| #   | Item                                                                                                                                                                                                                                                 | Why it is not here                                                                                                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`DB_GRANT_ROLE_URL` through the resolver.** The one credential part C leaves refused, and the most valuable one in the list — a superuser URL.                                                                                                     | It is read outside any composition root, during a migration (`database/src/grant-rls-login-role.lib.ts`). Moving it changes the RLS grant path's shape, which is its own story.                                                                                                                                        |
| 2   | **Bring-your-own Redis** (byo-database follow-on 1). Still "config only — no network wiring is generated".                                                                                                                                           | Unchanged by anything here.                                                                                                                                                                                                                                                                                            |
| 3   | **F5 — a `"` inside a _referenced_ secret** (byo-database gate 4, M-4). Whether CloudFormation merely breaks or the quote can close `DB_URL` and open another key.                                                                                   | Still open, still needs a deploy. **Slice 16 is a deploy** — if it is cheap to fold in there, do it and close the finding; if not, it stays open and this row says so.                                                                                                                                                 |
| 4   | **GraphQL ingress payload sizes.** Phase B measured REST ingress only; a GraphQL client sending `searchable` pays more than the recorded table shows.                                                                                                | Slice 6 sets a limit informed by REST numbers. If GraphQL ingress turns out to bind first, that is a second measurement and a second decision.                                                                                                                                                                         |
| 5   | **`errors.conflict.<resource>` resolves for no resource.** `mapDomainToHttp` derives the key from a runtime resource name; the catalogue defines only `duplicateEntry` and `duplicateAuthMethod`, so every `ConflictError` naming a resource misses. | Found by #404, which closed the _leak_ (`translateError` falls back to the message) but not the cause. Fixing it is a decision about whether the mapper should derive keys it cannot guarantee — a design call, not a slice's aside. `errors.notFound.<segment>` has the same shape with mostly-complete coverage.     |
| 6   | **A rotated `DB_URL` does not reach a warm container.** `createApp()` resolves it once and hands it to a pool; the resolver TTL cannot govern a pool built from an earlier value. `apps/api/src/lib/secrets/database-url.ts` documents the opposite. | Found by #421 and measured: polled 8 m 27 s against a 300 s TTL, still stale; one container replacement fixed it on the first request. Same shape as the caveat slice 7 records for overlaid credentials, so it is one rule rather than two exceptions — and the doc comment is currently wrong.                       |
| 7   | **JWKS answers `200 {"keys":[]}` when the database is unreachable.** `getJwks()` swallows conversion failures and `sendJwksResponse` wires `onKeyError` only in development.                                                                         | Found by #421. Worse than a 500: a verifier receives a valid-looking empty key set, rejects every token, and gets no signal that the cause was an outage. Security-adjacent.                                                                                                                                           |
| 8   | **Token `iss`/`aud` are the Function URL, not `APP_URL`.** The issuer is request-derived, and behind CloudFront the Host the Lambda sees is the origin.                                                                                              | Found by #421. An OIDC relying party following `iss` reaches an origin that refuses every unauthenticated request by design, and the value changes if the Function URL is ever recreated.                                                                                                                              |
| 9   | **`project_sync_jobs` rows are not readable immediately after their own `202`.** Absent twice in five checks at 5 s; all present later.                                                                                                              | Found by #421. Read-after-write latency rather than loss, but a client that follows its own 202 with a GET can get a 404. A guide note, or a read-your-writes guarantee.                                                                                                                                               |
| 10  | **A confirm that fails can still have changed the picture.** F-11-1: the derived storage path has nothing per-upload in it, so a PUT to the extension already in use overwrites the live object before anything is recorded.                         | The fix is a staging path the confirm promotes, which needs copy/move on `IFileStorageService` — a port change, and #430 is a frontend slice. #430 evicts the cache on the failure path so the UI stops claiming the old state, which is mitigation, not closure.                                                      |
| 11  | **A CDM payload has no direct-upload target.** The sync-job dialog posts a parsed 25 MB JSON file as GraphQL variables, well past the 6 MB ceiling parts B established for the Lambda target.                                                        | Found while doing #430, which the plan expected to move this dialog too — it was never a base64 reader (see the slice 11 deviation). Needs a port-backed payload target, a handler pair, and a worker that reads from the store: a backend slice. The first caller found on the wrong side of part B's honest ceiling. |
| 12  | **The CDM import issues ~48 SQL statements per entity, and its per-entity cost rises with scale.** ≈1.4 M statements for a 28,880-entity document; 62.3 min measured against a 15-min ceiling.                                                       | Found by slice 12's measurement. The cheap fix is bounded at 1.54× against the 4.15× needed (§ ADR 0002), so closing it means a batch apply path: multi-row inserts, set-based existence resolution, no per-entity service round trip. A story, not a slice — ADR 0002's hatch is the escape valve in the meantime.    |
