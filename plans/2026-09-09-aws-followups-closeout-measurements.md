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
