/**
 * The two next-page strategies this API uses, and the rule for picking one.
 *
 * Both are offset pagination — `grep -rn "cursor" src` returns zero, so nothing
 * here is keyset/Relay despite the Relay-flavoured `hasNextPage` name. The name
 * is kept because it is already on the public GraphQL and REST contracts.
 *
 * **Count-based** ({@link hasNextPageByCount}) compares the page window against
 * a `count(*)` taken in a separate query. Cheap, and correct for the common
 * case, but the count and the page are two snapshots: a concurrent insert or
 * delete between them can report a next page that is not there, or hide one
 * that is.
 *
 * **Over-fetch** ({@link takePage}) asks for `limit + 1` rows and treats the
 * surplus row as the signal. One extra row buys a next-page answer drawn from
 * the same snapshot as the page itself, so it cannot disagree with what the
 * caller just received.
 *
 * Prefer over-fetch when the list mutates under the reader — delivery attempts
 * and notifications both do, which is why those two use it. Count-based is fine
 * for the CRUD entity lists, where `totalCount` is on the contract anyway and
 * has to be queried regardless.
 */

/**
 * Next-page signal for offset pagination backed by a separate `count(*)`.
 *
 * `limit` is nullish or non-positive when the caller asked for no limit, in
 * which case every row is already on this page and there is no next one.
 */
export function hasNextPageByCount(params: {
  page: number;
  limit: number | null | undefined;
  totalCount: number;
}): boolean {
  const { page, limit, totalCount } = params;
  if (!limit || limit <= 0) {
    return false;
  }
  return page * limit < totalCount;
}

/**
 * Next-page signal for a query that over-fetched one row.
 *
 * Call the query with `limit + 1`, hand the rows here, and use the trimmed
 * array — the surplus row is a probe, never part of the page.
 */
export function takePage<T>(
  rows: readonly T[],
  limit: number
): { rows: T[]; hasNextPage: boolean } {
  const hasNextPage = rows.length > limit;
  return {
    rows: hasNextPage ? rows.slice(0, limit) : [...rows],
    hasNextPage,
  };
}
