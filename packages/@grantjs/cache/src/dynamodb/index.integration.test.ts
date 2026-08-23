import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import type { ILogger } from '@grantjs/core';
import { noopLogger } from '@grantjs/core';
import { afterAll, describe, expect, it } from 'vitest';

import { runCacheAdapterConformance } from '../conformance-suite';
import { DynamoDbCacheAdapter } from './index';

// Backed by the e2e stack's LocalStack. Started by scripts/e2e.sh, or directly:
//   docker compose -f docker-compose.e2e.yml --env-file .env.test -p grant-e2e \
//     up -d redis localstack
const ENDPOINT = process.env.E2E_LOCALSTACK_ENDPOINT ?? 'http://localhost:4567';
const REGION = process.env.E2E_AWS_REGION ?? 'us-east-1';

// LocalStack accepts any credentials, but the SDK refuses to sign without them.
const CREDENTIALS = { accessKeyId: 'test', secretAccessKey: 'test' };

/**
 * One LocalStack serves every run on the shared self-hosted runner, so the table
 * name has to be unique per run. A fixed name would let two runs delete each
 * other's rows and fail in ways that look like adapter bugs.
 */
const TABLE_NAME = `grant-cache-conformance-${process.pid}-${Date.now()}`;

const admin = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: CREDENTIALS,
});

/**
 * No skip path, by design. This file only runs in the integration lane, and
 * invoking that lane asserts the stack is up — a suite that quietly skipped
 * would be indistinguishable from one that passed.
 */
async function createTable(): Promise<void> {
  try {
    await admin.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'sk', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
      })
    );
    await waitUntilTableExists({ client: admin, maxWaitTime: 60 }, { TableName: TABLE_NAME });
  } catch (error) {
    throw new Error(
      `No DynamoDB at ${ENDPOINT} for the adapter integration lane. Start it with: ` +
        'docker compose -f docker-compose.e2e.yml --env-file .env.test -p grant-e2e ' +
        'up -d redis localstack',
      { cause: error }
    );
  }
}

await createTable();

afterAll(async () => {
  await admin.send(new DeleteTableCommand({ TableName: TABLE_NAME })).catch(() => {
    // Table teardown is best effort; LocalStack is ephemeral per stack lifecycle.
  });
  admin.destroy();
});

const makeAdapter = (namespace: string) =>
  new DynamoDbCacheAdapter(
    {
      tableName: TABLE_NAME,
      region: REGION,
      endpoint: ENDPOINT,
      namespace,
      ...CREDENTIALS,
    },
    noopLogger as ILogger
  );

runCacheAdapterConformance(
  'DynamoDbCacheAdapter',
  {
    create: () => makeAdapter('conformance'),
    teardown: async (adapter) => {
      await adapter.clear();
      await adapter.disconnect();
    },
  },
  // Values round-trip through JSON, exactly as they do for Redis.
  { serializes: true }
);

describe('DynamoDbCacheAdapter — table design', () => {
  it('isolates namespaces, so one entity cache cannot read or clear another', async () => {
    const roles = makeAdapter('roles');
    const permissions = makeAdapter('permissions');

    await roles.set('shared-key', 'from-roles');
    await permissions.set('shared-key', 'from-permissions');

    expect(await roles.get<string>('shared-key')).toBe('from-roles');
    expect(await permissions.get<string>('shared-key')).toBe('from-permissions');

    await roles.clear();

    expect(await roles.get('shared-key')).toBeNull();
    expect(await permissions.get<string>('shared-key')).toBe('from-permissions');

    await permissions.clear();
    await roles.disconnect();
    await permissions.disconnect();
  });

  it('rejects a pattern it cannot honour instead of returning wrong rows', async () => {
    const cache = makeAdapter('patterns');
    await cache.set('a:1:b', '1');

    // DynamoDB has no glob. Treating `a:*:b` as the prefix `a:` would return
    // plausible, wrong results — worse than failing.
    await expect(cache.keys('a:*:b')).rejects.toThrow(/trailing "\*"/);
    await expect(cache.keys('a:?')).rejects.toThrow(/trailing "\*"/);

    await cache.clear();
    await cache.disconnect();
  });

  it('paginates past the 1 MB Query limit', async () => {
    const cache = makeAdapter('pagination');

    // DynamoDB's 1 MB Query ceiling applies to the data read, before
    // ProjectionExpression is applied — so a handful of near-maximum items
    // crosses it just as well as hundreds of small ones, in five round trips
    // rather than eight hundred. Per-item limit is 400 KB.
    const payload = 'x'.repeat(380 * 1024);
    const count = 5;

    for (let i = 0; i < count; i += 1) {
      await cache.set(`bulk:${i}`, payload);
    }

    // A non-paginating keys() stops at the first page and under-reports here,
    // which would in turn make clear() silently leave rows behind.
    expect((await cache.keys()).length).toBe(count);

    await cache.clear();
    expect(await cache.keys()).toEqual([]);
    await cache.disconnect();
  }, 120_000);
});
