/**
 * `ses:SendEmail`, scoped and granted only where it is used.
 *
 * Before this, both functions held `ses:SendEmail`/`ses:SendRawEmail` on `Resource: "*"`
 * unconditionally, while `EMAIL_PROVIDER` defaults to `console` — so the common
 * deployment was a pair of functions that could send mail as any verified identity in
 * the account and had no reason to send mail at all.
 *
 * The comment that justified `*` claimed these actions "do not support resource-level
 * permissions in the classic API". They do. The SES developer guide, § Identity and
 * access management, checked 2026-09-09: "To restrict the identities that a user is
 * allowed to send from, set Resource to the ARNs of the identities that you are
 * permitting the user to use." `ses:FromAddress` is listed there as a condition key for
 * both actions, alongside the separate `ses:FromDisplayName` — which is what says SES
 * parses `Source` rather than matching the whole formatted string.
 */
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';

const IDENTITY_ARN = 'arn:aws:ses:eu-central-1:123456789012:identity/example.com';
const FROM = 'no-reply@example.com';

function build(
  overrides: { env?: Record<string, string>; email?: { sesIdentityArn: string } } = {}
) {
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
    env: overrides.env,
    email: overrides.email,
  });

  return Template.fromStack(stack);
}

/** Every SES statement in the template, across both function roles. */
function sesStatements(template: Template): Record<string, unknown>[] {
  return Object.values(template.findResources('AWS::IAM::Policy'))
    .flatMap((policy) => {
      const props = policy.Properties as {
        PolicyDocument: { Statement: Record<string, unknown>[] };
      };
      return props.PolicyDocument.Statement;
    })
    .filter((statement) => JSON.stringify(statement.Action).includes('ses:'));
}

describe('the SES grant is issued only where mail is sent', () => {
  it('attaches no SES statement under the default console provider', () => {
    // The whole point of the slice. `.env.example` leaves EMAIL_PROVIDER empty, so
    // this is what a green-field deploy gets — and it is the configuration that used
    // to carry send-as-anyone.
    expect(sesStatements(build())).toEqual([]);
  });

  it('attaches no SES statement for a non-SES provider that does send mail', () => {
    // SMTP and Mailgun send real mail without touching SES at all. A grant here would
    // be permission the deployment provably never exercises.
    const template = build({ env: { EMAIL_PROVIDER: 'smtp', EMAIL_FROM: FROM } });

    expect(sesStatements(template)).toEqual([]);
  });

  it('grants both functions the send actions when the provider is ses', () => {
    // Two: the API sends on the request path (invitations, password resets) and the
    // jobs function sends notification deliveries.
    const statements = sesStatements(
      build({
        env: { EMAIL_PROVIDER: 'ses', EMAIL_FROM: FROM },
        email: { sesIdentityArn: IDENTITY_ARN },
      })
    );

    expect(statements).toHaveLength(2);
    for (const statement of statements) {
      expect(statement.Action).toEqual(['ses:SendEmail', 'ses:SendRawEmail']);
    }
  });

  it('scopes every send statement to the identity, never to *', () => {
    // The mutation this test exists for: revert `resources` to `['*']` and this is
    // what fails. `Resource: "*"` on a send action is send-as-any-verified-identity
    // in the account, which is the finding.
    const statements = sesStatements(
      build({
        env: { EMAIL_PROVIDER: 'ses', EMAIL_FROM: FROM },
        email: { sesIdentityArn: IDENTITY_ARN },
      })
    );

    expect(statements).toHaveLength(2);
    for (const statement of statements) {
      expect(statement.Resource).toBe(IDENTITY_ARN);
      expect(statement.Resource).not.toBe('*');
    }
  });

  it('pins the From address, so a domain identity is not a whole domain', () => {
    // The identity ARN alone leaves every mailbox at example.com in scope. The adapter
    // only ever sets one Source (`@grantjs/email/src/ses/index.ts:52`), so the grant
    // can say so.
    const statements = sesStatements(
      build({
        env: { EMAIL_PROVIDER: 'ses', EMAIL_FROM: FROM },
        email: { sesIdentityArn: IDENTITY_ARN },
      })
    );

    for (const statement of statements) {
      expect(statement.Condition).toEqual({ StringEquals: { 'ses:FromAddress': FROM } });
    }
  });

  it('grants nothing beyond sending', () => {
    // Send-only. Identity management, domain verification and sending statistics are
    // all things a compromised function would want and has no use for.
    const template = build({
      env: { EMAIL_PROVIDER: 'ses', EMAIL_FROM: FROM },
      email: { sesIdentityArn: IDENTITY_ARN },
    });
    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));

    expect(policies).not.toMatch(/ses:VerifyEmailIdentity/);
    expect(policies).not.toMatch(/ses:DeleteIdentity/);
    expect(policies).not.toMatch(/ses:GetSendStatistics/);
    expect(policies).not.toMatch(/ses:\*/);
  });
});

describe('a deployment that cannot be scoped is refused at synth', () => {
  it('refuses EMAIL_PROVIDER=ses without EMAIL_FROM', () => {
    // apps/api refuses the same thing at boot (`env.config.ts:970`). Here it costs a
    // synth rather than a deploy and a cold start.
    expect(() =>
      build({ env: { EMAIL_PROVIDER: 'ses' }, email: { sesIdentityArn: IDENTITY_ARN } })
    ).toThrow(/EMAIL_FROM is unset/);
  });

  it('refuses EMAIL_PROVIDER=ses without an identity ARN', () => {
    expect(() => build({ env: { EMAIL_PROVIDER: 'ses', EMAIL_FROM: FROM } })).toThrow(
      /no email\.sesIdentityArn was supplied/
    );
  });

  it('refuses an ARN that is not an SES identity', () => {
    // A configuration-set ARN is an SES ARN and is not something a send action can be
    // scoped to; it would deploy and then deny on the first send.
    expect(() =>
      build({
        env: { EMAIL_PROVIDER: 'ses', EMAIL_FROM: FROM },
        email: {
          sesIdentityArn: 'arn:aws:ses:eu-central-1:123456789012:configuration-set/default',
        },
      })
    ).toThrow(/Not an SES \*identity\* ARN/);
  });

  it('refuses an ARN for another service entirely', () => {
    expect(() =>
      build({
        env: { EMAIL_PROVIDER: 'ses', EMAIL_FROM: FROM },
        email: { sesIdentityArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc-123' },
      })
    ).toThrow(/Not an SES ARN/);
  });

  it('ignores an identity ARN when the provider does not send through SES', () => {
    // Deliberately not refused: an inert prop is not a broken deployment, and a config
    // file that carries the ARN across a provider switch is reasonable to have.
    expect(() => build({ email: { sesIdentityArn: IDENTITY_ARN } })).not.toThrow();
    expect(sesStatements(build({ email: { sesIdentityArn: IDENTITY_ARN } }))).toEqual([]);
  });
});
