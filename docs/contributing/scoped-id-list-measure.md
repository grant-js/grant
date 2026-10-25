---
title: Scoped ID list measure
description: Recipe for measuring one scoped list page against 1k and 10k accessible IDs
---

# Scoped ID list measure

H3 before-picture for the IAM scoped-id lists story (`plans/2026-10-25-iam-scoped-id-lists-brief.md`). Principal Engineer home for this recipe: **contributing**, not [benchmarks/report.md](/benchmarks/report). That report is `POST /api/auth/is-authorized` only (H4). This page does not invent a p95 or a pass/fail target.

Measure one scoped **users** list page (default `PAGINATION_DEFAULT_PAGE_SIZE` 50) against a **1k-id** set and a **10k-id** set on current `main`. Record query shape, `IN` list length, `count(*)`, page row count, and wall time as observed.

Docs + existing unit/integration only. No new k6/Artillery harness. Do not skip `grant.authenticate` on requests that proceed. Do not disable rate limiting. Do not raise `DB_POOL_MAX`. Do not turn off RLS. Do not change list or SQL behavior in order to measure.

## What the list does today

`CacheHandler.resolveScopedIds` is the scope controller. On a cache miss it loads every org/project pivot id into a `Set`, writes `${scope.tenant}:${scope.id}`, and returns the full `string[]`. `UserHandler.getUsers` then applies `tagIds`, explicit `ids`, and (project tenants) `filterUserIdsBySearchDocument` on that array in process. The remainder goes to `UserService.getUsers` → `UserRepository.getUsers` → `EntityRepository.query`:

1. `count(*)` with `id IN (…entire remaining set…)` and `deleted_at IS NULL`
2. `findMany` with the same `WHERE`, `ORDER BY created_at` (users `defaultSortField` when `sort` is omitted), `LIMIT 50`, `OFFSET 0`

Sort and page already run in SQL on the entity query. They do **not** run on the ID set first. M9 already narrowed project-user **row** hydration to the page (`users.handler.project-pivot-page.test.ts` stubs 500 scoped ids and asserts `getProjectUsers` sees only the page). The leftover is this ID set: a 50-row page can still resolve 1k+ IDs and pass all of them into `IN (...)`.

`PivotRepository.query` had no SQL `LIMIT` on the SHA this recipe measured. Slice 2 (`feat/iam-scoped-id-lists-page`) pages list queries with a pivot subquery so a 50-row page does not bind the full accessible `IN` list; `PivotRepository.query` applies `ORDER BY created_at` + `LIMIT` when the caller asks for a page. Keep this recipe as the before-picture.

Public args are `scope`, `page`, `limit`, `search`, `sort`, `ids`, and `tagIds`. There is no GraphQL `filters` argument. Do not add one to measure.

## What to record

| Field              | Meaning                                                                               |
| ------------------ | ------------------------------------------------------------------------------------- |
| **SHA**            | `main` (or story trunk equal to `main`) at measure time                               |
| **List**           | Users, page 1, default limit 50, no `search` / `sort` / `tagIds` / explicit `ids`     |
| **ID-set size**    | 1 000 and 10 000 (stub or seed)                                                       |
| **IN list length** | `ids.length` passed into `EntityRepository.query`                                     |
| **count(\*)**      | `totalCount` from that query                                                          |
| **Page row count** | `users.length` (expect 50 when at least 50 of the IDs exist and are not soft-deleted) |
| **Wall time**      | `count(*)` + `findMany` together, then each statement if the driver log splits them   |
| **Query shape**    | SQL text as logged (or `EXPLAIN (ANALYZE, BUFFERS)` of the same two statements)       |

Do not invent percentiles. One or a few runs is enough. Write what you saw.

## How to stub the ID set

Do not turn off RLS or skip authenticate to make a 10k-member tenant. Stub the scoped-id array the same way the existing unit test already does.

`apps/api/tests/unit/handlers/users.handler.project-pivot-page.test.ts` replaces `getScopedUserIds` with a fixed array (500 ids today) and mocks `users.getUsers`. That is the in-process handler shape. It does **not** exercise SQL.

For the SQL before-picture, keep authenticate / rate limit / RLS / pool defaults on the running API, and call the **repository** the postgres integration tests already use (`GRANT_TEST_DATABASE_URL` + `UserRepository.getUsers`, same pattern as `tests/integration/credentials.postgres.integration.test.ts`). Pass the stubbed ids as `ids`. That is the `IN` list `EntityRepository.query` would receive after a cache hit (or after `resolveScopedIds` returned the same array).

