# 0005 — Ship the AWS target as a construct library with a reference app

- **Status**: Accepted
- **Date**: 2026-08-27
- **Context**: phase C of the AWS serverless target
  (`plans/2026-08-21-aws-edge-infra-brief.md`), gate 1
- **Supersedes**: nothing. The phase C draft said only "a CDK app under
  `deploy/aws/`", which left the adopter's extension path unspecified.

## Context

The phase C draft asks for "a CDK app under `deploy/aws/`" with "a configuration
surface at parity with `values.schema.json`". Two facts make that under-specified.

**Adopters need to reference infrastructure they already own.** The first known
integration will run inside an existing VPC, against an existing RDS instance and an
existing ElastiCache cluster. It is not a green-field deploy, and it will not be the
last one that isn't.

**The Helm chart already answered the analogous question, and answered it narrowly.**
`charts/grant-platform/Chart.yaml` has no `dependencies:` block: the chart bundles no
Postgres and no Redis, and offers no toggle to create them. `externalDatabase.url` and
`redis.host` are unconditional references. That is a real decision about stateful
resources, and phase C inherits it — but Helm has no equivalent of CDK's typed
resource handles, so the chart's answer does not transfer as a mechanism.

The naive CDK translation is a `createX: boolean` beside every resource. That grows
the props surface linearly with the resource count, adds a validation branch per
toggle, and still fails for any import style not anticipated — while the acceptance
criterion says configuring a deployment "must not require reading CDK source".

## Decision

**`deploy/aws/` is a construct library. The deployable app is a thin reference entry
point over it, and the entry point — not the library — is what an adopter replaces.**

Two layers, two audiences:

| Layer             | Path                      | Props style                                                                 | Audience                                           |
| ----------------- | ------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| Reference app     | `deploy/aws/bin/grant.ts` | scalars: `appUrl`, `zoneName`, optional ARNs                                | Evaluator. `cdk deploy` with no code.              |
| Construct library | `deploy/aws/lib/**`       | CDK interfaces: `IVpc`, `ICertificate`, `IBucket`, `IHostedZone`, `ISecret` | Adopter composing against existing infrastructure. |

Three consequences follow, and they are the decision:

1. **CDK's own resource interfaces are the bring-your-own mechanism.** Every one of
   them has both a `new Thing(...)` producer and a `Thing.from*(...)` importer, so a
   construct taking `vpc?: ec2.IVpc` supports create-and-reference with no toggle, no
   validation branch, and no need to predict which import style an adopter wants.
   Props accept `IThing`, never `thingId: string`, except in the reference app where
   a scalar is the point.

2. **The intended extension path is replacing `bin/`, not forking `deploy/aws/`.** An
   adopter writes their own entry file — tens of lines — passing
   `Vpc.fromVpcAttributes(...)` and their existing cluster, and stays on upstream
   `lib/`. Forking the library instead means every later fix must be ported by hand.
   The library is therefore an API: adding a required prop to an exported construct is
   a breaking change and is reviewed as one.

3. **Prefer explicit attributes over context lookups.** `Vpc.fromLookup()` resolves at
   synth time against live account state, requires credentials to synthesize, and
   caches into `cdk.context.json`. The acceptance criteria commit `cdk synth` output
   as the evidence that EventBridge rule generation produced exactly the expected
   rules — a lookup makes that evidence a function of whichever account last ran
   synth. `Vpc.fromVpcAttributes()` keeps synth hermetic and reviewable.

The library is **not** published to npm. `scripts/check-publishable-packages.mjs`
pins the published set to `@grantjs/client`, `@grantjs/server` and `@grantjs/cli`,
and this does not join it. "Library" describes the structure and the review bar, not
the distribution channel.

## Consequences

- The four bring-your-own switches previously sketched (certificate, uploads bucket,
  ECR repository, VPC) collapse into optional `IThing` props on the constructs plus
  optional scalars on the reference app. `DockerImageCode.fromImageAsset()` pushes to
  the CDK bootstrap assets repository, so the green-field path needs no ECR repository
  prop at all.
- An imported `IBucket` cannot receive a resource policy — CDK does not own it, and
  `addToResourcePolicy` silently no-ops. A bring-your-own uploads bucket therefore
  cannot be granted CloudFront Origin Access Control by the stack. Where the library
  accepts an imported bucket it must emit the required policy as a `CfnOutput` rather
  than appear to have applied it.
- `Certificate.fromCertificateArn()` returns a token with no validation, and
  CloudFront requires a certificate in `us-east-1`. The region is lexically present in
  the ARN, so the reference app asserts it at synth time. This is the cheapest guard
  against the most common first-deploy failure.
- Two layers means two things to document. `docs/deployment/aws-serverless.md` covers
  the reference app; the construct props are documented at the source, as an API.

## Alternatives considered

**A single app with `createX: boolean` props.** Rejected: the props surface grows with
the resource count, each toggle costs a validation branch, and it still cannot express
import styles nobody predicted. It also inverts the acceptance criterion — the more
expressive the toggles, the more CDK source an adopter must read to use them.

**Expect adopters to fork `deploy/aws/`.** Rejected: it makes every upstream fix a
manual port, which contradicts the goal of the AWS target being adoptable rather than
merely deployable. Forking remains possible; it is just not the designed path.

**Publish the library to npm.** Rejected for now. It would add a fourth published
package and a semver contract to a surface that has not deployed once. Revisit after
the target has been deployed and adopted at least twice.
