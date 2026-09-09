# Measurements — bring-your-own PostgreSQL

Evidence for [`2026-09-05-byo-database-stack.md`](./2026-09-05-byo-database-stack.md)
slice 5, the only slice whose evidence is a deploy rather than a diff. Slices 1–4 are
verified by CI and reviewed as diffs; nothing below restates them.

Written **before** the first deploy, in phase C's shape: baseline first, then wall
clock, then the observable check with its output, then what teardown left behind.
A number recorded after the fact is a number nobody can check.

- **Account**: `972374872669`, profile `grant-cdk`, role `GrantCdkDeploy`
- **Regions**: `eu-central-1` (platform), `us-east-1` (`GrantCertificate` — CloudFront
  serves certificates from nowhere else)
- **Zone**: `grantjs.org.` (`Z0558018P345EAI1WA8P`), the zone phase C used
- **Hostnames**: `byo-vpc.grantjs.org` (topology B), `byo-vpcless.grantjs.org` (topology C)
- **Stack at**: slice 4, `d4bcadc2`

## Why two topologies and not one

They fail differently, and the guide will claim both.

- **B** — the adopter's VPC, the database inside it, the Fargate one-shot migrating.
- **C** — no VPC at all: the functions run outside one, there is no NAT gateway, and
  the migration is `pnpm --filter grant-aws-deploy migrate`. Removing the NAT gateway
  is the reason this topology exists, so the cost delta is part of the evidence rather
  than a footnote.

## Baseline before anything was created

Taken 2026-09-06, before the first `cdk deploy` of this story, so teardown has
something to be measured back to. The plan records the account as "at baseline as of
2026-09-05 with two known residues"; this confirms it independently.

| Check                                                       | `eu-central-1`    | `us-east-1`       |
| ----------------------------------------------------------- | ----------------- | ----------------- |
| CloudFormation stacks (`CREATE_COMPLETE`/`UPDATE_COMPLETE`) | `CDKToolkit` only | `CDKToolkit` only |
| CDK bootstrap version                                       | 32                | 32                |
| `rds describe-db-instances`                                 | none              | —                 |
| `rds describe-db-clusters`                                  | none              | —                 |
| `ec2 describe-nat-gateways` (available)                     | none              | —                 |
| `ec2 describe-vpcs` (non-default)                           | none              | —                 |
| `lambda list-functions`                                     | 0                 | —                 |
| `secretsmanager list-secrets`                               | none              | —                 |

The default VPC `vpc-1d259574` (`172.31.0.0/16`) is pre-existing and is **not** part of
this story's footprint; it is where the out-of-band databases live.

Commands, so the teardown check can be the same ones:

```sh
export AWS_PROFILE=grant-cdk
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --region eu-central-1 --query 'StackSummaries[].StackName' --output text
aws rds describe-db-instances --region eu-central-1 --query 'DBInstances[].DBInstanceIdentifier' --output text
aws rds describe-db-clusters  --region eu-central-1 --query 'DBClusters[].DBClusterIdentifier' --output text
aws ec2 describe-nat-gateways --region eu-central-1 --filter Name=state,Values=available \
  --query 'NatGateways[].NatGatewayId' --output text
aws ec2 describe-vpcs --region eu-central-1 --query 'Vpcs[?IsDefault==`false`].VpcId' --output text
aws lambda list-functions --region eu-central-1 --query 'length(Functions)' --output text
aws secretsmanager list-secrets --region eu-central-1 --query 'SecretList[].Name' --output text
```

## The structural half, already true at synth

From slice 4's committed templates, before any deploy. This is what the deploy is
being asked to confirm rather than establish.

|                                       | green-field        | topology B   | topology C |
| ------------------------------------- | ------------------ | ------------ | ---------- |
| Resources                             | 112                | 77           | 60         |
| `AWS::RDS::*`                         | cluster + instance | 0            | 0          |
| `AWS::EC2::VPC`                       | 1                  | 0 (imported) | 0          |
| `AWS::EC2::NatGateway`                | 1                  | 0            | 0          |
| `AWS::EC2::SecurityGroupIngress`      | —                  | 1            | 0          |
| `AWS::ECS::TaskDefinition`            | 1                  | 1            | 0          |
| Functions with `VpcConfig`            | api, jobs          | api, jobs    | none       |
| `AWS::Events::Rule`                   | 6                  | 6            | 6          |
| plaintext `postgresql://` in template | —                  | 0            | 0          |

