import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { noopLogger } from '@grantjs/core';
import { afterAll, describe, expect, it } from 'vitest';

import { runFileStorageConformance } from '../conformance-suite';
import { S3StorageAdapter } from './index';

// Backed by the e2e stack's LocalStack. Started by scripts/e2e.sh, or directly:
//   docker compose -f docker-compose.e2e.yml --env-file .env.test -p grant-e2e \
//     up -d localstack
const ENDPOINT = process.env.E2E_LOCALSTACK_ENDPOINT ?? 'http://localhost:4567';
const REGION = process.env.E2E_AWS_REGION ?? 'us-east-1';

// LocalStack accepts any credentials, but the SDK refuses to sign without them.
const CREDENTIALS = { accessKeyId: 'test', secretAccessKey: 'test' };

/**
 * One LocalStack serves every run on the shared self-hosted runner, so the bucket
 * name has to be unique per run — the lesson the DynamoDB cache suite records
 * about table names.
 */
const BUCKET = `grant-storage-conformance-${process.pid}-${Date.now()}`;

const admin = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: CREDENTIALS,
  forcePathStyle: true,
});

/**
 * No skip path, by design. This file only runs in the integration lane, and
 * invoking that lane asserts the stack is up — a suite that quietly skipped would
 * be indistinguishable from one that passed.
 */
async function createBucket(): Promise<void> {
  try {
    await admin.send(new CreateBucketCommand({ Bucket: BUCKET }));
  } catch (error) {
    throw new Error(
      `No S3 at ${ENDPOINT} for the adapter integration lane. Start it with: ` +
        'docker compose -f docker-compose.e2e.yml --env-file .env.test -p grant-e2e ' +
        'up -d localstack',
      { cause: error }
    );
  }
}

async function emptyAndRemoveBucket(): Promise<void> {
  let token: string | undefined;
  do {
    const page = await admin.send(
      new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token })
    );
    const keys = (page.Contents ?? []).map((object) => ({ Key: object.Key as string }));
    if (keys.length > 0) {
      await admin.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys } }));
    }
    token = page.NextContinuationToken;
  } while (token);

  await admin.send(new DeleteBucketCommand({ Bucket: BUCKET }));
}

await createBucket();

afterAll(async () => {
  await emptyAndRemoveBucket();
  admin.destroy();
});

runFileStorageConformance('s3 (LocalStack)', {
  create: () =>
    new S3StorageAdapter(
      {
        bucket: BUCKET,
        region: REGION,
        endpoint: ENDPOINT,
        accessKeyId: CREDENTIALS.accessKeyId,
        secretAccessKey: CREDENTIALS.secretAccessKey,
        forcePathStyle: true,
      },
      noopLogger
    ),
  readBack: async (path) => {
    const object = await admin.send(new GetObjectCommand({ Bucket: BUCKET, Key: path }));
    return Buffer.from(await object.Body!.transformToByteArray());
  },
});

/**
 * The S3 side of the divergence index in ../conformance-suite.ts.
 */
describe('s3 adapter divergences', () => {
  const configured = {
    bucket: BUCKET,
    region: REGION,
    endpoint: ENDPOINT,
    accessKeyId: CREDENTIALS.accessKeyId,
    secretAccessKey: CREDENTIALS.secretAccessKey,
    forcePathStyle: true,
  };

  it('divergence 1 — signs a presigned GET when no publicUrl is configured', async () => {
    const adapter = new S3StorageAdapter(configured, noopLogger);

    const url = await adapter.getUrl('users/1/avatar.png');

    expect(url).toContain('X-Amz-Signature=');
    expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('3600');
  });

  it('divergence 1 — returns the plain publicUrl when one is configured', async () => {
    const adapter = new S3StorageAdapter(
      { ...configured, publicUrl: 'https://cdn.example.test' },
      noopLogger
    );

    const url = await adapter.getUrl('users/1/avatar.png');

    expect(url).toBe('https://cdn.example.test/users/1/avatar.png');
    expect(url).not.toContain('X-Amz-Signature');
  });

  it('divergence 2 — returns a URL for a key that was never uploaded', async () => {
    const adapter = new S3StorageAdapter(configured, noopLogger);

    await expect(adapter.getUrl('nothing-here.png')).resolves.toContain('nothing-here.png');
  });

  it('divergence 5 — persists the content type on the object', async () => {
    const adapter = new S3StorageAdapter(configured, noopLogger);
    const key = `divergence-5-${Date.now()}.png`;
    await adapter.upload(Buffer.from('a'), key, { contentType: 'image/png' });

    const object = await admin.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

    expect(object.ContentType).toBe('image/png');
  });
});
