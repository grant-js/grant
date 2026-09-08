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

_Pending._

## Topology C — no VPC, no NAT

_Pending._

## Teardown

_Pending._
