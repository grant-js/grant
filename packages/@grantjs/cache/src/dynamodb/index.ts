import {
  type AttributeValue,
  BatchWriteItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import type { CacheKey, ICacheAdapter, ILogger } from '@grantjs/core';
import { ValidationError } from '@grantjs/core';

export interface DynamoDbCacheConfig {
  /** Table with partition key `pk` (String) and sort key `sk` (String). */
  tableName: string;
  region: string;
  /**
   * Partition key value for every entry this adapter owns — the entity
   * namespace, mirroring the key prefix `RedisCacheAdapter` uses.
   */
  namespace: string;
  /** Override for LocalStack or a VPC endpoint. */
  endpoint?: string;
  /**
   * Omit both to use the SDK's default credential chain. That is the expected
   * production path: a Lambda or task role supplies credentials, and no secret
   * reaches this adapter.
   */
  accessKeyId?: string;
  secretAccessKey?: string;
  /** Applied when `set()` is called without a TTL. Matches Redis's 24h default. */
  defaultTtlSeconds?: number;
}

/** Matches `RedisCacheAdapter`'s `setex` default so the two agree. */
const DEFAULT_TTL_SECONDS = 86_400;
/** DynamoDB caps BatchWriteItem at 25 requests. */
const BATCH_WRITE_LIMIT = 25;
/** Retries for throttled writes returned via UnprocessedItems. */
const BATCH_WRITE_MAX_ATTEMPTS = 5;

/**
 * DynamoDB cache adapter.
 *
 * Behaviour is defined by the shared conformance suite (`../conformance-suite`),
 * which this adapter passes in full — tier 1 and, because it round-trips values
 * through JSON, tier 2.
 *
 * **Table design.** One partition per namespace, cache key as the sort key. That
 * is what makes `keys('prefix*')` a Query with `begins_with` and `clear()` a
 * Query plus batched deletes; keying by cache key alone would force a Scan for
 * both. The cost is a hot partition per namespace under heavy write load, which
 * is the accepted trade — the alternative is a full table Scan on every
 * permission invalidation.
 */
export class DynamoDbCacheAdapter implements ICacheAdapter {
  private readonly client: DynamoDBClient;
  private readonly tableName: string;
  private readonly namespace: string;
  private readonly defaultTtlSeconds: number;

  constructor(
    config: DynamoDbCacheConfig,
    private readonly logger: ILogger
  ) {
    this.tableName = config.tableName;
    this.namespace = config.namespace;
    this.defaultTtlSeconds = config.defaultTtlSeconds ?? DEFAULT_TTL_SECONDS;

    this.client = new DynamoDBClient({
      region: config.region,
      ...(config.endpoint && { endpoint: config.endpoint }),
      ...(config.accessKeyId &&
        config.secretAccessKey && {
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        }),
    });
  }

  private nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Serialise exactly as `RedisCacheAdapter` does: a `Set` becomes its member
   * array, everything else is plain JSON.
   */
  private serialize<T>(value: T): string {
    return JSON.stringify(value instanceof Set ? Array.from(value) : value);
  }

  /**
   * Deserialise exactly as `RedisCacheAdapter` does, including the array-of-
   * strings to `Set` coercion. That coercion is not a quirk to be tidied away:
   * `ICacheAdapter`'s default type parameter is `Set<string>`, and this is how a
   * serialising adapter preserves the round trip that `InMemoryCacheAdapter`
   * gets for free by holding a reference.
   */
  private deserialize<T>(raw: string, key: CacheKey): T | null {
    try {
      const parsed: unknown = JSON.parse(raw);

      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return new Set(parsed) as T;
      }

      return parsed as T;
    } catch (error) {
      this.logger.error({ msg: 'Failed to parse cache value', err: error, key });
      return null;
    }
  }

  private itemKey(key: CacheKey): Record<string, AttributeValue> {
    return { pk: { S: this.namespace }, sk: { S: key } };
  }

  async get<T = Set<string>>(key: CacheKey): Promise<T | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: this.itemKey(key),
        // Reads must be strongly consistent. DynamoDB's default eventually
        // consistent read can serve a value already deleted, and this cache
        // backs permission invalidation — a stale read there is a user retaining
        // access they no longer have. Doubles read cost; correctness wins.
        ConsistentRead: true,
      })
    );

    const item = result.Item;
    if (!item?.value?.S) {
      return null;
    }

    // DynamoDB's TTL sweep is asynchronous and may lag by up to 48 hours, so an
    // expired item can still be returned by a read. Filtering here is what makes
    // expiry observably immediate, as it is for Redis and memory.
    const expiresAt = item.expiresAt?.N ? Number(item.expiresAt.N) : undefined;
    if (expiresAt !== undefined && expiresAt <= this.nowSeconds()) {
      return null;
    }

    return this.deserialize<T>(item.value.S, key);
  }

  async set<T = Set<string>>(key: CacheKey, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          ...this.itemKey(key),
          value: { S: this.serialize(value) },
          expiresAt: { N: String(this.nowSeconds() + ttl) },
        },
      })
    );
  }

  async has(key: CacheKey): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async delete(key: CacheKey): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({ TableName: this.tableName, Key: this.itemKey(key) })
    );
  }

  async clear(): Promise<void> {
    const keys = await this.keys();

    for (let i = 0; i < keys.length; i += BATCH_WRITE_LIMIT) {
      const batch = keys.slice(i, i + BATCH_WRITE_LIMIT);
      await this.batchDelete(batch.map((key) => ({ DeleteRequest: { Key: this.itemKey(key) } })));
    }
  }

  /**
   * BatchWriteItem reports throttled writes in `UnprocessedItems` instead of
   * throwing, so a naive single call silently leaves rows behind — a `clear()`
   * that looks successful while the cache is still populated. Retries with
   * backoff until the batch drains.
   */
  private async batchDelete(
    requests: { DeleteRequest: { Key: Record<string, AttributeValue> } }[]
  ): Promise<void> {
    let pending = requests;

    for (let attempt = 0; pending.length > 0 && attempt < BATCH_WRITE_MAX_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 50));
      }

      const result = await this.client.send(
        new BatchWriteItemCommand({ RequestItems: { [this.tableName]: pending } })
      );

      pending = (result.UnprocessedItems?.[this.tableName] ?? []) as typeof pending;
    }

    if (pending.length > 0) {
      this.logger.error({
        msg: 'clear() left items undeleted after exhausting retries',
        table: this.tableName,
        namespace: this.namespace,
        remaining: pending.length,
      });
    }
  }

  /**
   * Only a trailing `*` is supported, which covers every caller in the platform.
   * Anything else throws rather than silently returning the wrong rows —
   * DynamoDB has no glob, and quietly treating `a*b` as a prefix would produce
   * plausible, wrong results.
   */
  async keys(pattern?: string): Promise<CacheKey[]> {
    let prefix: string | undefined;

    if (pattern !== undefined) {
      const star = pattern.indexOf('*');
      const unsupported = (star !== -1 && star !== pattern.length - 1) || /[?[\]]/.test(pattern);

      if (unsupported) {
        throw new ValidationError(
          `DynamoDbCacheAdapter supports only a trailing "*" in key patterns; got "${pattern}".`
        );
      }

      prefix = star === -1 ? pattern : pattern.slice(0, -1);
    }

    const found: CacheKey[] = [];
    let startKey: Record<string, AttributeValue> | undefined;

    do {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: prefix ? '#pk = :pk AND begins_with(#sk, :prefix)' : '#pk = :pk',
          ExpressionAttributeNames: {
            '#pk': 'pk',
            ...(prefix ? { '#sk': 'sk' } : {}),
          },
          ExpressionAttributeValues: {
            ':pk': { S: this.namespace },
            ...(prefix ? { ':prefix': { S: prefix } } : {}),
          },
          ProjectionExpression: 'sk',
          // Same reasoning as get(): invalidation sweeps by prefix must not miss
          // a key that was just written.
          ConsistentRead: true,
          ...(startKey && { ExclusiveStartKey: startKey }),
        })
      );

      for (const item of result.Items ?? []) {
        if (item.sk?.S) {
          found.push(item.sk.S as CacheKey);
        }
      }

      // A Query returns at most 1 MB per call; without this the adapter would
      // silently under-report keys on a large namespace, and clear() would
      // silently leave rows behind.
      startKey = result.LastEvaluatedKey;
    } while (startKey);

    return found;
  }

  async disconnect(): Promise<void> {
    this.client.destroy();
  }
}
