import type { CdmImportTombstoneInput, ICdmImportTombstoneRepository } from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import { cdmImportTombstones } from '@grantjs/database';
import { and, eq, inArray } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

const UNIQUE_INDEX = 'cdm_import_tombstones_project_kind_fingerprint_unique';

/** Postgres' unique violation on the tombstone index, raised directly or wrapped as a `cause`. */
function isTombstoneAlreadyRecorded(error: unknown): boolean {
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    const candidate = current as { code?: unknown; constraint_name?: unknown; cause?: unknown };
    if (candidate.code === '23505' && candidate.constraint_name === UNIQUE_INDEX) return true;
    current = candidate.cause;
  }
  return false;
}

/**
 * Deletion tombstones of CDM imports (`cdm_import_tombstones`). Every read names the
 * project, so the table's RLS policy is defence in depth, not the only guard. Only
 * fingerprints pass through here, never an import key, and no method returns a row's id,
 * timestamp or anything beyond what the caller asked for.
 */
export class CdmImportTombstoneRepository implements ICdmImportTombstoneRepository {
  constructor(private readonly db: DbSchema) {}

  /**
   * One plain `INSERT` per row inside its own savepoint, and a unique violation on the
   * tombstone index is the "already recorded" outcome. Not `ON CONFLICT DO NOTHING`: Postgres
   * checks the table's restrictive select policy against the new row for any `ON CONFLICT`
   * insert, so a self-deletion made while the request's RLS context names another project would
   * fail on the tombstone of a project it is not scoped to, and the person's deletion with it.
   * A plain insert is covered by the permissive `for all` policy alone. The savepoint keeps a
   * duplicate from aborting the deletion's transaction. No RETURNING, for the same reason.
   */
  async insertIgnoringDuplicates(
    rows: readonly CdmImportTombstoneInput[],
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction ?? this.db;
    for (const row of rows) {
      try {
        await dbInstance.transaction(async (savepoint) => {
          await savepoint.insert(cdmImportTombstones).values({
            projectId: row.projectId,
            kind: row.kind,
            externalKeyFingerprint: row.externalKeyFingerprint,
          });
        });
      } catch (error) {
        if (!isTombstoneAlreadyRecorded(error)) throw error;
      }
    }
  }

  async filterTombstoned(
    params: { projectId: string; kind: string; fingerprints: readonly string[] },
    transaction?: Transaction
  ): Promise<Set<string>> {
    const fingerprints = [...new Set(params.fingerprints.filter((f) => f !== ''))];
    if (fingerprints.length === 0) return new Set();
    const dbInstance = transaction ?? this.db;
    const found = await dbInstance
      .select({ fingerprint: cdmImportTombstones.externalKeyFingerprint })
      .from(cdmImportTombstones)
      .where(
        and(
          eq(cdmImportTombstones.projectId, params.projectId),
          eq(cdmImportTombstones.kind, params.kind),
          inArray(cdmImportTombstones.externalKeyFingerprint, fingerprints)
        )
      );
    return new Set(found.map((row) => row.fingerprint));
  }
}