## Owed by this slice, and not obtainable at synth

Each of these is a question CI cannot answer. Recorded here as open until it has an
observation next to it.

1. **Both topologies serve.** `pnpm smoke` green against a live deploy of each.
2. **The migration converges on the first deploy** in topology B (Fargate), and the
   operator command converges in topology C.
3. **The RLS precondition** (§ Risks row 3). `migrate.js` runs the RLS role grant and
   the core seed, so a managed Postgres that restricts role creation fails there.
   Whatever the two providers do is a measurement — record it either way.
4. **The NAT-gateway cost delta** for topology C versus the green-field floor.
5. **F6 — rotation.** Rotate the upstream secret, redeploy unchanged, and record
   whether the platform secret's `DB_URL` moved. The claim under test is that it does
   **not**, because a rotation changes nothing in the template and so produces no
   resource update. Also: does a stack update that _does_ modify the platform secret
   overwrite an out-of-band write, and what does it do to `ORIGIN_VERIFY_SECRET`?
6. **F5 — a `"` in the referenced secret.** The value is substituted textually into a
   JSON document at deploy time. Does CloudFormation merely break, or can the quote
   close `DB_URL` and open another key?
7. **Teardown to baseline**, both regions, both external databases, measured with the
   commands above.

## Topology B — the adopter's VPC

Deployed 2026-09-08 from slice 4 (`d4bcadc2`), `byo-vpc.grantjs.org`.

**The adopter's infrastructure, created out of band** as a separate CloudFormation
stack (`adopter-infrastructure`) so that nothing in it could be confused for something
the Grant stack made: VPC `10.42.0.0/16`, one public subnet, **two private subnets**, an
internet gateway, a NAT gateway with an EIP, a database security group, and RDS
PostgreSQL `grant-byo-vpc` inside the private subnets, not publicly accessible.

Private subnets **with** a NAT gateway is not incidental. A Lambda ENI gets no public
IP, so functions placed in a subnet whose only route out is an internet gateway have no
egress at all — they cannot reach Secrets Manager or ECR, and the failure looks like a
database problem when it is a routing one. This is the shape an adopter bringing their
own VPC actually needs, and the guide has to say so.

**A template bug worth recording, because the error does not say what is wrong.** The
security group description contained an apostrophe, and EC2 rejected the whole stack:

```
Invalid security group description. Valid descriptions are strings less than 256
characters from the following set:  a-zA-Z0-9. _-:/()#,@[]+=&;{}!$*
```

Not a Grant defect — the harness's — but the class is familiar: a value that
synthesizes cleanly and is refused at create.

### Deploy

|                               |                                                       |
| ----------------------------- | ----------------------------------------------------- |
| `cdk deploy --all` wall clock | **7 m 31 s** (`GrantPlatform` 254.3 s; total 449.6 s) |
| Deployed resources            | **79**                                                |
| Smoke                         | **13/13 checks, 10/10 behaviours**                    |

### The migration converged on the first deploy

The claim gate 1 decision 2 rests on, and the one that cannot be tested at synth. From
the Fargate task's log group, mid-deploy:

```
{"level":"info","time":"2026-09-08T11:38:33.573Z","msg":"Database bootstrap complete"}
{"level":"info","time":"2026-09-08T11:38:33.575Z","module":"DatabaseConnection","msg":"Database connection closed"}
```

Deploy ran 11:33:32 → 11:41:03; the migration finished at 11:38:33, inside it. No second
deploy, no manual step. The database had never been touched before this.

### The security-group rule slice 3 predicted, at deploy time

Slice 3 resolved the plan's open question by synthesizing: `SecurityGroup.fromSecurityGroupId`
left mutable _does_ emit an `AWS::EC2::SecurityGroupIngress` against a group CDK does
not own. Confirmed on the live group:

```
[{ "Port": 5432, "Src": "sg-06f5ecdf1cb244249", "Cidr": null, "Desc": "Grant database clients" }]
```

Source is the Grant client group **by identity**, not a CIDR, written into the
adopter's group — so topology B has no manual security-group edit in the middle of a
deploy, which is what would have turned a supported path back into a plausible-looking
one.

### Confirmed against the live account

