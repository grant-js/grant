/**
 * The platform, as a construct.
 *
 * A `Construct` rather than a `Stack`, and that is the shape ADR 0005 asks for: the
 * props take CDK resource interfaces, and a caller cannot produce an `IHostedZone`
 * or an `ICertificate` before a stack exists to import them into. Making this an L3
 * construct lets the reference app create the stack, import what the adopter already
 * owns, and hand the handles in — which is exactly the composition an adopter needs
 * when they replace `bin/`.
 *
 * Slice 2 establishes the configuration surface and the routing plan; it creates no
 * AWS resources. That is deliberate — the stack plan front-loads everything CI can
 * verify, because from the docs site onward the evidence is a recorded deploy rather
 * than a diff.
 *
 * What it does emit is the **resolved plan** as outputs: the canonical hostname and
 * the CloudFront behaviour order. The committed synth output is therefore reviewable
 * evidence that derivation produced the intended routing, before any distribution
 * exists to get it wrong.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CfnOutput } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { AaaaRecord, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

import { ASSET_BEHAVIOURS, type CloudFrontBehaviour, toCloudFrontBehaviours } from './behaviours';
import { AWS_TARGET_ENV_DEFAULTS } from './config/defaults';
import type { GrantEnv, GrantPlatformProps } from './config/props';
import { validateAppUrl, validateHostnameInZone } from './config/validate';
import { EdgeDistribution } from './edge/distribution';
import { DocsSite } from './edge/docs-site';

/** Repo-relative default for the built documentation. */
const DEFAULT_DOCS_DIST = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/.vitepress/dist'
);

export class GrantPlatform extends Construct {
  /** Canonical hostname, derived from `appUrl`. */
  public readonly hostname: string;

  /** Behaviours in CloudFront evaluation order. Consumed by the distribution in slice 3. */
  public readonly behaviours: readonly CloudFrontBehaviour[];

  /** Defaults merged with the caller's overrides. Caller wins. */
  public readonly env: GrantEnv;

  public readonly docs: DocsSite;
  public readonly edge: EdgeDistribution;

  constructor(scope: Construct, id: string, props: GrantPlatformProps) {
    super(scope, id);

    // Validate first: a bad hostname should fail during synth with an actionable
    // sentence, not fifteen minutes into a deploy with an unrelated resource named.
    const { hostname } = validateAppUrl(props.appUrl);
    validateHostnameInZone(hostname, props.dns.hostedZone.zoneName);

    this.hostname = hostname;
    // Caller last: an adopter overriding a default must win over this file's opinion.
    this.env = { ...AWS_TARGET_ENV_DEFAULTS, ...props.env };
    this.behaviours = [...toCloudFrontBehaviours(), ...ASSET_BEHAVIOURS];

    // us-east-1 or nothing: CloudFront serves certificates only from there. An
    // adopter supplying an ARN has it asserted lexically in the reference app; one
    // created here inherits the constraint from the stack's own region, which the
    // deployment guide states.
    const certificate =
      props.dns.certificate ??
      new Certificate(this, 'Certificate', {
        domainName: hostname,
        validation: CertificateValidation.fromDns(props.dns.hostedZone),
      });

    this.docs = new DocsSite(this, 'Docs', {
      distPath: props.docs?.distPath ?? DEFAULT_DOCS_DIST,
      bucket: props.docs?.bucket,
    });

    this.edge = new EdgeDistribution(this, 'Edge', {
      hostname,
      certificate,
      docsBucket: this.docs.bucket,
    });

    const recordTarget = RecordTarget.fromAlias(new CloudFrontTarget(this.edge.distribution));
    new ARecord(this, 'AliasIpv4', {
      zone: props.dns.hostedZone,
      recordName: hostname,
      target: recordTarget,
    });
    // CloudFront answers on IPv6 by default; without the AAAA record, IPv6-only
    // clients cannot resolve the canonical name at all.
    new AaaaRecord(this, 'AliasIpv6', {
      zone: props.dns.hostedZone,
      recordName: hostname,
      target: recordTarget,
    });

    if (!this.docs.ownsBucket) {
      // CDK does not own an imported bucket's resource policy — addToResourcePolicy
      // silently no-ops — so the OAC grant must be applied out of band. Say so
      // rather than appear to have done it.
      new CfnOutput(this, 'DocsBucketPolicyRequired', {
        value: this.docs.bucket.bucketName,
        description:
          'Imported docs bucket: grant cloudfront.amazonaws.com s3:GetObject with an AWS:SourceArn condition on this distribution. CDK cannot apply it.',
      });
    }

    new CfnOutput(this, 'DistributionDomainName', {
      value: this.edge.distribution.distributionDomainName,
      description: 'CloudFront domain; the canonical hostname aliases to this.',
    });

    new CfnOutput(this, 'CanonicalHostname', {
      value: this.hostname,
      description: 'The single public hostname; the path selects which app answers.',
    });

    new CfnOutput(this, 'RoutingPlan', {
      // Order matters and is the reviewable part: CloudFront evaluates behaviours in
      // declaration order, so this output is the routing decision, in the template.
      value: this.behaviours.map((b) => `${b.pathPattern}=>${b.origin}:${b.cache}`).join(' '),
      description: 'CloudFront behaviours in evaluation order, derived from lib/routing.ts.',
    });
  }
}