```ts
import { schema, users } from '@grantjs/database';
import { ilike } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { UserRepository } from '@/repositories/users.repository';

const url = process.env.GRANT_TEST_DATABASE_URL;
if (!url) {
  throw new Error('GRANT_TEST_DATABASE_URL is required');
}

const client = postgres(url, {
  max: 10,
  onnotice: () => {},
  debug: (_connection, query, parameters) => {
    console.log(JSON.stringify({ query, parameterCount: parameters.length }));
  },
});
const db = drizzle(client, { schema });
const repo = new UserRepository(db);

async function seedUsers(count: number, tag: string): Promise<string[]> {
  const ids: string[] = [];
  const batchSize = 500;
  for (let offset = 0; offset < count; offset += batchSize) {
    const size = Math.min(batchSize, count - offset);
    const rows = await db
      .insert(users)
      .values(
        Array.from({ length: size }, (_, index) => ({
          name: `h3-list-${tag}-${offset + index}`,
        }))
      )
      .returning({ id: users.id });
    ids.push(...rows.map((row) => row.id));
  }
  return ids;
}

async function measure(label: string, ids: string[]) {
  const started = performance.now();
  const page = await repo.getUsers({
    ids,
    page: 1,
    // omit limit → PAGINATION_DEFAULT_PAGE_SIZE (50)
  });
  const wallMs = performance.now() - started;
  console.log(
    JSON.stringify({
      label,
      inListLength: ids.length,
      totalCount: page.totalCount,
      pageRowCount: page.users.length,
      hasNextPage: page.hasNextPage,
      wallMs: Math.round(wallMs),
    })
  );
}

const tag = `h3-${Date.now().toString(36)}`;
const ids1k = await seedUsers(1_000, `${tag}-1k`);
const ids10k = await seedUsers(10_000, `${tag}-10k`);

await measure('users page 1 / 1k ids (warm-up)', ids1k);
await measure('users page 1 / 1k ids', ids1k);
await measure('users page 1 / 10k ids (warm-up)', ids10k);
await measure('users page 1 / 10k ids', ids10k);

await db.delete(users).where(ilike(users.name, `h3-list-${tag}-%`));
await client.end();
```

Run it through the existing API Vitest toolchain so `@/` resolves (do not add a new harness):

```bash
# Disposable DB with migrations applied. RLS stays default true on the API.
# This script talks to Postgres as the login role, same as other GRANT_TEST_DATABASE_URL tests.
GRANT_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/grant \
  GRANT_ENV_SKIP_FILES=true \
  pnpm --filter grant-api exec vitest run --no-file-parallelism path/to/local-only-file.ts
```

Keep the runner gitignored or delete it after the run. Do not commit a k6 or Artillery project.

Optional: wrap each statement in `EXPLAIN (ANALYZE, BUFFERS)` in `psql` using the logged SQL. Record the plan nodes; do not turn them into a target.

## How this is not a bypass

| Knob                         | Leave it                       |
| ---------------------------- | ------------------------------ |
| `grant.authenticate`         | On for any HTTP you also issue |
| `SECURITY_ENABLE_RATE_LIMIT` | Production default (on)        |
| `DB_POOL_MAX`                | 20                             |
| `SECURITY_ENABLE_RLS`        | Default true                   |

The repository snippet above is the same isolation the existing postgres integration tests already use: it does not change list SQL, does not raise the pool, and does not set `SECURITY_ENABLE_RLS=false`. It is not an HTTP load test, so rate limit and authenticate are not on this path — do not disable them on a running API “to make the list faster.”

## Observed run (2026-10-25)

| Field                                      | Value                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| **Date**                                   | 2026-10-25                                                               |
| **SHA**                                    | `f344d18c` (`main` / #600; this docs slice does not change the API)      |
| **List**                                   | `UserRepository.getUsers`, page 1, default limit 50, no search/sort/tags |
| **Datastore**                              | PostgreSQL 16 on the host, `GRANT_TEST_DATABASE_URL`, migrations applied |
| **RLS / pool / rate limit / authenticate** | Unchanged (not part of this repository-layer snippet)                    |
| **Host**                                   | Linux 6.12, 4 CPUs, 16 GiB RAM                                           |

Warm-up rows discarded. Wall time is `count(*)` + `findMany` together after one warm-up per set.

| ID-set size | IN list length | count(\*) | Page rows | hasNextPage | Wall (ms) |
| ----------- | -------------- | --------- | --------- | ----------- | --------- |
| 1 000       | 1 000          | 1 000     | 50        | true        | 16        |
| 10 000      | 10 000         | 10 000    | 50        | true        | 87        |

Wall time is one warmed `UserRepository.getUsers` call (`count(*)` + `findMany`) on this host. Not a p95. Not a pass/fail.

### Query shape (logged)

```sql
select count(*) from "users"
where ("users"."id" in ($1, $2, …, $N) and "users"."deleted_at" is null);

select "id", "name", "picture_url", "picture_path", "metadata",
       "deleted_at", "created_at", "updated_at"
from "users" "users"
where ("users"."id" in ($1, $2, …, $N) and "users"."deleted_at" is null)
order by "users"."created_at"
limit $N+1;
```

`N` is 1000 or 10000. The count statement binds `N` id parameters. The page statement binds `N` ids plus the limit (`$1001` / `$10001` = 50). Offset 0 is omitted. Both statements carry the full accessible ID list even though the page is 50 rows.

No p95. No pass/fail. Slice 2 should compare against this shape: a 50-row page must not need an `IN` list of 1k/10k just to return 50 rows.

## Related

- Story brief: `plans/2026-10-25-iam-scoped-id-lists-brief.md`
- Stack plan: `plans/2026-10-25-iam-scoped-id-lists-stack.md`
- [Testing](/contributing/testing) — `GRANT_TEST_DATABASE_URL` postgres integration pattern
- [Permission evaluation benchmarks](/benchmarks/report) — H4 `is-authorized`, not this list
