/**
 * The API stops advertising a body limit the runtime will not honour.
 *
 * `@grantjs/env` defaults `API_JSON_BODY_LIMIT_BYTES` to 10 MiB, which is right
 * everywhere the process owns its own socket. On Lambda it is not: phase B measured the
 * invocation cap at **5.32 MiB of raw CDM** for an uncompressed body
 * (`plans/2026-08-21-aws-lambda-runtime-measurements.md` § finding 2). Between those two
 * numbers the platform accepted, by its own configuration, payloads AWS rejected before
 * any code ran — no 413, no domain error, no audit entry, nothing in the request log.
 *
 * These assertions are tied to the measurement rather than to the literal, so a future
 * edit has to argue with a number instead of retyping a constant.
 */
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';
import { AWS_TARGET_ENV_DEFAULTS } from './defaults';

/**
 * Lambda's measured ceiling for an uncompressed body, in bytes.
 *
 * Not the 6 MB the docs quote: 5.32 MiB is what *raw CDM* fits, after base64 expansion
 * of the request the adapter forwards (finding 3, +33%). The limit must sit at or below
 * it, or the gap this slice closes reopens.
 */
const MEASURED_LAMBDA_CEILING_BYTES = Math.floor(5.32 * 1024 * 1024);

function build(env?: Record<string, string>) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });

  new GrantPlatform(stack, 'Grant', {
    appUrl: 'https://grant.example.com',
    dns: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
        hostedZoneId: 'ZTEST000000000',
        zoneName: 'example.com',
      }),
      certificate: Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123'
      ),
    },
    database: {},
    api: {
      image: DockerImageCode.fromEcr(Repository.fromRepositoryName(stack, 'Repo', 'grant/api'), {
        tagOrDigest: 'test',
      }),
    },
    env,
  });

  return Template.fromStack(stack);
}

/**
 * `API_JSON_BODY_LIMIT_BYTES` on the two functions that run `apps/api`.
 *
 * Filtered on `SECRETS_AWS_SECRET_ID`, as `api-serving.test.ts` does: the template also
 * holds the web function and CDK's own custom-resource handlers, none of which parse a
 * request body and none of which should be asserted against.
 */
function limitsOnAppFunctions(template: Template): (string | undefined)[] {
  return Object.values(template.findResources('AWS::Lambda::Function'))
    .map(
      (fn) =>
        (fn.Properties as { Environment?: { Variables?: Record<string, string> } }).Environment
          ?.Variables
    )
    .filter((env) => env?.SECRETS_AWS_SECRET_ID !== undefined)
    .map((env) => env?.API_JSON_BODY_LIMIT_BYTES);
}

describe('API_JSON_BODY_LIMIT_BYTES on the AWS target', () => {
  it('sits at or below the measured Lambda ceiling', () => {
    // The assertion that matters. Above this the API accepts what the runtime will
    // reject, and the caller learns nothing from the application at all.
    const limit = Number(AWS_TARGET_ENV_DEFAULTS.API_JSON_BODY_LIMIT_BYTES);

    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThanOrEqual(MEASURED_LAMBDA_CEILING_BYTES);
  });

  it('is lower than the default every other target keeps', () => {
    // `@grantjs/env`'s 10 MiB is untouched: this is an AWS-target override, not a
    // change to the platform's default. If these were ever equal, the override would
    // have been silently dropped.
    const limit = Number(AWS_TARGET_ENV_DEFAULTS.API_JSON_BODY_LIMIT_BYTES);

    expect(limit).toBeLessThan(10 * 1024 * 1024);
  });

  it('is not so low that ordinary CDM stops fitting', () => {
    // The other side of the trade. `body-parser` inflates before applying `limit`, so
    // this bounds *decompressed* bytes and a gzipped client hits it earlier than it
    // hits Lambda. Phase B's largest fixture is 12.16 MiB raw / 2.22 MiB gzipped; a
    // limit under a megabyte would reject payloads both the runtime and the database
    // handle comfortably.
    const limit = Number(AWS_TARGET_ENV_DEFAULTS.API_JSON_BODY_LIMIT_BYTES);

    expect(limit).toBeGreaterThanOrEqual(4 * 1024 * 1024);
  });

  it('reaches both functions', () => {
    // The API serves the sync ingress route; the jobs function serves event dispatch,
    // which parses a body with the same config value.
    const limits = limitsOnAppFunctions(build());

    expect(limits).toHaveLength(2);
    for (const limit of limits) {
      expect(limit).toBe(AWS_TARGET_ENV_DEFAULTS.API_JSON_BODY_LIMIT_BYTES);
    }
  });

  it('stays a default an adopter can raise', () => {
    // Additive and config-driven: an adopter who has measured their own CDM, or who
    // gzips everything, must be able to win over this package's opinion.
    const limits = limitsOnAppFunctions(build({ API_JSON_BODY_LIMIT_BYTES: '8388608' }));

    for (const limit of limits) {
      expect(limit).toBe('8388608');
    }
  });
});
