/**
 * The uploads bucket expires abandoned CDM import documents, and nothing else.
 *
 * ADR 0009 sends a CDM import by reference: the client PUTs the document to
 * `imports/projects/<projectId>/<uploadId>.json`, and the worker deletes it when the job
 * reaches a terminal state. The lifecycle rule here is the backstop for an upload that was
 * never started, and its prefix is the whole reason `imports/` is the *first* key segment:
 * a rule on a prefix that also matched pictures would delete user files.
 *
 * Pinned here because S3's own enforcement cannot be observed locally (LocalStack does not
 * run lifecycle) and a wrong rule fails silently, a week later.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';
import { CDM_IMPORT_KEY_PREFIX, DEFAULT_CDM_IMPORT_OBJECT_TTL_DAYS } from './storage-bucket';

function build(storage: { uploadsBucket?: boolean; cdmImportObjectTtlDays?: number } = {}) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  new GrantPlatform(stack, 'Grant', {
    appUrl: 'https://grant.example.com',
    dns: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
        hostedZoneId: 'ZTEST000000000',
        zoneName: 'example.com',
      }),
    },
    database: {},
    migration: { enabled: false },
    storage: {
      uploadsBucket: storage.uploadsBucket
        ? Bucket.fromBucketName(stack, 'Existing', 'byo-uploads')
        : undefined,
      cdmImportObjectTtlDays: storage.cdmImportObjectTtlDays,
    },
  });
  return Template.fromStack(stack);
}

interface LifecycleRule {
  Id?: string;
  Prefix?: string;
  Status?: string;
  ExpirationInDays?: number;
}

/** Every lifecycle rule on every bucket in the template. */
function lifecycleRules(template: Template): LifecycleRule[] {
  return Object.values(template.findResources('AWS::S3::Bucket')).flatMap(
    (bucket) => (bucket.Properties?.LifecycleConfiguration?.Rules ?? []) as LifecycleRule[]
  );
}

describe('the uploads bucket expires abandoned CDM import uploads', () => {
  it('expires the imports/ prefix after seven days by default', () => {
    expect(DEFAULT_CDM_IMPORT_OBJECT_TTL_DAYS).toBe(7);

    expect(lifecycleRules(build())).toEqual([
      expect.objectContaining({
        Prefix: 'imports/',
        Status: 'Enabled',
        ExpirationInDays: 7,
      }),
    ]);
  });

  it('honours the adopter-set TTL', () => {
    expect(lifecycleRules(build({ cdmImportObjectTtlDays: 14 }))[0]?.ExpirationInDays).toBe(14);
  });

  it('refuses a TTL that is not a whole number of days', () => {
    expect(() => build({ cdmImportObjectTtlDays: 0 })).toThrow(/cdmImportObjectTtlDays/);
    expect(() => build({ cdmImportObjectTtlDays: 1.5 })).toThrow(/cdmImportObjectTtlDays/);
  });

  it('puts the rule on a prefix no picture key can start with', () => {
    // Pictures live under users/, organizations/, projects/ and project-apps/. A prefix that
    // any of those could begin with would expire user files.
    const rule = lifecycleRules(build())[0];

    expect(rule?.Prefix).toBe(CDM_IMPORT_KEY_PREFIX);
    for (const pictureKey of [
      'users/1/picture.png',
      'organizations/1/picture.png',
      'projects/1/picture.png',
      'project-apps/1/picture.png',
    ]) {
      expect(pictureKey.startsWith(rule?.Prefix as string)).toBe(false);
    }
  });

  it('adds no rule to a bucket it did not create, because CDK cannot', () => {
    // `IBucket` has no way to add a lifecycle rule, so an imported bucket needs one out of
    // band. Recorded as a test so it is a stated limit rather than a surprise.
    expect(lifecycleRules(build({ uploadsBucket: true }))).toEqual([]);
  });

  it('uses the prefix the API derives its keys under', () => {
    // The CDK package cannot import `apps/api`, so the prefix is a copy; this is the
    // oracle that a rename on either side fails here instead of leaving the rule matching
    // nothing.
    const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
    const source = readFileSync(`${repoRoot}apps/api/src/lib/cdm/cdm-import-upload.lib.ts`, 'utf8');

    expect(source).toContain(`export const CDM_IMPORT_KEY_PREFIX = '${CDM_IMPORT_KEY_PREFIX}';`);
  });
});