| Claim                                         | Observed                                              |
| --------------------------------------------- | ----------------------------------------------------- |
| Stack creates no VPC and no database          | `AWS::EC2::VPC` + `AWS::RDS::*` in stack = **0**      |
| API and jobs functions inside the adopter VPC | both report `VpcConfig.VpcId = vpc-02258960347a0d309` |
| Web function deliberately outside             | `VpcConfig.VpcId = None`                              |
| Fargate one-shot present                      | `AWS::ECS::TaskDefinition` = **1**                    |

### The API reached the brought database

`--register` returned `201, account=2c268ea3-…` against a database in the adopter's
private VPC that this stack neither created nor migrated by hand.

One check failed on the first run — `Web app at the root — threw: fetch failed` — and
passed on a retry two minutes later, alongside `curl` returning `307 → /en`. A new
CloudFront alias settling, not a defect; recorded rather than quietly re-run.

## Teardown

| Step                                 | Wall clock                 |
| ------------------------------------ | -------------------------- |
| `cdk destroy --all`, topology C      | **5 m 59 s**               |
| `cdk destroy --all`, topology B      | **25 m 24 s**              |
| `adopter-infrastructure` delete      | included in the wait below |
| RDS instance delete + security group | included in the wait below |

Topology B's destroy taking four times topology C's is the VPC: ENIs attached to the
Lambda functions have to be released before the security groups can go, and CDK waits
for it.

### Both regions measured back to baseline

Same commands as § Baseline, so the comparison is like-for-like.

| Check                             | `eu-central-1`    | `us-east-1`       |
| --------------------------------- | ----------------- | ----------------- |
| CloudFormation stacks             | `CDKToolkit` only | `CDKToolkit` only |
| `rds describe-db-instances`       | none              | —                 |
| `rds describe-db-clusters`        | none              | —                 |
| `ec2 describe-nat-gateways`       | none              | —                 |
| `ec2 describe-vpcs` (non-default) | none              | —                 |
| `ec2 describe-addresses` (EIPs)   | none              | —                 |
| `lambda list-functions`           | 0                 | 0                 |
| `secretsmanager list-secrets`     | none              | —                 |
| `cloudfront list-distributions`   | none              | —                 |

Both external databases are gone, and they were counted in the same check: a story
about not creating a database must not leave one running.

### Phase C's finding F1 reproduced, and was cleaned up

`cdk destroy` strands the ACM validation CNAME. Two were left:

```
_4fd6cc4cc15f0f7937e0e8ccd3932c70.byo-vpc.grantjs.org.      CNAME
_e31a0a666d0eb54cc742db14f2ecca8a.byo-vpcless.grantjs.org.  CNAME
```

Deleted by hand; the zone holds no `byo-vpc*` records. This is a known,
already-recorded defect in the certificate construct rather than anything this story
introduced — but it reproduces on every deploy, and two more phases of it is two more
pairs of records nobody owns.

## Open items this slice could not close

Both were blocked by tooling policy in this environment, not by the design, and both
concern writing to the platform secret:

1. **The out-of-band rotation workaround.** Writing `DB_URL` straight into the platform
   secret should let the resolver pick it up within `SECRETS_CACHE_TTL_SECONDS` (300 s)
   with no deploy. Reasoned, unmeasured. The guide must not present it as observed.
2. **F5 — a `"` inside the referenced secret.** Whether CloudFormation merely breaks, or
   the quote can close `DB_URL` and open another key inside the platform secret. Slice 1
   refuses such a literal at synth; what a _referenced_ secret does is still unknown.

## Topology C — no VPC, no NAT

Deployed 2026-09-08 from slice 4 (`d4bcadc2`), `byo-vpcless.grantjs.org`.

**Database, created out of band and deliberately not by this stack.** RDS PostgreSQL
`grant-byo-vpcless`, `db.t4g.micro`, publicly accessible, `eu-central-1`.

**RDS refused the first database name**, which is worth recording because it is the
repo's own guard being right:

```
InvalidParameterValue: DBName grant cannot be used. It is a reserved word for this engine
```

`validateDatabaseName` (`lib/config/validate.ts`) refuses exactly this at synth, and its
comment says it was "found by deploying, not by synthesizing". Independently confirmed;
`grant_db` — the construct's own default — is what RDS accepts.

### The RLS precondition (§ Risks row 3), answered for RDS

