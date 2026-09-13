/** Subset of selected fields requested by GraphQL field selection */
export type SelectedFields<T> = { requestedFields?: Array<keyof T> };

/** Optional params for delete operations (e.g. hard vs soft delete) */
export interface DeleteParams {
  hardDelete?: boolean | null;
}

/**
 * A one-statement existence probe, for the `*Exists` validators services run before a
 * write.
 *
 * Those validators were built on the paginated list method — `getUsers({ ids: [id],
 * limit: 1 })` — which answers a boolean question in **two** statements: an
 * unconditional `count(*)` for pagination metadata nobody reads, plus a row fetch whose
 * columns nobody looks at. At CDM import scale that was the dominant cost: a 620-entity
 * import spent 53% of its 34,556 statements on existence checks, and verified the single
 * project it was importing into 2,185 times.
 *
 * Extended by the nine entity repository ports the `*Exists` validators actually use.
 * Applied uniformly rather than only to the tables the import profile named: the rewrite
 * is one mechanical substitution at 61 call sites, and leaving two thirds of the
 * validators on the two-statement form would mean the next reader has to know which kind
 * they are looking at. Pivot and join-table ports are untouched — they have no `*Exists`
 * validator to convert.
 *
 * See `plans/2026-09-09-aws-followups-closeout-measurements.md` § ADR 0002.
 */
export interface IEntityExistence {
  /** True when a row with this id exists and is not soft-deleted. */
  existsById(id: string, transaction?: unknown): Promise<boolean>;
}
