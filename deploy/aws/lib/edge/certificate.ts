/**
 * The CloudFront certificate, in its own construct so it can live in its own stack.
 *
 * CloudFront is a global service; only the ACM certificate it serves is pinned to
 * `us-east-1`. Colocating the certificate with everything else is what would force
 * the whole platform into that region — so the reference app puts this construct in
 * a dedicated `us-east-1` stack and the platform stack goes wherever latency wants.
 *
 * Nothing else needs to know. `GrantPlatform` takes an `ICertificate`, so a
 * cross-region certificate, an imported ARN and a same-stack certificate are all the
 * same to it.
 */

import {
  Certificate,
  CertificateValidation,
  type ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import type { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface EdgeCertificateProps {
  /** Canonical hostname the certificate is issued for. */
  readonly hostname: string;

  /**
   * Zone used for DNS validation.
   *
   * Imported into this stack with `fromHostedZoneAttributes`, so validation records
   * are written to the real zone without a synth-time lookup.
   */
  readonly hostedZone: IHostedZone;
}

export class EdgeCertificate extends Construct {
  public readonly certificate: ICertificate;

  constructor(scope: Construct, id: string, props: EdgeCertificateProps) {
    super(scope, id);

    this.certificate = new Certificate(this, 'Certificate', {
      domainName: props.hostname,
      // DNS validation renews without human involvement, which matters for a
      // deployment target meant to be left alone. Email validation would need a
      // mailbox on the domain and manual action every renewal.
      validation: CertificateValidation.fromDns(props.hostedZone),
    });
  }
}
