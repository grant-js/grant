import { createHash } from 'node:crypto';

/**
 * CDM identity helpers.
 *
 * The CDM contract treats `externalKey` as opaque to Grant: it's an importer
 * supplied stable string, and Grant's exporter emits a derived, non-UUID-looking
 * key. The original Grant ids ride along under `metadata.cdmSource` for
 * traceability — but they never appear as identity in cross-references.
 *
 * We use a short, hex-encoded SHA-256 prefix joined with the entity kind so:
 *   - keys are deterministic across re-exports of the same row,
 *   - keys are globally unique within a CDM document (including the kind
 *     prefix prevents accidental cross-kind collisions),
 *   - keys are obviously not UUIDs (so accidental round-trip leaks of Grant
 *     ids are easy to spot in tests and audits).
 */

/**
 * Derive a stable, opaque hash from the given inputs. Inputs are joined with
 * a separator and SHA-256 hashed; we keep only the first 16 hex chars (64 bits
 * of entropy — collision-resistant enough for a single CDM document).
 */
export function stableHash(...inputs: ReadonlyArray<string>): string {
  const joined = inputs.map((s) => String(s ?? '')).join('\u001f');
  return (
    // codeql[js/insufficient-password-hash]: Not password hashing — SHA-256 derives opaque CDM external keys from non-secret identity material.
    createHash('sha256').update(joined).digest('hex').slice(0, 16)
  );
}

/**
 * Kinds that participate in CDM as identifiable cross-references. Mirrors
 * `CdmImportMetadata['kind']` for the cases where the exporter mints a key.
 */
export type CdmExternalKeyKind =
  'resource' | 'permission' | 'tag' | 'role' | 'group' | 'apikey' | 'user';

/**
 * Build an opaque external key for a CDM-exported entity. The result has the
 * shape `cdm-{kind}-{stableHash(...inputs)}` (e.g. `cdm-tag-3f2a9b1c0d1e2f30`).
 *
 * Pass enough discriminating inputs (id + a few stable attributes) so the key
 * is stable across re-exports of the same row but distinct across rows. The
 * Grant id should always be one of the inputs so re-imports — which produce a
 * fresh row id — naturally generate a different key.
 */
export function buildExternalKey(
  kind: CdmExternalKeyKind,
  ...inputs: ReadonlyArray<string>
): string {
  return `cdm-${kind}-${stableHash(kind, ...inputs)}`;
}
