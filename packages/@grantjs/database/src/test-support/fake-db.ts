/**
 * A minimal in-memory stand-in for the Drizzle query builder, sufficient for the
 * subset the seed/bootstrap code uses:
 *
 *   await db.select().from(t).where(c).limit(n)
 *   await db.insert(t).values(v)
 *   await db.insert(t).values(v).returning()
 *   await db.update(t).set(s).where(c)
 *   await db.execute(sql)
 *   await db.transaction(cb)
 *
 * `where` conditions are **not** evaluated. Instead the fake runs in one of two
 * modes, which is what makes it useful for characterizing seed idempotency:
 *
 * - **cold** (default): every `select` resolves to `[]`, i.e. an empty database.
 * - **replay**: every `select` on a table resolves to the next row previously
 *   inserted into that table, in insertion order. Because the seed's lookup
 *   order matches its insertion order exactly (both are driven by the same
 *   deterministic constants), this reproduces a second run against a database
 *   already seeded by the first.
 *
 * The one place the fake diverges from PostgreSQL is a row inserted and then
 * re-selected within the same run; `seed-permissions.test.ts` asserts the seed
 * never does that.
 */
import crypto from 'node:crypto';

import { getTableName } from 'drizzle-orm';

type Row = Record<string, unknown>;
type AnyTable = Parameters<typeof getTableName>[0];

export interface RecordedInsert {
  table: string;
  values: Row;
  returning: boolean;
}

export interface RecordedUpdate {
  table: string;
  set: Row;
}

class Thenable<T> implements PromiseLike<T> {
  constructor(private readonly run: () => T) {}

  then<R1 = T, R2 = never>(
    onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }
}

export class FakeDb {
  readonly inserts: RecordedInsert[] = [];
  readonly updates: RecordedUpdate[] = [];
  readonly executed: unknown[] = [];
  transactionCount = 0;

  private readonly rowsByTable = new Map<string, Row[]>();
  private readonly replayCursor = new Map<string, number>();
  private replaying = false;

  /** Switch to replay mode: subsequent selects return previously inserted rows. */
  beginReplay(): void {
    this.replaying = true;
    this.replayCursor.clear();
  }

  rows(table: AnyTable): Row[] {
    return this.rowsByTable.get(getTableName(table)) ?? [];
  }

  insertsFor(table: AnyTable): RecordedInsert[] {
    const name = getTableName(table);
    return this.inserts.filter((i) => i.table === name);
  }

  updatesFor(table: AnyTable): RecordedUpdate[] {
    const name = getTableName(table);
    return this.updates.filter((u) => u.table === name);
  }

  resetRecordings(): void {
    this.inserts.length = 0;
    this.updates.length = 0;
    this.executed.length = 0;
  }

  private nextSelect(table: AnyTable): Row[] {
    if (!this.replaying) return [];
    const name = getTableName(table);
    const cursor = this.replayCursor.get(name) ?? 0;
    const stored = this.rowsByTable.get(name) ?? [];
    this.replayCursor.set(name, cursor + 1);
    const row = stored[cursor];
    return row ? [row] : [];
  }

  select(): { from: (table: AnyTable) => SelectChain } {
    return { from: (table: AnyTable) => new SelectChain(() => this.nextSelect(table)) };
  }

  insert(table: AnyTable): { values: (values: Row) => InsertChain } {
    const name = getTableName(table);
    return {
      values: (values: Row) => {
        const apply = (returning: boolean): Row => {
          const row: Row = { id: crypto.randomUUID(), ...values };
          const bucket = this.rowsByTable.get(name);
          if (bucket) bucket.push(row);
          else this.rowsByTable.set(name, [row]);
          this.inserts.push({ table: name, values, returning });
          return row;
        };
        return new InsertChain(apply);
      },
    };
  }

  update(table: AnyTable): { set: (values: Row) => UpdateChain } {
    const name = getTableName(table);
    return {
      set: (values: Row) =>
        new UpdateChain(() => {
          this.updates.push({ table: name, set: values });
        }),
    };
  }

  async execute(query: unknown): Promise<unknown[]> {
    this.executed.push(query);
    return [];
  }

  async transaction<T>(cb: (tx: FakeDb) => Promise<T>): Promise<T> {
    this.transactionCount++;
    return cb(this);
  }
}

class SelectChain extends Thenable<Row[]> {
  constructor(run: () => Row[]) {
    super(run);
  }
  where(): this {
    return this;
  }
  limit(): this {
    return this;
  }
}

class InsertChain implements PromiseLike<unknown> {
  private done = false;

  constructor(private readonly apply: (returning: boolean) => Row) {}

  returning(): PromiseLike<Row[]> {
    return new Thenable(() => {
      this.done = true;
      return [this.apply(true)];
    });
  }

  then<R1 = unknown, R2 = never>(
    onfulfilled?: ((value: unknown) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return Promise.resolve()
      .then(() => {
        if (!this.done) {
          this.done = true;
          this.apply(false);
        }
        return undefined as unknown;
      })
      .then(onfulfilled, onrejected);
  }
}

class UpdateChain extends Thenable<void> {
  constructor(run: () => void) {
    super(run);
  }
  where(): this {
    return this;
  }
}
