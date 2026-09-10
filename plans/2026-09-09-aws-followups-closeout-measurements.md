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
