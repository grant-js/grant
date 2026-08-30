/**
 * The cache table.
 *
 * DynamoDB rather than ElastiCache, and that is a cost decision the whole target
 * rests on: a Redis cluster is billed per hour whether or not anything reads it,
 * which contradicts the premise that an idle deployment costs nothing. On-demand
 * DynamoDB is billed per request, so an idle cache is free.
 *
 * The schema is not a choice made here — it is a contract with `DynamoDBCacheAdapter`
 * (`packages/@grantjs/cache/src/dynamodb/index.ts`), which writes items keyed by a
 * `pk` holding the namespace and an `sk` holding the cache key, and stamps
 * `expiresAt` as a Unix-second TTL. Getting any of the three wrong produces a table
 * that deploys clean and fails at the first `set()`, so each is asserted in tests
 * against the adapter's own constants rather than restated as a literal.
 */

import { RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, Billing, type ITable, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * Attribute names the cache adapter uses. Named constants rather than inline strings
 * so the tests can assert the template against the same symbols the construct used —
 * a test comparing two copies of a literal proves only that both were typed the same.
 */
export const CACHE_PARTITION_KEY = 'pk';
export const CACHE_SORT_KEY = 'sk';
export const CACHE_TTL_ATTRIBUTE = 'expiresAt';

export interface CacheTableProps {
  /**
   * Existing table to use. Omit to create one.
   *
   * It must carry the `pk`/`sk` string key schema above; nothing here can verify
   * that about an imported table, so the shape is documented rather than checked.
   */
  readonly table?: ITable;

  /**
   * Whether teardown may destroy the table.
   *
   * Defaults to **true**, and the asymmetry with the database is deliberate. This
   * holds cache entries, sessions and rate-limit counters — all reconstructible, all
   * TTL'd. Retaining it on teardown leaves a billed table nobody will look at again,
   * which is the failure mode the data tier's `RETAIN` exists to *prevent* for real
   * data and would merely reproduce here.
   */
  readonly destroyOnRemoval?: boolean;
}

export class CacheTable extends Construct {
  public readonly table: ITable;

  /** True when this construct created the table, so teardown removes it. */
  public readonly ownsTable: boolean;

  constructor(scope: Construct, id: string, props: CacheTableProps = {}) {
    super(scope, id);

    this.ownsTable = props.table === undefined;

    this.table =
      props.table ??
      new TableV2(this, 'Table', {
        partitionKey: { name: CACHE_PARTITION_KEY, type: AttributeType.STRING },
        sortKey: { name: CACHE_SORT_KEY, type: AttributeType.STRING },
        // DynamoDB deletes expired items itself, at no charge. Without this the
        // adapter's `expiresAt` is an ordinary attribute and nothing ever reaps a
        // cache entry — the table grows without bound and every `list()` slows down.
        timeToLiveAttribute: CACHE_TTL_ATTRIBUTE,
        // Per-request, not provisioned. Provisioned capacity is billed hourly and
        // would reintroduce exactly the idle cost that ruled out ElastiCache.
        billing: Billing.onDemand(),
        // Point-in-time recovery is a paid feature for restoring data you cannot
        // rebuild. Every item here is rebuildable by definition and most expire
        // within minutes, so this is off on purpose rather than by omission.
        pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false },
        removalPolicy:
          (props.destroyOnRemoval ?? true) ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      });
  }
}
