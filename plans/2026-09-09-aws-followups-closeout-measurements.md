# Measurements — AWS follow-ups close-out

Evidence for [`2026-09-09-aws-followups-closeout-stack.md`](./2026-09-09-aws-followups-closeout-stack.md),
slices 4 and 16 — the two slices whose evidence is a deploy rather than a diff.
Everything else in the story is CI-verifiable and is reviewed as a diff; nothing below
restates it.

Written **before** the first deploy, in phase C's shape: baseline first, then wall
clock, then each observable check with its output, then what teardown left behind. A
number recorded after the fact is a number nobody can check.

- **Account**: `972374872669`, profile `grant-cdk`, role `GrantCdkDeploy`
- **Regions**: `eu-central-1` (platform), `us-east-1` (`GrantCertificate` — CloudFront
  serves certificates from nowhere else)
- **Zone**: `grantjs.org.` (`Z0558018P345EAI1WA8P`), the zone phases A–C and
  byo-database used
- **Hostname**: `edge-proof.grantjs.org`
- **Stack at**: trunk `e8d55e83`, which carries slices 1–3 merged (#400, #401, #403)

## What this cycle is for

Gate 1 decision 4 batched two unrelated deliverables into one account cycle, because
phase C established that every deployed slice owes a full teardown verified in **both**
regions (F15) — so the account cycle, not the deploy, is the expensive unit.

1. **Part A's proof.** Slices 2 and 3 are unproven by construction: an identity ARN that
   does not match the From address fails at _send_ time, and a metric filter that
   matches nothing reports healthy forever. Neither is observable from a template.
2. **ADR 0002's missing number.** Whether a `project-sync` import fits inside Lambda's
   15-minute ceiling, at three scales rather than the one point phase C measured.

## Topology, and why this one

**Bring-your-own PostgreSQL, no VPC** (`-c dbUrlSecretArn=…`, `network` omitted).

Phase C measured 208.25 s for 283 entities but **could not read the
`project_sync_jobs` row** — its Aurora cluster sat in isolated subnets with the Data
API disabled, so the job's own record of itself was unreachable and the duration had to
be inferred from CloudWatch alone. The byo-database story made a reachable database
possible, and this cycle uses it: the row is the authoritative record of what the job
thought happened, and inferring it from metrics is how phase C's single data point
became untrustworthy.

The database is out-of-band and deliberately not created by this stack: RDS PostgreSQL
`grant-edge-proof`, `db.t4g.micro`, 20 GB gp3, publicly accessible, `eu-central-1`,
engine 18.3. Port 5432 is open to `0.0.0.0/0` because a Lambda outside a VPC has no
fixed egress address to narrow to — the same shape byo-database's topology C used,
authorised explicitly for this run, with a 40-character random password and a teardown
that destroys it. It is not a pattern the guide recommends to adopters and the guide
does not.

## Baseline before anything was created

Taken 2026-09-10, before the first `cdk deploy` of this story.

| Check                                                       | `eu-central-1`    | `us-east-1`       |
| ----------------------------------------------------------- | ----------------- | ----------------- |
| CloudFormation stacks (`CREATE_COMPLETE`/`UPDATE_COMPLETE`) | `CDKToolkit` only | `CDKToolkit` only |
| CDK bootstrap version                                       | 32                | 32                |
| `rds describe-db-instances`                                 | none              | —                 |
| `rds describe-db-clusters`                                  | none              | —                 |
| `ec2 describe-nat-gateways` (available)                     | none              | —                 |
| `ec2 describe-vpcs` (non-default)                           | none              | —                 |
| `lambda list-functions`                                     | 0                 | 0                 |
| `secretsmanager list-secrets`                               | none              | —                 |
| `acm list-certificates`                                     | —                 | none              |
| **log groups**                                              | **113**           | **14**            |
| `grantjs.org` records                                       | **20**            | —                 |

The default VPC `vpc-1d259574` (`172.31.0.0/16`) is pre-existing and is **not** part of
this story's footprint; it is where the out-of-band database lives.

**Two known residues, both confirmed present and both expected** (phase C F1 and F7):

- `_17d199c9b8df2cc1e725d5274f58c2bf.aws.grantjs.org. CNAME` — the ACM validation
  record from phase C's `aws.grantjs.org` deploy. `cdk destroy` does not remove it;
  it is idempotent per domain, so it neither grows nor interferes.
- 113 log groups in `eu-central-1` against 14 in `us-east-1`. Log groups outlive the
  stack that made them, one per function per cycle, and the count is the F7 growth
  rate made visible. This cycle should add a fixed number and the teardown section
  records which.

`demo.grantjs.org` and `docs.grantjs.org` are **live records unrelated to this story**
and must survive teardown untouched. Recorded here so the teardown check has something
to assert rather than a vague "the zone looks fine".

## Owed by this cycle, and not obtainable at synth

Each is a question CI cannot answer. Open until it has an observation next to it.

### Part A — the edge trust model

1. **A direct request to the Function URL is refused.** `403`, and the
   `OriginVerify` warn line in CloudWatch.
2. **The metric filter increments.** The filter matches structure, not prose, and
   whether Lambda forwards this container's stdout verbatim or prefixes it is not
   knowable at synth — slice 3 chose a text pattern precisely because of that. If the
   count stays zero while the log line is present, the pattern is wrong and the slice
   is not done.
3. **The alarm transitions to `ALARM`.** The deliverable, not the metric. A metric that
   increments while the alarm sits in `INSUFFICIENT_DATA` is the same paper control in
   a new place.
4. **The notification arrives.** `-c alarmEmail=ale@logus.graphics`. AWS sends a
   confirmation link on first deploy and delivers nothing until it is clicked, which is
   a manual step no template can take.
5. **Baseline noise over the deploy window.** How many refusals arrive unprompted. This
   is the number that sets the threshold, and it cannot be guessed from a diff. Slice
   3's default of 20-in-5-minutes is explicitly a starting point.
6. **A real SES send succeeds under the scoped policy.** Slice 2 scoped `ses:SendEmail`
   to `identity/grantjs.org` with a `ses:FromAddress` condition pinning
   `no-reply@grantjs.org`. The condition's behaviour with a display name — `"Grant"
<no-reply@grantjs.org>` — is the single most likely way that slice broke delivery,
   and it is unobservable until now.
7. **A send from outside the identity is denied.** The negative half. Without it, a
   passing positive proves only that sending works, not that scoping does.

### ADR 0002 — the number

8. **`project-sync` at three scales**: `department` (3,650), `enterprise` (28,880) and
   `entropy-bound` (28,880, least compressible). One point cannot separate per-entity
   cost from fixed cost, which is the error phase C's own measurements warned about
   when recording its 208.25 s run.
9. **Recorded for each**: wall clock, the jobs-Lambda `Duration` metric, whether the
   15-minute ceiling was reached, `NumberOfMessagesReceived`/`Deleted`, DLQ depth, and
   what the `project_sync_jobs` row says.
10. **Ingress, observed rather than computed.** A 28,880-entity document is 12.16 MiB
    raw / 2.22 MiB gzipped; uncompressed it exceeds the invocation cap. Sending it
    gzipped and recording that the request succeeded is also the live confirmation of
    phase B's finding 1, which until now is arithmetic on fixture bytes.
11. **Slice 6's new 5 MiB limit is _not_ in force for this run.** The trunk deployed
    here carries slices 1–3 only; `API_JSON_BODY_LIMIT_BYTES` is still `@grantjs/env`'s
    10 MiB default. Stated so the ingress numbers are not later misread as evidence
    about part B.

**The measurement can go three ways and all three are results**: comfortably under 15
minutes (slice 12 closes ADR 0002's escape hatch as unneeded and amends the ADR), near
it (slice 12 builds the hatch), or the import fails for a reason unrelated to duration
— which is the finding, and it reprioritises everything after it.

### Teardown

12. **Both regions measured back to baseline**, with the same commands as above. Phase
    C's F15 was raised because checking the platform region alone reported clean while
    `GrantCertificate` was still standing in `us-east-1`.
13. **The out-of-band database, its security group and its secret destroyed**, and the
    `edge-proof.grantjs.org` records gone while `demo` and `docs` survive.
14. **The F7 log-group delta counted** rather than described.

---

# Cycle 1 — slice 4, deployed 2026-09-10

Deployed from the trunk at `e8d55e83` (slices 1–3 merged), topology **bring-your-own
PostgreSQL, no VPC**, hostname `edge-proof.grantjs.org`.

## Deploy

|                                   |                                                       |
| --------------------------------- | ----------------------------------------------------- |
| `cdk deploy --all` wall clock     | **8 m 58 s** (`GrantPlatform` 305.4 s; total 522.5 s) |
| Deployed resources                | **65**                                                |
| Smoke, before the database worked | 12/13 checks                                          |
| Smoke, after                      | **13/13 checks, 10/10 behaviours**                    |
| Smoke with `--register`           | **14/14**                                             |

## Part A — the edge trust model

### 1–2. The refusal, and the filter that counts it — **confirmed**

A direct request to the Function URL, no origin header:

```
GET  https://jq5…on.aws/health   -> 403  {"error":"Forbidden","code":"FORBIDDEN",…}
POST https://jq5…on.aws/graphql  -> 403
GET  … with a wrong secret       -> 403
```

The same path through CloudFront returns **200**. That contrast is the whole trust model
in two lines, and it is the first time it has been observed rather than reasoned about.

The log line, verbatim from CloudWatch:

```json
{
  "level": "warn",
  "time": "2026-09-10T09:44:37.118Z",
  "module": "OriginVerify",
  "msg": "Request did not arrive through the CDN; refusing",
  "path": "/health",
  "headerPresent": false
}
```

**Lambda forwards this container's stdout verbatim — no prefix, no envelope.** Slice 3
chose a _text_ filter pattern because whether that was true could not be known at synth.
It was a safe choice and it turns out an unnecessary one: a JSON pattern
(`{ $.module = "OriginVerify" }`) would have matched this line too. Recorded so a future
slice can narrow it deliberately rather than discover it again.

`DirectOriginRequests` moved from 0 to **3** within a minute of the three probes above —
the filter increments, which is the half no template can show.

### 3. The alarm fires — **confirmed, and this is the deliverable**

240 refusals over 14 minutes (8 rounds × 30, every one a 403):

```
State:  ALARM
Reason: Threshold Crossed: 2 datapoints [90.0 (09:48:00), 33.0 (09:43:00)]
        were greater than or equal to the threshold (20.0).
```

Before the probes it sat in **`OK`**, not `INSUFFICIENT_DATA` — the `defaultValue: 0` on
the metric filter plus `treatMissingData: notBreaching` does what slice 3 claimed. An
alarm parked in `INSUFFICIENT_DATA` is indistinguishable from a broken one, and this one
never was.

### 4. The notification — **wired, not yet delivered**

`-c alarmEmail=ale@logus.graphics` created the topic, the subscription and the alarm
action. The subscription is `PendingConfirmation`: AWS emails a link and delivers nothing
until it is clicked. Exactly as the guide says, and the one step no template can take.

### 5. Baseline noise — **zero**

| 5-minute bucket (local) | `DirectOriginRequests` | Source              |
| ----------------------- | ---------------------: | ------------------- |
| 11:40                   |                      3 | manual probes       |
| 11:45 / 11:50 / 11:55   |           60 / 90 / 90 | the 240-probe run   |
| **12:00**               |                  **0** | **nothing of mine** |

**No unsolicited refusals at all** over the observed window. The reason is structural
rather than lucky: the metric counts requests reaching the _Function URL_, whose hostname
is random and appears in no certificate transparency log — scanners find
`edge-proof.grantjs.org`, and those arrive through CloudFront carrying the secret, so
they never refuse. Only a caller who already knows the origin URL can move this metric.

So slice 3's 20-in-5-minutes default is, if anything, **loose**: the floor is zero and a
sustained nonzero rate is meaningful on its own. Left unchanged — a threshold above a
measured floor of zero is not wrong, and lowering it on one short window would be
over-fitting.

### 6–7. SES, scoped — **both halves confirmed**

The deployed statement, read back off the role:

```json
{
  "Action": ["ses:SendEmail", "ses:SendRawEmail"],
  "Resource": "arn:aws:ses:eu-central-1:972374872669:identity/grantjs.org",
  "Condition": { "StringEquals": { "ses:FromAddress": "no-reply@grantjs.org" } }
}
```

**Real mail sent under it: `AWS/SES` `Send` = 2, `Delivery` = 2** — an account
verification and a password reset, both through the API's own role.

**The display-name question is settled.** `config.email.fromName` defaults to `'Grant'`
even when `EMAIL_FROM_NAME` is unset, so the adapter set
`Source: "Grant" <no-reply@grantjs.org>` — and the send succeeded. SES parses `Source`
and matches `ses:FromAddress` against the bare address, exactly as the separate
`ses:FromDisplayName` key implies. This was named in the stack plan as _the single most
likely way slice 2 broke delivery_; it did not.

The negative half, by `iam simulate-principal-policy` against the live role:

| From address                         | Resource               | Decision         |
| ------------------------------------ | ---------------------- | ---------------- |
| `no-reply@grantjs.org`               | `identity/grantjs.org` | **allowed**      |
| `ceo@grantjs.org` (same domain)      | `identity/grantjs.org` | **implicitDeny** |
| `ale@logus.graphics` (also verified) | its own identity       | **implicitDeny** |

Row 2 is what the `ses:FromAddress` condition buys over the ARN alone; row 3 is the
finding the slice exists to close — before this, that send was permitted.

## ADR 0002 — the number, and why there is not one

**The import never ran to completion, and the reason has nothing to do with duration.**
The stack plan pre-committed to this outcome ("the import fails for a reason unrelated to
duration — which is the finding, and it reprioritises everything after it").

Five jobs submitted at `department` scale (3,650 entities, 1.53 MiB body, 246 KiB
gzipped). Three reached the worker. All three failed identically, in 4.5–5.8 s:

```
Input validation failed in PermissionService.createPermission:
  1. Field "condition": Invalid condition structure: Invalid input
```

**Reproducible offline, in one line:**

```ts
permissionConditionSchema.safeParse({
  field: 'metadata.department',
  operator: 'eq',
  value: 'compliance',
});
// => success: false, "Invalid condition structure: Invalid input"
```

`cdm-scale-fixtures.ts` generates permission conditions in a shape
`@grantjs/core`'s `permissionConditionSchema` rejects. **No deploy was needed to discover
this**, which is the uncomfortable part: the stack plan's § Four things, item 3 recorded
"Item 8's fixture already exists" on the strength of
`cdm-scale-fixtures.test.ts` asserting every document validates against
`startProjectSyncRequestSchema`. It does — and that is not the same assertion. The request
schema admits the document; the _service_ rejects the condition when it creates each
permission. The gap between the two is where an entire account cycle went.

So **ADR 0002's number remains unobtained**, and slices 12–15 remain blocked on it. What
this cycle established is that the blocker is a fixture defect that CI could have caught,
not a platform limit — see § Follow-ups.

### Ingress, observed

Gzipped ingress works: a 1.53 MiB body compressed to 246 KiB was accepted with
`content-encoding: gzip` and a `202`. The larger profiles were **not** submitted, and
would not have been ingestible: `enterprise` is 12.16 MiB raw and `entropy-bound` 16.99
MiB, both above the 10 MiB `API_JSON_BODY_LIMIT_BYTES` in force here — `body-parser`
inflates before applying the limit, so gzip does not help. That is phase B finding 2 and
slice 6's premise, confirmed from the other side.

Fixture sizes reproduce phase B exactly (1.39 / 12.16 / 16.99 MiB raw), so the generator
is deterministic across machines.

## Findings this deploy produced

### F-1. A rotated `DB_URL` does **not** reach a warm container — the doc comment is wrong

`apps/api/src/lib/secrets/database-url.ts` says:

> "a rotation is picked up within `SECRETS_CACHE_TTL_SECONDS` on a warm container, rather
> than requiring a redeploy"

**It is not.** Observed directly: the platform secret's `DB_URL` was corrected at
09:51:45Z and polled every 45 s for **8 minutes 27 s** against a 300 s TTL. The endpoint
kept answering with the stale connection failing. One forced container replacement and it
worked on the first request.

The mechanism is plain once seen: `createApp()` calls `resolveDatabaseConnectionString()`
**once** and hands the result to `initializeDBConnection()`, which builds a pool. The
resolver's TTL governs `resolve()` calls; it cannot govern a pool built from an earlier
one. Same shape as the caveat slice 7 already records for the credentials it overlays —
which makes this the second instance of one pattern, and worth stating as a rule rather
than twice as an exception.

### F-2. A database failure makes JWKS answer `200 {"keys":[]}`

While the connection was broken, `/.well-known/jwks.json` returned **200 with an empty key
set** rather than an error. `getJwks()` swallows per-key conversion failures, and
`sendJwksResponse` only supplies `onKeyError` when `config.app.isDevelopment` — so in
production the failure is silent. Here the query itself failed and the route still
answered 200.

That is worse than a 500. A relying party fetching JWKS to verify tokens receives a
valid-looking empty key set, rejects every token as unverifiable, and has no signal that
the cause was a database outage. Smoke caught it as `12/13`; nothing else would have.

### F-3. Token `iss`/`aud` are the Function URL, not `APP_URL`

`APP_URL` on the function is `https://edge-proof.grantjs.org`, but issued tokens carry:

```
iss: https://jq5uczn6ucckqghqfeej4d4ora0zdobb.lambda-url.eu-central-1.on.aws
aud: https://jq5uczn6ucckqghqfeej4d4ora0zdobb.lambda-url.eu-central-1.on.aws
```

The issuer is derived from the request rather than from `APP_URL`, and behind CloudFront
the Host the Lambda sees is the origin. An OIDC relying party that follows `iss` to
discover JWKS reaches the Function URL — which refuses every unauthenticated request by
design. The issuer also changes if the Function URL is ever recreated.

### F-4. `project_sync_jobs` rows are not readable immediately after the `202`

A row queried 5 s after its `202` was absent twice out of five; all five existed later.
Not data loss — read-after-write latency. A client that follows its own `202` with a `GET`
can get a `404` for a job that exists. Worth a note in the guide.

### F-5. RDS PostgreSQL 18 refuses unencrypted connections, and the guide is already right

The first migration failed with `no pg_hba.conf entry … no encryption`. The cause was
mine — a connection string without `?sslmode=require`. The guide's example carries it
(`docs/deployment/aws-serverless.md` § the connection string), so this is an operator
error against correct documentation, recorded only because the failure mode is opaque and
the next person will search for the message.

Its second-order effect is the real lesson: because `databaseUrl` renders a
`{{resolve:secretsmanager:…}}` dynamic reference that **CloudFormation resolves at deploy
time**, fixing the upstream secret afterwards did nothing. The platform secret kept the
pre-fix value until written directly. That is byo-database's F6 seen from the other
direction, and it is the same fact: a rotation upstream does not propagate without a stack
update.

## Teardown — both regions, measured

`cdk destroy --all` completed in **~7 minutes**; the out-of-band database, its secret and
its security group were destroyed separately, since the stack deliberately did not create
them.

| Check                                          |   Baseline | After teardown |     |
| ---------------------------------------------- | ---------: | -------------: | --- |
| Stacks, `eu-central-1`                         | CDKToolkit |     CDKToolkit | ✓   |
| Stacks, `us-east-1`                            | CDKToolkit |     CDKToolkit | ✓   |
| RDS instances / clusters                       |      0 / 0 |          0 / 0 | ✓   |
| NAT gateways                                   |          0 |              0 | ✓   |
| Non-default VPCs                               |          0 |              0 | ✓   |
| Lambda functions, `eu-central-1` / `us-east-1` |      0 / 0 |          0 / 0 | ✓   |
| Secrets Manager secrets                        |          0 |              0 | ✓   |
| SQS queues (incl. dead-letter)                 |          0 |              0 | ✓   |
| EventBridge rules                              |          0 |              0 | ✓   |
| ACM certificates, `us-east-1`                  |          0 |              0 | ✓   |
| `grantjs.org` records                          |         20 |             20 | ✓   |

**`us-east-1` was checked explicitly**, which is what phase C's F15 was raised for:
checking the platform region alone once reported clean while `GrantCertificate` was still
standing.

`demo.grantjs.org` and `docs.grantjs.org` — the live records unrelated to this story —
survived untouched, which is why the baseline named them.

### The two known residues, counted rather than described

- **F1, the ACM validation CNAME.** `_c9639e9f24ce38a21df8e4c11c64b266.edge-proof.grantjs.org`
  survived `cdk destroy` and was **removed by hand**, returning the zone to 20 records.
  Phase C's `aws.grantjs.org` record was left in place: it is idempotent per domain and
  that domain may be redeployed.
- **F7, log-group growth.** **+7 this cycle** — `eu-central-1` 113 → 119, `us-east-1`
  14 → 15. One per function per cycle, as predicted, and they outlive the stack. At this
  rate the eu-central-1 count doubles roughly every sixteen cycles; still cosmetic, still
  unbounded, still nobody's job.

## Follow-ups this cycle creates

| #     | Item                                                                                                    | Where it goes                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **The CDM scale fixtures generate permission conditions the schema rejects.** Blocks ADR 0002 outright. | Must be fixed before slice 16, and the fix belongs in CI: assert fixtures against the _service_ validators, not only `startProjectSyncRequestSchema`. |
| **2** | F-1 — `DB_URL` rotation does not reach a warm container; the doc comment says it does.                  | Correct the comment; decide whether the pool should be rebuildable. Same rule as slice 7's credentials.                                               |
| **3** | F-2 — JWKS answers `200 {"keys":[]}` when the database is unreachable.                                  | A security-adjacent defect: verifiers cannot distinguish "no keys" from "could not ask".                                                              |
| **4** | F-3 — token `iss`/`aud` are the Function URL rather than `APP_URL`.                                     | OIDC discovery from `iss` reaches an origin that refuses everything.                                                                                  |
| **5** | F-4 — `project_sync_jobs` rows are not readable immediately after their own `202`.                      | Guide note, or a read-your-writes guarantee.                                                                                                          |

**Slices 12–15 remain blocked.** They were blocked on a number; they are now blocked on
follow-up 1, which is smaller and CI-shaped. That is the reprioritisation the stack plan
said this measurement might force.

---

# ADR 0002's number — obtained 2026-09-11, without a deploy

Slice 12. Cycle 1 spent an account cycle failing to time an import that could not run;
this obtained the number on a developer machine against the e2e PostgreSQL, for nothing,
using `pnpm --filter grant-api measure:cdm-import` — the harness whose absence was the
whole cost of cycle 1.

**Three fixture defects stood between the fixtures and a single completed import**, all of
one shape: a value `startProjectSyncRequestSchema` does not inspect, rejected by a service
the fixtures had never been run through. #422 fixed the first. Slice 12 found the other
two in the first ten minutes of running the harness — `findBy: CdmFindBy.Id` resolvers
carrying generated UUIDs, and a hand-copied tag colour list containing `slate`. Follow-up
1 of cycle 1 is closed, and closed at the level it asked for: three unit assertions for
the known classes, plus `cdm-scale-import.e2e.test.ts`, which imports the `starter`
profile through the real route, queue, worker and services.

## The four points

Each is one run of the harness against the same database on the same machine. Duration is
the rollback snapshot plus the import inside one transaction, matching
`project-sync.job.ts`; it excludes queue latency and the job-row writes that bracket it.

| Profile          |   Entities |       Duration | ms/entity |     Applied |  vs 15 min |
| ---------------- | ---------: | -------------: | --------: | ----------: | ---------: |
| `starter`        |        124 |         2.90 s |      23.4 |         380 |       0.3% |
| `team`           |        620 |        18.22 s |      29.4 |       2,118 |       2.0% |
| `department`     |      3,650 |       191.49 s |      52.5 |      14,416 |      21.3% |
| **`enterprise`** | **28,880** | **3,738.44 s** | **129.4** | **124,348** | **415.4%** |

**The 28,880-entity import takes 62.3 minutes. The ceiling is 15.** Measured, not
extrapolated — which matters, because every extrapolation available before this run was
wrong in the optimistic direction.

## The shape, and why a linear model would have lied

| Model     | Fit                          |     R² | At 28,880 | Crosses 900 s at |
| --------- | ---------------------------- | -----: | --------: | ---------------: |
| Linear    | `t = -116.7 + 132.77 ms · n` | 0.9956 |   3,718 s |        7,653 ent |
| Power law | `t = 4.348e-03 · n^1.319`    | 0.9826 |   3,320 s |       10,734 ent |

Per-entity cost rises **5.5×** across the measured range, 23.4 → 129.4 ms. Phase C's
single point (283 entities, 208.25 s) and its own warning that one point cannot separate
fixed from per-entity cost were both right, and the warning was the important half: a
linear fit through the two smallest profiles alone predicts 891 s at 28,880 — 99% of the
ceiling, comfortably wrong.

## Why it is superlinear: ~105 statements per entity, each getting slower

Statement counts taken from PostgreSQL's own log (`log_statement='all'`) across a whole
run, on the disposable e2e database.

| Profile      | Entities | Statements | Statements/entity | ms/statement |
| ------------ | -------: | ---------: | ----------------: | -----------: |
| `team`       |      620 |     69,130 |             111.5 |        0.329 |
| `department` |    3,650 |    377,602 |             103.5 |        0.613 |

Two facts, and they point at different things:

1. **Statements per entity is flat** (111.5 → 103.5, slightly _down_). So this is **not**
   an N+1 that worsens with scale. It is a fixed, extremely chatty per-entity cost —
   ~105 SQL statements to apply one CDM entity, which projects to **≈3.0 million
   statements** for a 28,880-entity document.
2. **Mean statement latency nearly doubles** (0.329 → 0.613 ms, 1.87×) as the tables grow.
   That is the superlinearity: constant query count against rows that keep accumulating.

The per-entity chattiness is visible in the code — `CdmEntityBuilder.linkDirectGroupsToUser`
issues `userHasGroup` (which itself calls `userExists` and then reads _all_ of a user's
groups) plus `getProjectUserGroups` for every `(user, group)` pair, then filters in
application code. Which of those dominates is not established here; the count and the
latency trend are.

## What this says about the deployed target, without deploying to it

**The import is latency-bound, and this is the measurement that makes a deploy
unnecessary for the decision.** At ~3.0 million statements, every microsecond of
per-statement round trip costs three seconds of job duration:

- local Docker, loopback: 0.33–0.61 ms/statement → 62 min measured
- Lambda → RDS in one region, ~1 ms round trip: **round trips alone are ≈50 min**, before
  any query does work

So the deployed number cannot be better than the local one and is very likely several
times worse. A cycle spent measuring it would move 415% to some larger percentage and
change no decision. **ADR 0002's question is answered: a 28,880-entity import does not
fit inside Lambda's 15-minute ceiling, and does not come close.**

Recorded so that the absence of a cycle-2 deploy here reads as a measurement that made
one unnecessary, rather than as a step skipped. Slice 15's cold-start re-check and slice
16's part C and D proofs still need a deploy, and slice 16 is already that cycle.

## The number that reframes the remedy

At the _small-scale_ per-entity rate — 23.4 ms, before table growth inflates it —
28,880 entities would take **675 s (11.3 min), inside the ceiling**.

The gap between 11.3 and 62.3 minutes is not Lambda's limit being too low. It is ~105
statements per entity against growing tables. ADR 0002's pre-specified remedy is a
Fargate escape hatch, which would run the same 3 million statements somewhere without a
15-minute wall — a correct escape valve and not a fix. Both are defensible; they are
different slices, and the choice is recorded as gate work rather than settled here.

## Attempting the fix, and the arithmetic that stopped it

Gate 3 chose "reduce statements per entity and re-measure" over building the hatch. That
was the right thing to try and the wrong thing to expect, and the number that settles it
was cheap to get.

### What was done

`EntityRepository.existsById` — one statement, replacing the `query({ ids: [id], limit: 1
})` idiom the `*Exists` validators were built on, which costs two (an unconditional
`count(*)` for pagination metadata no existence check reads, plus a row fetch whose
columns nobody looks at). `IEntityExistence` on the nine entity repository ports, and 27
validators converted.

34 further validators were **not** converted: their fetched row is used after the check,
so the fetch is load-bearing. The guard that skips them matches the variable name anywhere
in the file, so it over-skips — some of those 34 are safe conversions it declined to make.
Left conservative deliberately; the arithmetic below is why chasing them is not worth it.

### Measured, on `team` (620 entities)

|        | Statements | Per entity |
| ------ | ---------: | ---------: |
| Before |     34,556 |       55.7 |
| After  |     30,049 |       48.5 |
|        | **−13.0%** |            |

**No wall-clock claim is made, and that is deliberate.** `team` measured 18.22 s on a
fresh database and 22.7–23.3 s on three later runs of the _same code_ — the harness's own
earlier runs leave rows behind, and this import slows down as tables fill. A before/after
timing comparison across runs measures accumulated data as much as the change. The
statement count is the honest metric here; a timing comparison needs a fresh database on
both sides.

### Why 13% was the end of this road, not the start

The remaining profile is still dominated by re-reading the same few rows — the single
project being imported into is read 2,186 times, users 2,628, groups 1,515, roles 1,193,
plus 3,008 surviving `count(*)`s. Suppose a perfect transaction-scoped memo eliminated
**every one** of them:

|                                          | Statements |   Speedup |
| ---------------------------------------- | ---------: | --------: |
| Now                                      |     30,049 |         — |
| Perfect memo, every repeated lookup gone |     19,519 | **1.54×** |
| Needed for 28,880 entities under 900 s   |          — | **4.15×** |
| **Residual gap after a perfect memo**    |            | **2.70×** |

So no amount of de-duplicating lookups reaches the ceiling. What is left after the memo is
irreducible _per-entity_ work — an insert, an audit-log insert, and pivot reads for each
entity, each its own round trip — because **the import applies entities one at a time
through the single-entity service API, and every service call re-validates its inputs.**
That is correct for one HTTP mutation and quadratic-ish for a batch of 28,880.

Reaching 15 minutes means a batch apply path: multi-row inserts, set-based existence
resolution, and no per-entity service round trip. That is an architectural change to the
CDM import, and it is a story rather than a slice inside part E.

### Which reverses the recommendation, and the reversal is the finding

Before this attempt the case against ADR 0002's Fargate hatch was that it treats a symptom
— run the same 3 million statements somewhere without a 15-minute wall. That is still
true. What is now also true, and was not known, is that **removing the symptom is a
project**, and 1.54× is the whole of what the cheap version buys.

So the hatch is the correct near-term answer after all, and for a better reason than the
one ADR 0002 originally gave: not "imports are slow" but "imports are slow for a
structural reason with a measured cost to fix, and a 28,880-entity import is 4.15× over a
wall that no configuration can raise." The 13% is kept because it is free, correct, and
improves every caller of a `*Exists` validator — not because it moves the decision.

---

# Slice 15 — ADR 0003's OpenNext decision, re-checked 2026-09-12

The plan pre-committed to "expected outcome: no code", so that an empty diff would read as
the plan working rather than as work skipped. It is nearly that: two doc comments, an ADR
section, and one measurement tool.

## The conditions, verified rather than inherited

ADR 0003 declines OpenNext _conditionally_ — it exists for ISR cache persistence and image
optimization, and this app uses neither. A conditional decision is only as good as the last
time someone checked the condition, which is what this slice is for.

| Condition                      | Checked by                                                                     | Result                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| No ISR                         | `export const revalidate`, `revalidatePath`, `revalidateTag`, `unstable_cache` | none in app code; the only hits are generated `.next/types` declarations                                       |
| No image optimization          | `next/image` imports, `<Image>` usage, `images` in `next.config.ts`            | none. The single `next/image` reference is the generated `next-env.d.ts` boilerplate; images are plain `<img>` |
| Still GET-only (OAC's premise) | `'use server'`, `app/**/route.ts`                                              | none of either                                                                                                 |

Both conditions hold, so **the decision stands**.

## Boot time — 180 ms median

| Metric | Value                                                          |
| ------ | -------------------------------------------------------------- |
| Runs   | 180, 180, 180, 185, 185 ms (and 175–184 on a seven-run sample) |
| Median | **180 ms**                                                     |
| Next   | 16.3.4                                                         |

By `pnpm --filter grant-web measure:boot`, added in this slice so the next re-check costs
one command.

**This is not a cold-start number and the tool refuses to present it as one.** It measures
time from `node server.js` to the first accepted TCP connection, which is the application's
share of init duration — and it is measurable precisely because
`AWS_LWA_READINESS_CHECK_PROTOCOL=tcp` makes "listening on `AWS_LWA_PORT`" the adapter's
readiness criterion. Phase C's **526–630 ms** was a deployed CloudWatch `Init Duration`
including image pull, runtime init and the adapter itself. Comparing the two directly would
be wrong in both directions; each is a regression signal against its own history. A
deployed re-measurement rides along with slice 16's cycle.

## Two notes on method, because the first two attempts were wrong

**`/dev/tcp` is a bash builtin and this repository's shell is zsh.** A readiness probe
written with it fails on every attempt, and a polling loop around it exhausts its
iterations — producing a suspiciously uniform "7983–8008 ms boot time" that is really the
loop's own duration. The server had in fact been ready in milliseconds and said so in its
log. Recorded because the failure mode looks like data.

**The port is not free the instant the process is killed.** Without a pause between runs,
a connect against a lingering socket is recorded as the next run's boot time. The tool
waits 300 ms.

## What would change the decision

Adopting ISR, or `next/image` optimization becoming load-bearing. Stated in ADR 0003 so a
future reader tests the condition instead of re-arguing the conclusion.

Adding a route handler or a server action would **not** change this decision, but it would
break the Origin Access Control premise recorded in `web-function.ts` — the web Function
URL is IAM-authorized on the grounds that the app serves GET only. That is a different and
more urgent problem, and it is worth knowing the two checks look similar and are not.

---

# Cycle 2 — slice 16, deployed 2026-09-12

The second and last account cycle. Deployed from the trunk at `7d91a256` (slices 1–15
merged), hostname `proof.grantjs.org`.

## Topology, and why this one differs from cycle 1

**Green-field: the stack creates its own VPC, Aurora cluster and container tier.** Cycle 1
used bring-your-own PostgreSQL with no VPC, because ADR 0002's measurement needed the
`project_sync_jobs` row readable from outside and phase C's isolated cluster made that
impossible.

That reason is gone. **ADR 0002's number was obtained offline in slice 12a**, so no import
needs timing here. What slice 16 needs instead is the thing cycle 1's topology could not
host: ADR 0002's Fargate hatch requires a VPC and the container tier, so the green-field
shape is now the necessary one rather than the expensive one.

It is also the shape with no out-of-band database, which removes cycle 1's
`0.0.0.0/0` ingress rule entirely. Job outcomes are read through the polling API — the
supported path — rather than by connecting to the cluster, which sits in isolated subnets
with no route to the internet.

|                    | Cycle 1                                 | Cycle 2                                                   |
| ------------------ | --------------------------------------- | --------------------------------------------------------- |
| Database           | BYO RDS, publicly accessible            | Aurora Serverless v2 this stack creates, isolated subnets |
| VPC                | none                                    | created, **1 NAT gateway**                                |
| Container tier     | none                                    | migrate + sync tasks, one shared cluster                  |
| Public DB ingress  | `0.0.0.0/0:5432`, authorised explicitly | **none**                                                  |
| Job status read by | direct SQL                              | the polling API                                           |

Synth before deploying: **121 resources**, 2 ECS task definitions (migrate + sync), 1 ECS
cluster, 1 Aurora cluster, 1 NAT gateway, 8 Lambda functions.

## Baseline before anything was created

Taken 2026-09-12, immediately before the first `cdk deploy` of this cycle.

| Check                                                       | `eu-central-1`    | `us-east-1`       |
| ----------------------------------------------------------- | ----------------- | ----------------- |
| CloudFormation stacks (`CREATE_COMPLETE`/`UPDATE_COMPLETE`) | `CDKToolkit` only | `CDKToolkit` only |
| CDK bootstrap version                                       | 32                | 32                |
| `rds describe-db-clusters` / `describe-db-instances`        | 0 / 0             | 0 / 0             |
| ACM certificates                                            | none              | none              |
| Log groups                                                  | **50**            | **15**            |

**One pre-existing residue, recorded so this cycle is not blamed for it.** The hosted zone
already contains an orphaned ACM validation CNAME,
`_17d199c9b8df2cc1e725d5274f58c2bf.aws.grantjs.org`, with **no certificate in either
region**. It predates this cycle — cycle 1's teardown either left it or it belongs to an
earlier story. `demo.grantjs.org` and `docs.grantjs.org` are live and unrelated; both must
survive teardown.

## Deviation declared before the run: the body limit

`API_JSON_BODY_LIMIT_BYTES` is raised to **20 MiB** for this cycle only, in
`deploy/aws/.env`. The AWS default is 5 MiB (slice 6), which refuses the 28,880-entity CDM
document — 12.14 MiB decompressed — because `body-parser` applies its limit _after_
inflating. That is the gzip asymmetry slice 6 documented deliberately, and it stands as the
recommendation.

Raised here because part E's proof requires an import that genuinely exceeds Lambda's
15-minute ceiling, and the ingestible profiles do not. Recorded as a measurement deviation,
not a recommendation, and the reason the number in the guide is unchanged.

## Part C — a credential that never touches the template

Proven at synth, before the deploy, which is worth stating because it needs no running
infrastructure:

- The stack **announces** it: `[grant] 1 secret(s) in .../deploy/aws/.env are not part of
this template (AUTH_MFA_SECRET_ENCRYPTION_KEY). Apply with: pnpm --filter
grant-aws-deploy put-secrets`
- `grep -rl "<key value>" cdk.out/` → **no match**. The value is in neither template nor
  any asset.
- The non-secret `API_JSON_BODY_LIMIT_BYTES` _is_ in the template, 4 times — so the grep
  above is discriminating rather than vacuously empty.

`AUTH_MFA_SECRET_ENCRYPTION_KEY` was chosen over a mail credential deliberately: it is
resolver-backed like the others, and it is observable **end to end without a third party**
— if it has not resolved, MFA enrolment cannot encrypt a secret. Cycle 1 already proved SES
delivery under the scoped policy, so nothing here needs to send mail to make its point.

## The first deploy failed, and that is what part F is for

Two findings, neither visible from a template and neither catchable by the 578 deploy tests
that were already green.

### F-1. `stopTimeout: 300` is invalid on Fargate, and CDK synthesises it anyway

```
Resource handler returned message: "Invalid request provided: Create TaskDefinition:
Tasks using the Fargate launch type must have a container stop timeout of less than
120 seconds. (Service: AmazonECS; Status Code: 400; Error Code: ClientException)"
```

Slice 12b set the sync container's `stopTimeout` to 300 s, and the reasoning was sound: a
stop signal arriving mid-import has a transaction to roll back, and rolling back ~1.4 M
statements is not instant. **Fargate caps it at 120.** `MigrateTask` uses exactly 120 and
has deployed since phase C, so the boundary was already in the repository — just never
stated.

`aws-cdk-lib` does not validate the value. It synthesises, it passes every assertion, and
`CreateTaskDefinition` refuses it — so the whole stack rolled back on the first create of
the hatch.

**Correctness never depended on it.** Past the timeout ECS sends `SIGKILL`, the connection
drops, and PostgreSQL rolls the transaction back server-side; a hard-killed import still
leaves no partial state. The timeout only decides whether the process exits cleanly.

Fixed, and **pinned at synth** by a test asserting every Fargate container's `StopTimeout`
is ≤ 120 — written against the launch type rather than this one task, because the
constraint is Fargate's. Restoring 300 fails it. That assertion is what the deploy bought:
the next person pays a test run instead of a rollback.

### F-2. `autoDeleteObjects` does not protect a **failed first create**

```
DELETE_FAILED | AWS::S3::Bucket | Grant/Docs/Bucket
  "The bucket you tried to delete is not empty"
```

The docs bucket already sets `removalPolicy: DESTROY` and `autoDeleteObjects: true`, which
is why `cdk destroy` has always worked. It did not help here. `autoDeleteObjects` installs a
custom resource that empties the bucket on delete, and in a rollback of a _partially
created_ stack that provider is torn down in the same reverse dependency order — so the
bucket outlived its emptier, with 307 objects (18 MiB) already uploaded by
`BucketDeployment`.

The stack landed in **`ROLLBACK_FAILED`**, which does not resolve itself: it needed the
bucket emptied by hand and then `delete-stack`, before any retry was possible.

**Adopter-visible, and on the least forgiving deploy there is — the first one.** Any create
failure after the docs content uploads leaves a stack that cannot roll back or be retried
without manual S3 work. Carried as a follow-on rather than fixed here: the candidates are
ordering the deployment after everything that can fail, or accepting the manual step and
documenting it, and choosing between them is not a line in a proof slice.

## Deploy (second attempt, with F-1 fixed)

|                    |                                                                            |
| ------------------ | -------------------------------------------------------------------------- |
| `cdk deploy --all` | ✅ `GrantCertificate` (no changes), ✅ `GrantPlatform`                     |
| API Function URL   | `https://bfe2jz5mzemly4yqsg2mrimzoy0rwrhu.lambda-url.eu-central-1.on.aws/` |
| Distribution       | `d1kixyyk52bchz.cloudfront.net` → `proof.grantjs.org`                      |
| Smoke              | **13/13 checks, 10/10 behaviours**                                         |
| DNS                | `proof.grantjs.org` A + AAAA created; `demo` and `docs` untouched          |

## Part C — the credential, confirmed at runtime

`pnpm --filter grant-aws-deploy put-secrets` → `Applied 1 key(s):
AUTH_MFA_SECRET_ENCRYPTION_KEY`, `Preserved 2 existing key(s): DB_URL,
ORIGIN_VERIFY_SECRET`. The script also warns that warm execution environments hold the
previous payload until the resolver TTL expires, which is the kind of thing that otherwise
reads as a failure.

| Check                                     | Command                                 | Result                                                                                        |
| ----------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| Value in the live function configuration  | `aws lambda get-function-configuration` | **0 occurrences**; `AUTH_MFA_SECRET_ENCRYPTION_KEY` is not among its 26 environment variables |
| Value in the deployed template            | `aws cloudformation get-template`       | **0 occurrences**                                                                             |
| Value in the platform secret              | `aws secretsmanager get-secret-value`   | present, and an **exact match** for the env file                                              |
| **Positive control** — a non-secret value | `grep 20971520`                         | **1** occurrence in the function configuration, **4** in the template                         |

**The positive control is not decoration.** The first run of this check extracted the key
with `grep AUTH_MFA .env`, which also matched a _comment_ mentioning the key — so the
"0 occurrences" results were grepping for comment text and would have been zero whatever
the template contained. Vacuous evidence that looked like proof. The control is what makes
the negatives mean something: the same grep, on the same files, finds the non-secret 1 and 4
times.

The key is a 64-character hex value, verified as such before use.

## Part D — the presigned path on real S3, and ADR 0007's six deferred assertions

ADR 0007 deferred six enforcement assertions because LocalStack community does not verify
SigV4 at all (divergence index entry 9). All six now have observations, against
`grantplatform-grantuploadsbucketcefff261-…s3.eu-central-1.amazonaws.com`:

| #   | Assertion                                           | Observed                                                  |
| --- | --------------------------------------------------- | --------------------------------------------------------- |
| 1   | The URL is the store's, not this API's              | absolute S3 host ✅                                       |
| 2   | A body larger than the URL committed to is refused  | **403** ✅                                                |
| 3   | The URL against another tenant's prefix is refused  | **403** ✅                                                |
| 4   | A forged signature is refused                       | **403** ✅                                                |
| 5   | A content type other than the signed one is refused | **403** ✅                                                |
| 6   | An expired URL is refused                           | **403 `AccessDenied`** at 310 s against a 300 s window ✅ |

Plus the mint-side refusal: a 50 MiB request is rejected before any URL exists — `File size
exceeds maximum of 5MB`.

**And the upload itself works: 4.50 MiB PUT straight to S3, `200`, object present in the
bucket at `users/<id>/picture.jpg`, 4,718,592 bytes.** The base64 path would have needed
6.00 MiB of JSON body against the AWS target's 5 MiB default — so this is the case that
path could not carry, which is what part D existed to show.

**The confirm step then failed, deterministically. See F-3.**

### F-3. Picture uploads cannot complete on S3 — `getUrl()` returns 1275 characters into a 500-character column

**The single most valuable thing this cycle produced, and it is not a slice 9–11 defect.**

```
Input validation failed in UserService.updateUser:
  1. Field "input.pictureUrl": Too big: expected string to have <=500 characters
```

The upload succeeded. The object is in the bucket. The confirm then failed, and it will fail
every time:

|                                                 |                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `users.picture_url`                             | `varchar(500)`, and `users.schemas.ts` enforces `z.string().max(500)` |
| `S3StorageAdapter.getUrl()` with no `publicUrl` | a **presigned GET** URL, `expiresIn: 3600`                            |
| Measured length                                 | **1275 characters** (`aws s3 presign`, same bucket and region)        |
| `STORAGE_S3_PUBLIC_URL` on this deploy          | **unset**                                                             |

**This is not the presigned-upload path's bug.** `uploadMyUserPicture` — the _base64_ path,
which has shipped since long before this story — writes `getUrl()`'s result to the same
column. Any picture upload against an S3 bucket without `publicUrl` fails the same way. It
has been latent because no previous cycle uploaded a picture on the AWS target: cycle 1 was
part A and ADR 0002.

**The 500-character limit is the symptom; the design error is storing the URL at all.** A
presigned GET expires in an hour, so even with a wider column the stored `pictureUrl` would
be dead by the next request. The column wants the **path**, with presigning done on read.

**There is no configuration workaround on this target.** `STORAGE_S3_PUBLIC_URL` would
produce a short, non-expiring URL — but the uploads bucket blocks all public access and is
deliberately _not_ a CloudFront origin (`storage-bucket.ts`: "objects are served through the
API rather than from the edge"). So an adopter cannot set it without first giving the bucket
a public front, which that construct exists to avoid.

Carried as a follow-on and **not fixed here**: storing paths and presigning on read changes
the user, project-user and membership services, three GraphQL result types, and the web
app's image handling. That is a story. What slice 16 owed was to find it, and the only
reason it was findable is that ADR 0007's assertions were run against real S3 instead of an
emulator that cannot refuse anything.

**It also validates slice 11's client design in an unwelcome way.** The web flow treats
"bytes stored, confirm failed" as a distinct `unclaimed` failure precisely so a user is not
told an upload succeeded when nothing was recorded. On this target that path is not an edge
case — it is every upload.

## Part E — ADR 0002's hatch, dispatched and running on Fargate

The 28,880-entity document was submitted through the public API, gzipped:

|         |                                                                         |
| ------- | ----------------------------------------------------------------------- |
| Payload | **12.14 MiB raw / 2.08 MiB gzipped**, `content-encoding: gzip`          |
| Enqueue | **202** — so gzipped ingress works at this scale, with the raised limit |
| Job     | `bcadf61c-c016-4eba-8831-99f6a28afdbd`                                  |

**The jobs function dispatched rather than executed, which is the whole of what slice 12b
built:**

| Observation            | Value                                                                      |
| ---------------------- | -------------------------------------------------------------------------- |
| Task definition        | `GrantPlatformGrantSyncTaskDefinition…:1` — the **sync** task, not migrate |
| Container              | `Sync`                                                                     |
| Status                 | `RUNNING`                                                                  |
| Container overrides    | exactly `GRANT_SYNC_JOB_ID`, `GRANT_SYNC_JOB_SCOPE`                        |
| Job id in the override | `bcadf61c-…` — **the same row the API returned**                           |

Cluster is the migrate task's, shared as designed: one `AWS::ECS::Cluster` in the account.

An import Lambda could not have finished is therefore running somewhere without a
15-minute wall, told which row to apply and reading the 12 MiB document from the database
rather than being handed it. Nothing about the job envelope changed to achieve it.

## Slice 15 — the deployed cold start

`Init Duration` from CloudWatch, one hour window:

| Function |   n |        min |     median |     max |
| -------- | --: | ---------: | ---------: | ------: |
| **Web**  |  10 | **584 ms** | **662 ms** | 2321 ms |
| API      |   2 |    3961 ms |    3961 ms | 4948 ms |

**No regression that would buy anything by switching to OpenNext.** Phase C measured
526–630 ms; the median here is 662 ms and the minimum 584 ms — the same order, with the
2321 ms outlier being a first init after deploy. Slice 15's local proxy measured the
application's share at 180 ms, and these numbers are consistent with that plus image pull
and runtime init. ADR 0003's decision stands on a deployed number as well as a local one.

The API function's 4–5 s is not slice 15's subject and is recorded only because it is
visible here: it builds the whole object graph, a database pool and Apollo at init, where
the web function starts a Next server.

### A tooling correction, recorded because it nearly became a finding

`aws logs filter-log-events` **without `--start-time` returned zero events** from both
function log groups, while `describe-log-streams` showed streams whose `storedBytes` was
also `0`. Two independent signals agreeing on "nothing is logged", against a function
CloudWatch metrics showed had been invoked **45 times**.

It was about to be written up as an observability defect — _no application logs reach
CloudWatch_ — which would have been false and alarming. `get-log-events` against a single
named stream returned the events immediately (`▲ Next.js 16.3.4`, `EXTENSION Name:
lambda-adapter State: Ready`). `filter-log-events` needs an explicit window, and
`storedBytes` lags by hours.

Both functions also use **explicit log groups** (`GrantPlatform-GrantWebLogs…`), not
`/aws/lambda/<name>` — so the first query failed with `ResourceNotFoundException` on a log
group that was never going to exist. Three wrong tools in a row, each of whose output was a
plausible-looking zero.

### Part E completed — 220.4 minutes on Fargate, exit code 0

```
STOPPED  EssentialContainerExited  exitCode: 0
started 2026-09-12T23:22:07+02:00 -> stopped 2026-09-13T03:02:31+02:00
```

The container's own closing lines:

```
{"module":"AwsSecretsManagerResolver","msg":"Loaded secrets from AWS Secrets Manager",
 "secretId":"GrantPlatformSecretCBEA56FA-…",
 "keys":["AUTH_MFA_SECRET_ENCRYPTION_KEY","DB_URL","ORIGIN_VERIFY_SECRET"]}
{"module":"DatabaseConnection","msg":"Database connection initialized"}
{"msg":"Running project-sync in a container runtime","jobRecordId":"bcadf61c-…"}
{"msg":"project-sync complete","jobRecordId":"bcadf61c-…"}
{"module":"DatabaseConnection","msg":"Database connection closed"}
```

|                                         |                        |
| --------------------------------------- | ---------------------- |
| Deployed                                | **220.4 min** (3.67 h) |
| Local (slice 12a, same 28,880 entities) | 62.3 min               |
| **Deployed ÷ local**                    | **3.54×**              |
| **Deployed ÷ Lambda's ceiling**         | **14.7×**              |

**ADR 0002's hatch is proven end to end**: an import that would have died at 15 minutes ran
to completion in 3 hours 40 minutes on a runtime with no wall, through the unchanged job
envelope, and the process exited 0.

**And the deployed number settles the argument slice 12a used to avoid spending a cycle on
it.** That slice declined a deploy on the reasoning that Lambda→RDS is latency-bound and
could only be _worse_ than local — so 415% of the ceiling would become a larger number and
change no decision. It is **3.54× worse**: 1470% of the ceiling. The reasoning was right, and
is now measured rather than asserted.

Aurora capacity was also watched through the run: **1.5 ACU at minute 60, 2.0 ACU at minute
157**, rising rather than flat. That is slice 12a's superlinearity observed from the database
side — per-entity cost grows as the tables fill, so the back half of an import is heavier
than the front. It is why the deployed multiple is 3.54× rather than the ~1.5× a pure
round-trip model predicts.

### Part C, confirmed at runtime as well

The line above is the observation part C asked for and the synth-time checks could not give:
`AwsSecretsManagerResolver` **loaded `AUTH_MFA_SECRET_ENCRYPTION_KEY` from Secrets Manager**
at container start, in a process whose environment does not contain it. The credential
travelled the resolver and nothing else — absent from the template, absent from the function
configuration, present in the secret, and read through `ISecretResolver` at boot.

## Cycle 2 teardown — both regions, measured

Timings from CloudFormation's own stack events, not from the CLI's wall clock:

| Stack              | Region         | `DELETE_IN_PROGRESS` → `DELETE_COMPLETE` |              |
| ------------------ | -------------- | ---------------------------------------- | ------------ |
| `GrantPlatform`    | `eu-central-1` | 06:26:35 → 06:50:53                      | **24.3 min** |
| `GrantCertificate` | `us-east-1`    | 06:50:58 → 06:51:19                      | **0.35 min** |
| **Total**          | —              | 06:26:35 → 06:51:19                      | **24.7 min** |

**Cycle 1 tore down in ~7 minutes; this one took 24.7.** The difference is not a
regression — cycle 1 used an out-of-band database and deleted it separately, so its
7 minutes excluded the slowest resource in the stack. Cycle 2 created Aurora in-stack,
and Aurora deletion dominates the 24.3.

For the record, the same events give the create side: `GrantPlatform` 20:59:30 → 21:09:36
(**10.1 min**), `GrantCertificate` 20:46:51 → 20:49:34 (**2.7 min**).

| Check                                   |   Baseline | After teardown |     |
| --------------------------------------- | ---------: | -------------: | --- |
| Stacks, `eu-central-1`                  | CDKToolkit |     CDKToolkit | ✓   |
| Stacks, `us-east-1`                     | CDKToolkit |     CDKToolkit | ✓   |
| RDS clusters / instances                |      0 / 0 |          0 / 0 | ✓   |
| ACM certificates, both regions          |      0 / 0 |          0 / 0 | ✓   |
| Secrets Manager, incl. planned deletion |          0 |              0 | ✓   |
| ECS clusters                            |          0 |              0 | ✓   |
| SQS queues                              |          0 |              0 | ✓   |
| `grantjs.org` records                   |         20 |             20 | ✓   |
| Log groups, `eu-central-1`              |        119 |        **135** | ✗   |
| Log groups, `us-east-1`                 |         15 |         **16** | ✗   |

**Secrets Manager was checked with `--include-planned-deletion`**, which the cycle-1 table
did not do. A secret in its recovery window is invisible to a plain `list-secrets` while
still holding its name against re-creation, so "0" from the default call would not have
been evidence. It is genuinely 0.

`demo.grantjs.org` and `docs.grantjs.org` survived untouched — both still plain `A`
records to `87.171.69.148`, both still resolving. Worth stating precisely: all three
unrelated `A` records are **plain** records, not aliases, so no deleted distribution
could have left them dangling.

### F-1, again, exactly as predicted

`_0bd02f69964fcd504b89a5509e330b22.proof.grantjs.org` survived `cdk destroy` and was
**removed by hand**, returning the zone to 20 records. That is now two cycles out of two,
which retires the "assume it recurs" hedge in the slice spec — it recurs.

Phase C's `_17d199c9b8df2cc1e725d5274f58c2bf.aws.grantjs.org` was **left in place**, the
same call cycle 1 made. One note against that decision, since the account now contradicts
its stated reason: cycle 1 justified keeping it because "that domain may be redeployed",
but there are **zero ACM certificates in either region**, so the record currently validates
nothing. It is inert either way; removing another story's artefact is not this slice's call.

### F7 — the cycle-1 model was wrong, and the correction is larger than the delta

Cycle 1 recorded "+7 this cycle … one per function per cycle" and projected that
`eu-central-1` "doubles roughly every sixteen cycles". Cycle 2 adds **+16 retained**
(119 → 136 during the cycle, 136 → 135 after teardown), which is not +7, and the
per-cycle figure is not a constant — it tracks how many log-group-bearing constructs the
template has, and this cycle added Fargate sync on top of everything cycle 1 had.

Two sharper facts the cycle-1 framing missed:

**`cdk destroy` reclaims essentially nothing.** 136 → 135. One group out of seventeen.
The residue is not a rounding error around teardown; teardown is simply not a factor.

**The account has no clean floor to return to.** Of 135 groups in `eu-central-1`,
**134 are Grant-owned**; the only unrelated one is `/aws/rds/proxy/proxy`. In `us-east-1`
it is 15 of 16, the exception being an unrelated `/aws/lambda/scrape`. So the "baseline"
both cycles measured against — 119 and 15 — was itself pure residue from earlier cycles,
not a floor. The true floor is **1 per region**.

Grouping the survivors by construct recovers the account's whole deploy history, because
each cycle leaves one group per construct under a fresh physical suffix:

| Construct (logical)                          | Distinct physical names |
| -------------------------------------------- | ----------------------: |
| `CustomCrossRegionExportReader`              |                      20 |
| `CustomS3AutoDeleteObjects`                  |                      19 |
| `CustomCDKBucketDeployment`                  |                      19 |
| `GrantMigrateTaskDefinition/MigrateLogGroup` |                      15 |
| `GrantApiLogs`                               |                      15 |
| `AWSCDKTriggerCustomResourceProvider`        |                      14 |
| `GrantWebLogs`                               |                      12 |
| `GrantJobsLogs`                              |                       8 |
| `LogRetention`                               |                       5 |
| `GrantMigrateTriggerRunner`                  |                       5 |
| **`GrantSyncTaskDefinition/SyncLogGroup`**   |                   **2** |

**The sync row is the control that makes the rest of the table trustworthy.** Sync exists
only in this story, and the platform stack was deployed exactly twice this cycle — the
F-1 failure and the successful retry. It shows exactly 2. The one-group-per-construct-per-deploy
reading therefore is not inferred from the naming convention alone; it is confirmed against
a construct whose deploy count is known independently.

Still cosmetic, still unbounded, still nobody's job — but now with a measured growth
mechanism rather than a projected rate.

### F-4. `cdk destroy` leaves 2.40 GB of container images, which cycle 1 never counted

A residue class absent from the cycle-1 table entirely:

| Residue                                |           `eu-central-1` |  `us-east-1` |
| -------------------------------------- | -----------------------: | -----------: |
| ECR images in the bootstrap repo       | **38 / 2,404,779,047 B** |      0 / 0 B |
| Objects in the bootstrap assets bucket |       46 / 132,456,755 B | 6 / 25,987 B |

These live in the **CDKToolkit bootstrap** repo and bucket, not in `GrantPlatform`, which
is exactly why `cdk destroy --all` does not touch them and why a stacks-and-services
checklist reports a clean account while 2.4 GB accumulates. Unlike log groups this one has
a non-trivial bill (ECR at $0.10/GB-month) and grows by roughly a full image set per
deploy — 38 images for an account that has run ~15–20 platform cycles.

It is a bootstrap-hygiene gap rather than a template defect, so it does not belong to any
construct in `deploy/aws`. Raised as follow-on 16.