```
select rolcreaterole, rolsuper from pg_roles where rolname = current_user;
 t | f
```

The RDS master user is **not** a superuser but **may create roles**, which is what
`grant-rls-login-role.lib.ts` needs. So on RDS the precondition holds without
`DB_GRANT_ROLE_URL`. This is one provider, not a general result — a managed Postgres
that withholds `CREATEROLE` still fails at the seed, and the guide says so.

### The operator migrate command, against a real database

`pnpm --filter grant-aws-deploy migrate -c dbUrlSecretArn=…`, **1 m 46 s** including
building the image locally. Verified directly against the instance afterwards:

| Check                     | Result                             |
| ------------------------- | ---------------------------------- |
| Tables in `public`        | **110**                            |
| RLS login role            | `grant_app_restricted` **present** |
| Tables with `rowsecurity` | **28**                             |
| `permissions` rows seeded | **67**                             |
| `roles` rows seeded       | **6**                              |

This is gate 1 decision 2 discharged: the VPC-less topology has a migration path that
is a command, not a paragraph.

### Deploy

|                               |                                                       |
| ----------------------------- | ----------------------------------------------------- |
| `cdk deploy --all` wall clock | **7 m 44 s** (`GrantPlatform` 244.6 s; total 463.3 s) |
| Deployed resources            | **61**                                                |
| Smoke                         | **14/14 checks, 10/10 behaviours**                    |

### The structural claims, confirmed against the live account rather than the template

| Claim                                           | Observed                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| No VPC created                                  | `AWS::EC2::VPC` in stack = **0**                                   |
| No NAT gateway                                  | `AWS::EC2::NatGateway` in stack = **0**                            |
| No database created                             | `AWS::RDS::*` in stack = **0**                                     |
| Functions outside a VPC                         | all six Lambdas report `VpcConfig.VpcId = None`                    |
| No Fargate migration                            | `AWS::ECS::TaskDefinition` = **0**                                 |
| Recurring work intact                           | `AWS::Events::Rule` = **6**                                        |
| `DB_URL` absent from every function environment | no match for `DB_URL` or `postgres` in any `Environment.Variables` |

The one NAT gateway visible in the account during this window belonged to
`adopter-infrastructure`, topology B's stand-in — checked by tag rather than assumed.

### The API really reached the brought database

The read-only checks do not prove this; a write does. `--register` returned
`201, account=39fc9716-…`, and the row is in the RDS instance:

```
select count(*) from accounts;  ->  1
select count(*) from users;     ->  2   (the seeded system user, plus the registered one)
```

### The NAT-gateway delta, which is why this topology exists

Green-field runs one NAT gateway; topology C runs none. At eu-central-1 on-demand
pricing that is **~$32.40/month** in hourly charges alone (\$0.045/h × 730), before data
processing — and it is the largest fixed cost in the target, present whether or not a
request is served. Topology C also drops the Aurora cluster, but that is the point of
bringing your own database rather than a property of the network shape.

Structurally: **61 deployed resources against green-field's 112**.

### F6 — rotation, confirmed exactly as documented

The claim under test was that a dynamic reference is **copied, not linked**, so
rotating the upstream secret does not reach the platform secret and `cdk deploy` does
not fix it.

1. Platform secret `DB_URL` ended `…/grant_db?sslmode=require`.
2. Upstream secret rotated to a value ending `…&application_name=ROTATED`.
3. `cdk deploy` re-run with identical context → **`GrantPlatform (no changes)`,
   deployment time 0 s**, both stacks.
4. Platform secret `DB_URL` re-read: **still ends `?sslmode=require`; contains
   `ROTATED` = False**.

A rotation changes nothing in the template, so there is no resource update, so there is
no re-resolution. An operator who rotates and redeploys sees success and keeps the old
credential. This is the wording slice 1 shipped, and it is correct.

**Not verified: the documented workaround.** Writing `DB_URL` straight into the
platform secret and waiting out `SECRETS_CACHE_TTL_SECONDS` (300 s) should let the
resolver pick it up with no deploy. The `secretsmanager put-secret-value` call against
the platform secret was blocked by tooling policy in this environment, twice, so the
claim is **reasoned but unmeasured**. It should not be stated in the guide as though it
were observed. Carried as an open item.

**Also not verified: F5**, a `"` inside the referenced secret. Same reason.
