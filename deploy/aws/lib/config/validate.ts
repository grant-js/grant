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
