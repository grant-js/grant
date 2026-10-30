/**
 * Deletion tombstones of CDM imports (`cdm_import_tombstones`).
 *
 * A tombstone says "the person deleted the identity this import key created, so an import of
 * this project must not create it again". It holds the project, the marker kind and a
 * fingerprint of the key, never the key (for an e-mail keyed identity the key is an address),
 * a user id or any copy of the record. Not to be confused with the soft-delete a replace
 * import applies to CDM-managed rows.
 */

export interface CdmImportTombstoneInput {
  projectId: string;
  /** The import marker's `kind`; `'user'` today. */
  kind: string;
  /** HMAC-SHA256 hex of the kind and the key; never empty, never the key. */
  externalKeyFingerprint: string;
}

export interface ICdmImportTombstoneRepository {
  /**
   * Record tombstones. A row that already exists is left as it is, so the same deletion
   * recorded twice (or a person who deletes a second identity under the same key) is not an
   * error.
   */
  insertIgnoringDuplicates(
    rows: readonly CdmImportTombstoneInput[],
    transaction?: unknown
  ): Promise<void>;

  /**
   * The subset of `fingerprints` that is tombstoned for `projectId` and `kind`: one read,
   * however many fingerprints. Another project's tombstone never matches.
   */
  filterTombstoned(
    params: { projectId: string; kind: string; fingerprints: readonly string[] },
    transaction?: unknown
  ): Promise<Set<string>>;
}
