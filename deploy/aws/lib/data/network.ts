/**
 * The VPC the API runs in.
 *
 * Only the API needs a network. The web app never calls the API server-side — it has
 * no `NEXT_PUBLIC_*` variables and `getGraphQLUrl()` returns the bare relative
 * `/graphql` (`apps/web/lib/apollo-client.ts:74`) — so every API request arrives from
 * a browser through CloudFront. There is no east-west traffic to route.
 *
 * Existing infrastructure is referenced rather than recreated: pass `vpc` and this
 * construct creates nothing. That is ADR 0005's interface-typed props doing the work
 * — an adopter supplies `Vpc.fromVpcAttributes(...)` and none of the constructs
 * downstream can tell the difference.
 */

import { IpAddresses, type IVpc, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkProps {
  /** Existing VPC to attach to. Omit to create one. */
  readonly vpc?: IVpc;

  /**
   * NAT gateways to create when this construct owns the VPC.
   *
   * One, not one per availability zone, which is CDK's default. A NAT gateway is
   * roughly $32/month and the default would silently double that before a single
   * request is served — the largest fixed cost in the whole target. One NAT means a
   * zonal failure takes egress with it; for a deployment whose motivation is cutting
   * idle cost that is the right trade, and an adopter who needs zonal redundancy
   * raises this or supplies their own VPC.
   */
  readonly natGateways?: number;

  /**
   * Availability zones to spread across. Defaults to the region's first two.
   *
   * Creating a VPC needs the region's zone list, which CDK resolves through an
   * **availability-zone context lookup** — an AWS call at synth time. Supplying the
   * zones here does *not* avoid it: CDK validates them against the stack's list and
   * touches the same provider either way (`aws-ec2/lib/vpc.js`, the
   * `GivenAvailabilityZones` check).
   *
   * That lookup is not the kind ADR 0005 rules out. `Vpc.fromLookup` **discovers
   * existing infrastructure**, so the template becomes a function of account state;
   * this one asks a stable question about a region. `cdk.json` seeds the answer for
   * the synth-only placeholder account, so the committed template is reproducible and
   * CI needs no credentials, while a real deploy resolves the real zones.
   */
  readonly availabilityZones?: string[];
}

export class Network extends Construct {
  public readonly vpc: IVpc;

  /** True when this construct created the VPC, so teardown removes it. */
  public readonly ownsVpc: boolean;

  constructor(scope: Construct, id: string, props: NetworkProps = {}) {
    super(scope, id);

    this.ownsVpc = props.vpc === undefined;
    this.vpc =
      props.vpc ??
      new Vpc(this, 'Vpc', {
        ipAddresses: IpAddresses.cidr('10.42.0.0/16'),
        ...(props.availabilityZones
          ? { availabilityZones: props.availabilityZones }
          : // Two zones is the minimum an RDS subnet group accepts. More adds cost
            // without adding anything this target uses.
            { maxAzs: 2 }),
        natGateways: props.natGateways ?? 1,
        subnetConfiguration: [
          {
            name: 'public',
            subnetType: SubnetType.PUBLIC,
            cidrMask: 24,
          },
          {
            // The API Lambda lives here: it needs outbound internet for webhook
            // delivery to arbitrary URLs, SES and GitHub OAuth. VPC endpoints cannot
            // substitute, because those destinations are not AWS services — which is
            // why NAT is a hard cost floor rather than an optimisation.
            name: 'private-egress',
            subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: 24,
          },
          {
            // The database has no route out and needs none.
            name: 'isolated',
            subnetType: SubnetType.PRIVATE_ISOLATED,
            cidrMask: 24,
          },
        ],
      });
  }
}
