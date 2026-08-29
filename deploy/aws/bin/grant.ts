#!/usr/bin/env node
/**
 * Reference app — the scalar-configured entry point.
 *
 * This is the layer an adopter **replaces**, not forks. Per ADR 0005 the constructs
 * in `lib/` accept CDK resource interfaces, so composing against existing
 * infrastructure means writing your own version of this file — importing your VPC
 * with `Vpc.fromVpcAttributes(...)` and your existing certificate — while staying on
 * upstream `lib/`. Forking the library means porting every later fix by hand.
 *
 * Configuration comes from CDK context, so the common case needs no code change:
 *
 *   cdk deploy -c appUrl=https://grant.example.com \
 *              -c zoneName=example.com \
 *              -c hostedZoneId=Z123456ABCDEFG
 */
import { App, Stack } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';

import { ConfigurationError } from '../lib/config/errors';
import { validateCertificateArn } from '../lib/config/validate';
import { GrantPlatform } from '../lib/grant-platform';

const app = new App();

function required(key: string): string {
  const value = app.node.tryGetContext(key) as string | undefined;
  if (!value) {
    throw new ConfigurationError(
      `Missing required context "${key}".\n` +
        '  cdk deploy -c appUrl=https://grant.example.com -c zoneName=example.com -c hostedZoneId=Z123456ABCDEFG'
    );
  }
  return value;
}

const appUrl = required('appUrl');
const zoneName = required('zoneName');
const hostedZoneId = required('hostedZoneId');
const certificateArn = app.node.tryGetContext('certificateArn') as string | undefined;

// Lexical and cheap: fromCertificateArn returns a token that validates nothing, and a
// certificate outside us-east-1 is the most common first-deploy failure.
if (certificateArn) validateCertificateArn(certificateArn);

const stack = new Stack(app, 'GrantPlatform', {
  description: 'Grant platform — AWS serverless target',
  // No `env`: the stack stays region-agnostic so `cdk synth` is hermetic and its
  // output is reviewable evidence. Set CDK_DEFAULT_ACCOUNT/REGION when deploying.
});

new GrantPlatform(stack, 'Grant', {
  appUrl,
  dns: {
    // fromHostedZoneAttributes, not fromLookup: a lookup resolves against live
    // account state at synth time and would make the committed template a function
    // of whichever account last ran synth. ADR 0005.
    hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'HostedZone', {
      hostedZoneId,
      zoneName,
    }),
    certificate: certificateArn
      ? Certificate.fromCertificateArn(stack, 'Certificate', certificateArn)
      : undefined,
  },
});
