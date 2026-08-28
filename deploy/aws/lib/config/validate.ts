/**
 * Synth-time validation of the configuration surface.
 *
 * These run before any resource is created, so a misconfiguration fails during
 * `cdk synth` with a sentence an adopter can act on — rather than fifteen minutes
 * into `cdk deploy` with a CloudFormation error that names an unrelated resource.
 *
 * The Helm chart's equivalent is `values.schema.json` plus the two `fail` calls in
 * its templates. Parity with that is an acceptance criterion, not polish.
 */

import { Token } from 'aws-cdk-lib';

import { ConfigurationError } from './errors';

/** CloudFront serves certificates only from us-east-1, whatever region the stack targets. */
const CLOUDFRONT_CERTIFICATE_REGION = 'us-east-1';

/**
 * The canonical URL, normalized.
 *
 * Returns the hostname because almost every consumer wants that rather than the
 * URL — the certificate subject, the Route 53 record, the CloudFront alias.
 */
export function validateAppUrl(appUrl: string): { hostname: string } {
  let parsed: URL;
  try {
    parsed = new URL(appUrl);
  } catch {
    throw new ConfigurationError(
      `appUrl must be an absolute URL, e.g. https://grant.example.com (received: ${appUrl})`
    );
  }

  if (parsed.protocol !== 'https:') {
    throw new ConfigurationError(
      `appUrl must use https — CloudFront terminates TLS and every cookie the platform sets is Secure (received: ${appUrl})`
    );
  }

  // The Helm chart says "no trailing path" for the same reason: the path space
  // belongs to the routing table, so a base path would silently shift every route.
  if (parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
    throw new ConfigurationError(
      `appUrl must have no path, query or fragment — the path space is the routing table (received: ${appUrl})`
    );
  }

  return { hostname: parsed.hostname };
}

/**
 * Asserts a certificate ARN is one CloudFront can actually use.
 *
 * `Certificate.fromCertificateArn()` returns a token: CDK cannot check the region,
 * the domain, or that the certificate exists. The region is lexically present in the
 * ARN, so checking it costs nothing and catches the single most common first-deploy
 * failure — a certificate issued in the stack's own region.
 */
export function validateCertificateArn(arn: string): void {
  // arn:<partition>:acm:<region>:<account>:certificate/<id>
  const segments = arn.split(':');
  const [prefix, , service, region] = segments;

  if (prefix !== 'arn' || service !== 'acm' || segments.length < 6) {
    throw new ConfigurationError(
      `Not an ACM certificate ARN: ${arn}\n` +
        'Expected arn:<partition>:acm:<region>:<account>:certificate/<id>'
    );
  }

  if (region !== CLOUDFRONT_CERTIFICATE_REGION) {
    throw new ConfigurationError(
      `CloudFront requires a certificate in ${CLOUDFRONT_CERTIFICATE_REGION}, but this one is in ${region}.\n` +
        `  ${arn}\n` +
        `This is true whatever region the stack targets. Re-issue the certificate in ${CLOUDFRONT_CERTIFICATE_REGION}, ` +
        'or omit it and let the stack create and validate one against the hosted zone.'
    );
  }
}

/**
 * Asserts the canonical hostname sits inside the hosted zone that will hold its
 * record. A mismatch synthesizes fine and then deploys a record nothing resolves.
 */
export function validateHostnameInZone(hostname: string, zoneName: string): void {
  const zone = zoneName.replace(/\.$/, '');
  if (hostname !== zone && !hostname.endsWith(`.${zone}`)) {
    throw new ConfigurationError(
      `appUrl hostname "${hostname}" is not inside hosted zone "${zone}".\n` +
        'The stack would create a record the zone does not serve.'
    );
  }
}

/**
 * Asserts a stack's environment is concrete rather than region-agnostic.
 *
 * This exists because of a failure that **synthesizes cleanly and fails at deploy**.
 * CDK wires a cross-region reference only when it can see that the two stacks differ —
 * with both regions left as tokens it cannot, so it silently emits an ordinary
 * `Fn::ImportValue`. CloudFormation exports do not cross regions, so the deploy
 * fails with an unresolved-export error naming neither region.
 *
 * Verified by synthesizing both shapes: the agnostic pair produced no
 * `Custom::CrossRegionExportReader` at all, while the concrete pair produced the
 * reader, its Lambda and its role.
 */
export function assertConcreteEnv(
  stackName: string,
  env: { account?: string; region?: string }
): { account: string; region: string } {
  const { account, region } = env;

  if (!account || !region || Token.isUnresolved(account) || Token.isUnresolved(region)) {
    throw new ConfigurationError(
      `Stack "${stackName}" needs a concrete account and region.\n` +
        'The certificate lives in us-east-1 and the platform elsewhere, and CDK only\n' +
        'generates cross-region plumbing when both environments are known at synth time.\n' +
        'Left agnostic this synthesizes cleanly and then fails at deploy.\n' +
        '  cdk deploy -c account=123456789012 -c region=eu-central-1'
    );
  }

  return { account, region };
}

/**
 * Guards the one case where creating a certificate in the platform stack is wrong.
 *
 * CloudFront serves certificates only from us-east-1. A supplied ARN is checked
 * lexically; one created in-stack inherits the stack's region, so composing the
 * construct into a stack elsewhere would produce a distribution CloudFront rejects.
 */
export function assertCertificateRegion(region: string): void {
  if (Token.isUnresolved(region)) return;

  if (region !== CLOUDFRONT_CERTIFICATE_REGION) {
    throw new ConfigurationError(
      `A certificate created in this stack would be in ${region}, but CloudFront only ` +
        `serves certificates from ${CLOUDFRONT_CERTIFICATE_REGION}.\n` +
        'Pass an existing us-east-1 certificate via dns.certificate, or use the reference ' +
        'app in bin/, which creates it in a separate us-east-1 stack.'
    );
  }
}
