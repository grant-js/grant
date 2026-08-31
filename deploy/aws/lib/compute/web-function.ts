/**
 * The web app, as a Lambda function.
 *
 * The Next.js standalone server (`output: 'standalone'`) behind the Lambda Web
 * Adapter — the same shape as `ApiFunction`, and deliberately not OpenNext. OpenNext
 * solves ISR cache persistence and image optimization on serverless; this app uses
 * neither, so it would add a build toolchain and a Next-16 support risk to buy
 * nothing. See `apps/web/Dockerfile`.
 *
 * **Unlike the API, this URL is IAM-authorized**, and the difference is worth stating
 * because it looks inconsistent until you see why. Origin Access Control was ruled out
 * for the API by two things: its recommended signing mode overwrites the viewer's
 * `Authorization` header, and `POST`/`PUT` through OAC require the viewer to send a
 * body hash. Neither applies here — the web app authenticates by **cookie**, which OAC
 * does not touch, and serves **GET only**: no server actions, no route handlers, no
 * native form posts. The distribution restricts the behaviour to GET/HEAD/OPTIONS, so
 * a body can never reach it.
 *
 * The result is that AWS refuses an unsigned caller before any code runs, and there is
 * no second publicly reachable origin to defend.
 */

import { Duration } from 'aws-cdk-lib';
import { type ISecurityGroup, type IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import {
  type DockerImageCode,
  DockerImageFunction,
  FunctionUrlAuthType,
  type IFunctionUrl,
} from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import type { GrantEnv } from '../config/props';

export interface WebFunctionProps {
  /** The image to run. Omit `vpc` and the function runs outside one. */
  readonly code: DockerImageCode;

  /**
   * Network placement. Optional, and usually omitted: the web app talks to the API
   * over the public canonical URL like any browser does, so it needs nothing from
   * inside the VPC — and staying out of it avoids ENI cold-start cost entirely.
   */
  readonly vpc?: IVpc;
  readonly securityGroups?: ISecurityGroup[];

  /** Non-secret environment. The web app reads no secrets. */
  readonly environment?: GrantEnv;

  readonly memorySize?: number;
  readonly timeout?: Duration;
}

export class WebFunction extends Construct {
  public readonly function: DockerImageFunction;

  /** IAM-authorized; the distribution reaches it through Origin Access Control. */
  public readonly functionUrl: IFunctionUrl;

  constructor(scope: Construct, id: string, props: WebFunctionProps) {
    super(scope, id);

    this.function = new DockerImageFunction(this, 'Function', {
      code: props.code,
      ...(props.vpc
        ? {
            vpc: props.vpc,
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
            ...(props.securityGroups ? { securityGroups: props.securityGroups } : {}),
          }
        : {}),
      // Matches the API, measured rather than reasoned: 1769 MB buys a full vCPU but
      // pushed the API's init past Lambda's 10 s ceiling, where it was re-run inside
      // the invocation. Verify `INIT_REPORT` before raising this.
      memorySize: props.memorySize ?? 1024,
      // CloudFront's origin response timeout is 30 s; a longer Lambda timeout only
      // buys a 504 at the edge while still being billed.
      timeout: props.timeout ?? Duration.seconds(30),
      ...(props.environment ? { environment: { ...props.environment } } : {}),
      logGroup: new LogGroup(this, 'Logs', {
        retention: RetentionDays.TWO_WEEKS,
      }),
    });

    this.functionUrl = this.function.addFunctionUrl({
      // See the note above: OAC is available here because the web app authenticates by
      // cookie and serves GET only, so neither constraint that ruled it out for the
      // API applies. AWS refuses an unsigned caller before any code runs.
      authType: FunctionUrlAuthType.AWS_IAM,
    });
  }
}
